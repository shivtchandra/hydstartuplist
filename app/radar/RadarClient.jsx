"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClientAuth, signInWithGoogle, useAuthUser } from "../../lib/auth-client.js";
import GoogleOneTap from "../components/GoogleOneTap.jsx";

async function fetchRadar(user) {
  const headers = {};
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch("/api/radar?geo=hyd", { headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Radar ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function FounderRow({ f, unlocked }) {
  const label = [f.role, f.name].filter(Boolean).join(" · ");
  if (unlocked && f.linkedin) {
    return (
      <li>
        <a href={f.linkedin} target="_blank" rel="noopener noreferrer">
          {label || f.name}
        </a>
      </li>
    );
  }
  return <li>{label || f.name}</li>;
}

function RadarCard({ row }) {
  const founders = row.depth?.founders || row.founders || [];
  const stealth = row.depth?.stealthSignals || [];
  const sources = row.depth?.sources || [];
  return (
    <article className="radar-card" data-tier={row.exclusiveTier || ""}>
      <header className="radar-card-head">
        <div>
          <p className="radar-tier">{row.exclusiveTier === "core" ? "Core" : "Watch"}</p>
          <h2>{row.name}</h2>
          <p className="radar-meta-line">
            {[row.sector, row.area, row.jobModeLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="radar-card-links">
          {row.slug ? (
            <Link href={`/?startup=${row.slug}`} className="radar-link">
              Map
            </Link>
          ) : null}
          {row.website ? (
            <a href={row.website} target="_blank" rel="noopener noreferrer" className="radar-link">
              Site
            </a>
          ) : null}
          {row.careers ? (
            <a href={row.careers} target="_blank" rel="noopener noreferrer" className="radar-link">
              Careers
            </a>
          ) : null}
        </div>
      </header>

      {row.why ? <p className="radar-why">{row.why}</p> : null}

      {row.missReasonLabels?.length ? (
        <ul className="radar-miss">
          {row.missReasonLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}

      {founders.length ? (
        <div className="radar-block">
          <h3>Founders / leadership</h3>
          <ul className="radar-founders">
            {founders.map((f) => (
              <FounderRow key={`${f.name}-${f.role || ""}`} f={f} unlocked={!!row.depth} />
            ))}
          </ul>
        </div>
      ) : null}

      {stealth.length ? (
        <div className="radar-block">
          <h3>Why it’s hard to find</h3>
          <ul>
            {stealth.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {sources.length ? (
        <div className="radar-block">
          <h3>Sources</h3>
          <ul className="radar-sources">
            {sources.map((s) => (
              <li key={`${s.type}-${s.url}`}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.note || s.type || s.url}
                  </a>
                ) : (
                  s.note || s.type
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.aliases?.length ? (
        <p className="radar-aliases">Also known as: {row.aliases.join(", ")}</p>
      ) : null}
    </article>
  );
}

export default function RadarClient({ initialMeta }) {
  const { user, ready } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [payload, setPayload] = useState(null);
  const exclusive = initialMeta?.exclusiveList || {};
  const total = exclusive.total || (exclusive.coreCount || 0) + (exclusive.watchCount || 0);

  useEffect(() => {
    if (!ready || !user) {
      setPayload(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetchRadar(user)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || "Could not unlock Radar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  async function onSignIn() {
    setBusy(true);
    setErr("");
    try {
      await signInWithGoogle();
    } catch (e) {
      if (e?.code !== "auth/popup-closed-by-user") {
        setErr("Sign-in failed. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const unlocked = payload && !payload.locked && Array.isArray(payload.entries);
  const core = unlocked ? payload.entries.filter((e) => e.exclusiveTier === "core") : [];
  const watch = unlocked ? payload.entries.filter((e) => e.exclusiveTier === "watch") : [];

  return (
    <main className="radar-page">
      <GoogleOneTap force />

      <header className="radar-hero">
        <p className="radar-kicker">Mapping HYD · Members</p>
        <h1>{initialMeta?.headline || "Radar"}</h1>
        <p className="radar-lede">
          {initialMeta?.blurb ||
            "Curated hard-to-find Hyderabad employers — founder LinkedIns, miss reasons, and careers quirks."}
        </p>
        <p className="radar-count">
          {total ? (
            <>
              <strong>{total}</strong> exclusive · {exclusive.coreCount || 0} core ·{" "}
              {exclusive.watchCount || 0} watch
            </>
          ) : (
            "Exclusive Hyd list"
          )}
          {initialMeta?.updatedAt ? <> · updated {initialMeta.updatedAt}</> : null}
        </p>
      </header>

      {!ready ? (
        <div className="radar-gate radar-gate-loading" aria-busy="true">
          Checking sign-in…
        </div>
      ) : !user ? (
        <section className="radar-gate" aria-label="Sign in to unlock Radar">
          <h2>Sign in to unlock</h2>
          <p>
            Radar depth — CEO/CTO LinkedIns, stealth signals, and research notes — is for signed-in
            members. The public map and jobs stay free.
          </p>
          <button type="button" className="radar-sign-in" onClick={onSignIn} disabled={busy}>
            {busy ? "Opening Google…" : "Continue with Google"}
          </button>
          {err ? (
            <p className="radar-err" role="status">
              {err}
            </p>
          ) : null}
          <p className="radar-gate-note">
            Already browsing? Use the account chip Google shows in the corner, or the button above.
          </p>
        </section>
      ) : loading ? (
        <div className="radar-gate radar-gate-loading" aria-busy="true">
          Unlocking Radar…
        </div>
      ) : err ? (
        <section className="radar-gate">
          <h2>Couldn’t unlock</h2>
          <p>{err}</p>
          <p className="radar-gate-note">
            If this keeps happening, confirm Firebase Admin (`FIREBASE_SERVICE_ACCOUNT`) is set on
            the server.
          </p>
          <button
            type="button"
            className="radar-sign-in"
            onClick={() => {
              const auth = getClientAuth();
              if (auth?.currentUser) {
                setLoading(true);
                fetchRadar(auth.currentUser)
                  .then(setPayload)
                  .catch((e) => setErr(e.message))
                  .finally(() => setLoading(false));
              }
            }}
          >
            Retry
          </button>
        </section>
      ) : unlocked ? (
        <>
          <p className="radar-unlocked">
            Signed in as {user.email || user.displayName || "member"} — depth unlocked.
          </p>
          {core.length ? (
            <section className="radar-section" aria-label="Core exclusive">
              <h2 className="radar-section-title">Core</h2>
              <div className="radar-grid">
                {core.map((row) => (
                  <RadarCard key={row.id} row={row} />
                ))}
              </div>
            </section>
          ) : null}
          {watch.length ? (
            <section className="radar-section" aria-label="Watch list">
              <h2 className="radar-section-title">Watch</h2>
              <div className="radar-grid">
                {watch.map((row) => (
                  <RadarCard key={row.id} row={row} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="radar-gate">
          <h2>Still locked</h2>
          <p>{payload?.message || "Sign in required."}</p>
        </section>
      )}
    </main>
  );
}
