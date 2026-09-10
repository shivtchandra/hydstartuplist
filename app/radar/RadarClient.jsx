"use client";

import { useEffect, useMemo, useState } from "react";
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

function initials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function linkedInSlug(url) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    const m = path.match(/\/in\/([^/]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function FounderProfile({ f, company }) {
  const name = f.name || "Leadership";
  const role = f.role || "Leadership";
  const slug = linkedInSlug(f.linkedin);
  const [imgFailed, setImgFailed] = useState(false);
  const photo =
    f.photo ||
    f.image ||
    (slug && !imgFailed ? `https://unavatar.io/linkedin/${encodeURIComponent(slug)}` : null);
  const blurb =
    f.bio ||
    f.about ||
    `${role} at ${company || "this company"}. Use LinkedIn for their background, recent posts, and the best way to reach them about roles.`;

  return (
    <article className="radar-person">
      <div className="radar-person-top">
        {photo ? (
          <img
            className="radar-person-photo"
            src={photo}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="radar-person-photo radar-person-photo--fallback" aria-hidden="true">
            {initials(name)}
          </div>
        )}
        <div className="radar-person-id">
          <h4>{name}</h4>
          <p>{role}</p>
        </div>
      </div>
      <p className="radar-person-bio">{blurb}</p>
      {f.linkedin ? (
        <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="radar-person-li">
          View LinkedIn profile →
        </a>
      ) : (
        <span className="radar-person-li radar-person-li--muted">LinkedIn not confirmed yet</span>
      )}
    </article>
  );
}

function CompanyRow({ row, active, onSelect }) {
  return (
    <button
      type="button"
      className={`radar-row${active ? " is-active" : ""}`}
      onClick={() => onSelect(row.id)}
      aria-pressed={active}
    >
      <span className="radar-row-mark" aria-hidden="true">
        {initials(row.name).slice(0, 1)}
      </span>
      <span className="radar-row-body">
        <span className="radar-row-name">{row.name}</span>
        <span className="radar-row-meta">
          {[row.sector, row.area].filter(Boolean).join(" · ") || "Hyderabad"}
        </span>
      </span>
      <span className="radar-row-chev" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function CompanyDetail({ row, onBack }) {
  const founders = row.depth?.founders || row.founders || [];
  const stealth = row.depth?.stealthSignals || [];
  const sources = row.depth?.sources || [];
  const notes = row.depth?.researchNotes || null;
  const chips = [
    ...(row.missReasonLabels || []),
    ...stealth.filter((s) => !(row.missReasonLabels || []).includes(s)),
  ].slice(0, 8);

  return (
    <article className="radar-detail" data-tier={row.exclusiveTier || ""}>
      <button type="button" className="radar-detail-back" onClick={onBack}>
        ← All companies
      </button>

      <header className="radar-detail-head">
        <div>
          <p className="radar-detail-tier">
            {row.exclusiveTier === "core" ? "Core" : "Watch"}
          </p>
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
              Website
            </a>
          ) : null}
          {row.careers ? (
            <a href={row.careers} target="_blank" rel="noopener noreferrer" className="radar-link">
              Careers
            </a>
          ) : null}
        </div>
      </header>

      <section className="radar-detail-block">
        <h3>What they do</h3>
        <p className="radar-detail-lead">{row.why || notes || "Curated hard-to-find Hyderabad employer."}</p>
        {row.why && notes ? <p className="radar-insight">{notes}</p> : null}
      </section>

      {founders.length ? (
        <section className="radar-detail-block">
          <h3>People to know</h3>
          <p className="radar-detail-sub">
            Founders and leadership — open LinkedIn for their full background.
          </p>
          <div className="radar-person-grid">
            {founders.map((f) => (
              <FounderProfile key={`${f.name}-${f.role || ""}`} f={f} company={row.name} />
            ))}
          </div>
        </section>
      ) : null}

      {chips.length ? (
        <section className="radar-detail-block">
          <h3>Why it’s hard to find</h3>
          <ul className="radar-chips">
            {chips.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {row.aliases?.length ? (
        <p className="radar-aliases">Also known as: {row.aliases.join(", ")}</p>
      ) : null}

      {row.liveJobs > 0 ? (
        <p className="radar-jobs-hint">
          {row.liveJobs} live role{row.liveJobs === 1 ? "" : "s"} currently matched on Mapping HYD
          {row.slug ? (
            <>
              {" "}
              · <Link href={`/jobs?company=${encodeURIComponent(row.name)}`}>Browse jobs</Link>
            </>
          ) : null}
        </p>
      ) : null}

      {sources.length ? (
        <details className="radar-sources-details">
          <summary>Sources & research notes</summary>
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
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState("");
  const exclusive = initialMeta?.exclusiveList || {};
  const total = exclusive.total || (exclusive.coreCount || 0) + (exclusive.watchCount || 0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetchRadar(user || null)
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        if (!data?.locked && Array.isArray(data.entries) && data.entries.length) {
          setSelectedId((prev) => prev || data.entries[0].id);
        }
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
  const core = useMemo(
    () => (unlocked ? payload.entries.filter((e) => e.exclusiveTier === "core") : []),
    [unlocked, payload]
  );
  const watch = useMemo(
    () => (unlocked ? payload.entries.filter((e) => e.exclusiveTier === "watch") : []),
    [unlocked, payload]
  );

  const filterRows = (rows) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = [r.name, r.sector, r.area, r.why, ...(r.aliases || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  };

  const coreFiltered = filterRows(core);
  const watchFiltered = filterRows(watch);
  const selected =
    unlocked && selectedId
      ? payload.entries.find((e) => e.id === selectedId) || null
      : null;

  return (
    <main className="radar-page">
      <header className="radar-hero">
        <p className="radar-kicker">Mapping HYD · Members</p>
        <h1>{initialMeta?.headline || "Radar"}</h1>
        <p className="radar-lede">
          Hard-to-find Hyderabad employers — pick a company for the brief, founders, and LinkedIn
          paths. Map and jobs stay free.
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
        {payload?.temporaryPublic ? (
          <p className="radar-unlocked">Temporarily open while member verify is fixed.</p>
        ) : null}
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
        <div className={`radar-shell${selected ? " has-detail" : ""}`}>
          <div className="radar-list-pane">
            <label className="radar-search">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search companies, sectors, aliases…"
                aria-label="Search Radar companies"
              />
            </label>

            {coreFiltered.length ? (
              <section className="radar-list-section" aria-label="Core exclusive">
                <h2 className="radar-section-title">Core · {coreFiltered.length}</h2>
                <div className="radar-list">
                  {coreFiltered.map((row) => (
                    <CompanyRow
                      key={row.id}
                      row={row}
                      active={selectedId === row.id}
                      onSelect={setSelectedId}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {watchFiltered.length ? (
              <section className="radar-list-section" aria-label="Watch list">
                <h2 className="radar-section-title">Watch · {watchFiltered.length}</h2>
                <div className="radar-list">
                  {watchFiltered.map((row) => (
                    <CompanyRow
                      key={row.id}
                      row={row}
                      active={selectedId === row.id}
                      onSelect={setSelectedId}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {!coreFiltered.length && !watchFiltered.length ? (
              <p className="radar-empty">No companies match that search.</p>
            ) : null}
          </div>

          <div className="radar-detail-pane">
            {selected ? (
              <CompanyDetail row={selected} onBack={() => setSelectedId(null)} />
            ) : (
              <div className="radar-detail-empty">
                <h2>Choose a company</h2>
                <p>
                  Open any name for what they do, why they’re easy to miss, and founder LinkedIn
                  profiles — the research layer the public map doesn’t show.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <section className="radar-gate">
          <h2>Still locked</h2>
          <p>{payload?.message || "Sign in required."}</p>
        </section>
      )}
    </main>
  );
}
