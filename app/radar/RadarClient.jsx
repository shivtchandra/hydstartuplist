"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthUser } from "../../lib/auth-client.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import StartupLogo from "../components/StartupLogo.jsx";

const CHARMINAR_SRC = "/brand/charminar-radar.jpg";

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

function areaLine(area, geoLabel) {
  if (!area) return geoLabel || null;
  if (/hyderabad/i.test(area) || /telangana/i.test(area)) return area;
  return `${area}, Hyderabad`;
}

function sectorAreaLine(row) {
  const place = areaLine(row.area, row.geoLabel);
  return [row.sector, place].filter(Boolean).join(" · ");
}

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
          width={44}
          height={44}
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
  const meta = sectorAreaLine(row) || row.geoLabel || "Hyderabad";
  const mode = row.jobModeLabel || null;
  return (
    <button
      type="button"
      className={`radar-row${active ? " is-active" : ""}`}
      onClick={() => onSelect(row.id)}
      aria-pressed={active}
    >
      <StartupLogo name={row.name} website={row.website} sector={row.sector} size={40} />
      <span className="radar-row-body">
        <span className="radar-row-name">{row.name}</span>
        <span className="radar-row-meta">
          {meta}
          {mode ? ` · ${mode}` : ""}
        </span>
      </span>
      <span className="radar-row-action">Open →</span>
    </button>
  );
}

function RadarIndex({ exclusive, total, updatedLabel }) {
  return (
    <div className="radar-index">
      <div className="radar-index-copy">
        <p className="radar-index-kicker">Radar index</p>
        <p className="radar-index-lede">
          Open any company for the research brief — what they do, why they&apos;re hard to find, and
          people worth knowing.
        </p>
        <dl className="radar-index-stats">
          <div>
            <dt>Core</dt>
            <dd>{exclusive.coreCount || 0}</dd>
          </div>
          <div>
            <dt>Watch</dt>
            <dd>{exclusive.watchCount || 0}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{total || "—"}</dd>
          </div>
        </dl>
        {updatedLabel ? <p className="radar-index-updated">Updated {updatedLabel}</p> : null}
      </div>
      <figure className="radar-index-photo">
        <img
          src={CHARMINAR_SRC}
          alt="Charminar, Hyderabad"
          width={280}
          height={373}
          loading="lazy"
        />
        <figcaption>Hyderabad</figcaption>
      </figure>
    </div>
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
  const tier = row.exclusiveTier === "core" ? "Core" : row.exclusiveTier === "watch" ? "Watch" : null;
  const whatTheyDo = notes || row.why || null;
  const place = areaLine(row.area, row.geoLabel);
  const placeUpper = [row.sector, place].filter(Boolean).join(" · ");

  return (
    <article className="radar-brief" data-tier={row.exclusiveTier || ""} key={row.id}>
      <button type="button" className="radar-brief-back" onClick={onBack}>
        ← Radar
      </button>

      <header className="radar-brief-head">
        {tier ? <p className="radar-brief-tier">{tier}</p> : null}
        {placeUpper ? <p className="radar-brief-place">{placeUpper}</p> : null}
        <h2>{row.name}</h2>
        {row.why ? <p className="radar-brief-lede">{row.why}</p> : null}
        <nav className="radar-out-row" aria-label="Company links">
          {row.slug ? <OutLink href={`/?startup=${row.slug}`}>Map</OutLink> : null}
          {row.website ? <OutLink href={row.website}>Website</OutLink> : null}
          {row.careers ? <OutLink href={row.careers}>Careers</OutLink> : null}
        </nav>
      </header>

      {whatTheyDo ? (
        <section className="radar-section">
          <h3>What they do</h3>
          <p className="radar-body">{whatTheyDo}</p>
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

      {sources.length ? (
        <section className="radar-section">
          <h3>Sources</h3>
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
        <p className="radar-kicker">Mapping HYD · Radar</p>
        <h1>Companies worth knowing.</h1>
        <p className="radar-sub">
          A deliberately small list of Hyderabad employers that are easy to miss — researched and
          edited by Mapping HYD.
        </p>
        <p className="radar-stats">
          <strong>{total || "—"}</strong> companies
          {" · "}
          {exclusive.coreCount || 0} core
          {" · "}
          {exclusive.watchCount || 0} watch
          {updatedLabel ? <> · Updated {updatedLabel}</> : null}
        </p>
        {payload?.temporaryPublic ? (
          <p className="radar-unlocked">Member access is temporarily open while verify is restored.</p>
        ) : null}
      </header>

      {loading ? (
        <LoadingScreen label="Opening Radar…" />
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
        <div className={`radar-desk${selected ? " has-brief" : ""}`}>
          <aside className="radar-dir" aria-label="Curated company directory">
            <p className="radar-dir-label">Curated list</p>
            <label className="radar-dir-search">
              <span className="visually-hidden">Search companies, sectors, aliases</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search companies, sectors, aliases…"
              />
            </label>

            <div className="radar-dir-scroll">
              {coreFiltered.length ? (
                <section className="radar-dir-section" aria-label="Core">
                  <header className="radar-dir-head">
                    <h2>
                      Core <span>· {coreFiltered.length}</span>
                    </h2>
                    <p>Strong Hyderabad signal.</p>
                  </header>
                  <div className="radar-dir-list" role="list">
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
                <section className="radar-dir-section" aria-label="Watch">
                  <header className="radar-dir-head">
                    <h2>
                      Watch <span>· {watchFiltered.length}</span>
                    </h2>
                    <p>Worth keeping an eye on.</p>
                  </header>
                  <div className="radar-dir-list" role="list">
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
                <p className="radar-dir-empty">No companies match that search.</p>
              ) : null}
            </div>
          </aside>

          <section className="radar-pane" aria-label="Research brief">
            {selected ? (
              <CompanyDetail
                row={selected}
                onBack={() => setSelectedId(null)}
                listUpdatedAt={initialMeta?.updatedAt}
              />
            ) : (
              <RadarIndex exclusive={exclusive} total={total} updatedLabel={updatedLabel} />
            )}
          </section>
        </div>
      ) : (
        <section className="radar-gate">
          <h2>Members only</h2>
          <p>{payload?.message || "Sign in to open Radar."}</p>
        </section>
      )}
    </main>
  );
}
