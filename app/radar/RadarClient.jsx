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

function formatUpdated(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Signals derived only from existing row fields — no invented claims. */
function buildSignals(row) {
  const founders = row.depth?.founders || row.founders || [];
  const signals = [];
  if (row.jobModeLabel) signals.push(row.jobModeLabel);
  if (row.area) signals.push(row.area);
  if (founders.length) signals.push("Founder identified");
  if (founders.some((f) => f.linkedin)) signals.push("LinkedIn presence");
  if (row.onMap) signals.push("On Mapping HYD map");
  if (row.liveJobs > 0) {
    signals.push(`${row.liveJobs} live role${row.liveJobs === 1 ? "" : "s"} matched`);
  }
  return signals;
}

function OutLink({ href, children }) {
  if (!href) return null;
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="radar-out">
        {children} <span aria-hidden="true">↗</span>
      </a>
    );
  }
  return (
    <Link href={href} className="radar-out">
      {children} <span aria-hidden="true">↗</span>
    </Link>
  );
}

function FounderProfile({ f }) {
  const name = f.name || "Leadership";
  const role = f.role || null;
  const slug = linkedInSlug(f.linkedin);
  const [imgFailed, setImgFailed] = useState(false);
  const photo =
    f.photo ||
    f.image ||
    (slug && !imgFailed ? `https://unavatar.io/linkedin/${encodeURIComponent(slug)}` : null);

  return (
    <article className="radar-person">
      {photo ? (
        <img
          className="radar-person-photo"
          src={photo}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="radar-person-photo radar-person-photo--fallback" aria-hidden="true">
          {initials(name)}
        </div>
      )}
      <div className="radar-person-body">
        <h4>{name}</h4>
        {role ? <p className="radar-person-role">{role}</p> : null}
        {f.linkedin ? (
          <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="radar-person-li">
            View LinkedIn profile <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="radar-person-li radar-person-li--muted">LinkedIn not listed</span>
        )}
      </div>
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
      <span className="radar-row-body">
        <span className="radar-row-name">{row.name}</span>
        <span className="radar-row-meta">
          {[row.sector, row.area].filter(Boolean).join(" · ") || row.geoLabel || "Hyderabad"}
        </span>
        {row.jobModeLabel ? <span className="radar-row-mode">{row.jobModeLabel}</span> : null}
      </span>
      <span className="radar-row-chev" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function CompanyDetail({ row, onBack, listUpdatedAt }) {
  const founders = row.depth?.founders || row.founders || [];
  const stealth = row.depth?.stealthSignals || [];
  const sources = row.depth?.sources || [];
  const notes = row.depth?.researchNotes || null;
  const missLabels = row.missReasonLabels || [];
  const whyHard = [...missLabels, ...stealth.filter((s) => !missLabels.includes(s))];
  const signals = buildSignals(row);
  const lastChecked = formatUpdated(row.depth?.lastVerified || listUpdatedAt);
  const tier = row.exclusiveTier === "core" ? "Core" : "Watch";
  const locLine = [row.sector, row.area].filter(Boolean).join(" · ");

  return (
    <article className="radar-detail" data-tier={row.exclusiveTier || ""} key={row.id}>
      <button type="button" className="radar-detail-back" onClick={onBack}>
        ← All companies
      </button>

      <header className="radar-dossier-head">
        <div className="radar-dossier-meta">
          <p className="radar-detail-tier">{tier}</p>
          {locLine ? <p className="radar-detail-place">{locLine}</p> : null}
        </div>

        <div className="radar-dossier-title-row">
          <div className="radar-dossier-title">
            <h2>{row.name}</h2>
            {row.why && notes ? <p className="radar-one-liner">{row.why}</p> : null}
          </div>
          {(row.area || row.jobModeLabel) && (
            <aside className="radar-place-mark" aria-label="Hyderabad location">
              <span className="radar-place-pin" aria-hidden="true" />
              <div className="radar-place-copy">
                {row.area ? <strong>{row.area}</strong> : null}
                {row.jobModeLabel ? <span>{row.jobModeLabel}</span> : null}
              </div>
            </aside>
          )}
        </div>

        <nav className="radar-out-row" aria-label="Company links">
          {row.slug ? <OutLink href={`/?startup=${row.slug}`}>Map</OutLink> : null}
          {row.website ? <OutLink href={row.website}>Website</OutLink> : null}
          {row.careers ? <OutLink href={row.careers}>Careers</OutLink> : null}
        </nav>
      </header>

      {(notes || row.why) ? (
        <section className="radar-section">
          <h3>What they do</h3>
          <p className="radar-body">{notes || row.why}</p>
        </section>
      ) : null}

      {whyHard.length ? (
        <section className="radar-section">
          <h3>Why it&apos;s hard to find</h3>
          <ul className="radar-evidence">
            {whyHard.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {founders.length ? (
        <section className="radar-section">
          <h3>People to know</h3>
          <div className="radar-people">
            {founders.map((f) => (
              <FounderProfile key={`${f.name}-${f.role || ""}`} f={f} />
            ))}
          </div>
        </section>
      ) : null}

      {signals.length ? (
        <section className="radar-section">
          <h3>Signals</h3>
          <ul className="radar-signals">
            {signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {lastChecked ? (
        <p className="radar-last-checked">
          <span>Last checked</span> {lastChecked}
        </p>
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
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState("");
  const exclusive = initialMeta?.exclusiveList || {};
  const total = exclusive.total || (exclusive.coreCount || 0) + (exclusive.watchCount || 0);
  const updatedLabel = formatUpdated(initialMeta?.updatedAt);

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
        <h1>Radar</h1>
        <p className="radar-kicker">Mapping HYD · Members</p>
        <p className="radar-lede">Hard-to-find Hyderabad employers.</p>
        <p className="radar-sub">
          A private list of companies worth knowing about — especially the ones you won&apos;t find
          in the usual places.
        </p>
        <div className="radar-stats">
          <p className="radar-stats-primary">
            <strong>{total || "—"}</strong> companies
          </p>
          <p className="radar-stats-secondary">
            {exclusive.coreCount || 0} core · {exclusive.watchCount || 0} watch
            {updatedLabel ? <> · Updated {updatedLabel}</> : null}
          </p>
        </div>
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
          <h2>Couldn&apos;t load</h2>
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
          <aside className="radar-list-pane" aria-label="Curated company index">
            <p className="radar-index-label">Curated list</p>
            <label className="radar-search">
              <span className="visually-hidden">Search companies, sectors, aliases</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search companies, sectors, aliases…"
              />
            </label>

            {coreFiltered.length ? (
              <section className="radar-list-section" aria-label="Core">
                <div className="radar-class-head">
                  <h2>
                    Core <span>· {coreFiltered.length}</span>
                  </h2>
                  <p>Companies we think are especially worth knowing.</p>
                </div>
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
              <section className="radar-list-section" aria-label="Watch">
                <div className="radar-class-head">
                  <h2>
                    Watch <span>· {watchFiltered.length}</span>
                  </h2>
                  <p>Companies we&apos;re keeping an eye on.</p>
                </div>
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
          </aside>

          <div className="radar-detail-pane">
            {selected ? (
              <CompanyDetail
                row={selected}
                onBack={() => setSelectedId(null)}
                listUpdatedAt={initialMeta?.updatedAt}
              />
            ) : (
              <div className="radar-detail-empty">
                <h2>Choose a company</h2>
                <p>
                  Open any name for the research brief — what they do, why they hide, people to
                  know.
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
