"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthUser } from "../../lib/auth-client.js";

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

function sourceLabel(s) {
  if (s?.note && !/^linkedin$/i.test(String(s.note).trim())) return s.note;
  if (s?.url) {
    try {
      return new URL(s.url).hostname.replace(/^www\./, "");
    } catch {
      return "Source";
    }
  }
  if (s?.type && !/^linkedin$/i.test(String(s.type).trim())) return s.type;
  return "Source";
}

function FounderBox({ f }) {
  const name = f.name || "Leadership";
  const role = f.role || null;
  return (
    <div className="radar-founder-box">
      <div className="radar-founder-box-text">
        <p className="radar-founder-name">{name}</p>
        {role ? <p className="radar-founder-role">{role}</p> : null}
      </div>
      {f.linkedin ? (
        <a
          href={f.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="radar-founder-li"
        >
          LinkedIn
        </a>
      ) : (
        <span className="radar-founder-li radar-founder-li--muted">No profile</span>
      )}
    </div>
  );
}

function RadarCard({ row }) {
  const founders = row.depth?.founders || row.founders || [];
  const stealth = row.depth?.stealthSignals || [];
  const sources = row.depth?.sources || [];
  const notes = row.depth?.researchNotes || null;
  const chips = [
    ...(row.missReasonLabels || []),
    ...stealth.filter((s) => !(row.missReasonLabels || []).includes(s)),
  ].slice(0, 6);

  return (
    <article className="radar-card" data-tier={row.exclusiveTier || ""}>
      <header className="radar-card-head">
        <div>
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

      {row.why ? (
        <div className="radar-do">
          <h3>What they do</h3>
          <p>{row.why}</p>
          {notes ? <p className="radar-insight">{notes}</p> : null}
        </div>
      ) : notes ? (
        <div className="radar-do">
          <h3>What they do</h3>
          <p className="radar-insight">{notes}</p>
        </div>
      ) : null}

      {founders.length ? (
        <div className="radar-block">
          <h3>Founders / leadership</h3>
          <div className="radar-founder-grid">
            {founders.map((f) => (
              <FounderBox key={`${f.name}-${f.role || ""}`} f={f} />
            ))}
          </div>
        </div>
      ) : null}

      {chips.length ? (
        <div className="radar-block">
          <h3>Why it’s hard to find</h3>
          <ul className="radar-chips">
            {chips.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.aliases?.length ? (
        <p className="radar-aliases">Also known as: {row.aliases.join(", ")}</p>
      ) : null}

      {sources.length ? (
        <details className="radar-sources-details">
          <summary>Sources</summary>
          <ul className="radar-sources">
            {sources.map((s, i) => (
              <li key={`${sourceLabel(s)}-${s.url || i}`}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {sourceLabel(s)}
                  </a>
                ) : (
                  sourceLabel(s)
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

export default function RadarClient({ initialMeta }) {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [payload, setPayload] = useState(null);
  const exclusive = initialMeta?.exclusiveList || {};
  const total = exclusive.total || (exclusive.coreCount || 0) + (exclusive.watchCount || 0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetchRadar(user || null)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || "Could not load Radar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const unlocked = payload && !payload.locked && Array.isArray(payload.entries);
  const core = unlocked ? payload.entries.filter((e) => e.exclusiveTier === "core") : [];
  const watch = unlocked ? payload.entries.filter((e) => e.exclusiveTier === "watch") : [];

  return (
    <main className="radar-page">
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

      {loading ? (
        <div className="radar-gate radar-gate-loading" aria-busy="true">
          Loading Radar…
        </div>
      ) : err ? (
        <section className="radar-gate">
          <h2>Couldn’t load</h2>
          <p>{err}</p>
          <button
            type="button"
            className="radar-sign-in"
            onClick={() => {
              setLoading(true);
              setErr("");
              fetchRadar(user || null)
                .then(setPayload)
                .catch((e) => setErr(e.message))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </button>
        </section>
      ) : unlocked ? (
        <>
          {payload?.temporaryPublic ? (
            <p className="radar-unlocked">Temporarily open while member verify is fixed.</p>
          ) : null}
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
