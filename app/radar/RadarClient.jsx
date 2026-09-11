"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthUser } from "../../lib/auth-client.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import StartupLogo from "../components/StartupLogo.jsx";

const CHARMINAR_SRC = "/brand/charminar-radar-etch.png";

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

function officeLabel(row) {
  if (row.jobModeLabel) return row.jobModeLabel;
  if (row.area) return "Hyderabad office";
  return row.geoLabel || "Hyderabad";
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

function OutLink({ href, children, className = "radar-out" }) {
  if (!href) return null;
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        {/radar-cta/.test(className) ? null : (
          <>
            {" "}
            <span aria-hidden="true">↗</span>
          </>
        )}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
      {/radar-cta/.test(className) ? null : (
        <>
          {" "}
          <span aria-hidden="true">↗</span>
        </>
      )}
    </Link>
  );
}

function founderPhoto(f, imgFailed) {
  const slug = linkedInSlug(f.linkedin);
  return (
    f.photo ||
    f.image ||
    f.photoUrl ||
    (slug && !imgFailed ? `https://unavatar.io/linkedin/${encodeURIComponent(slug)}` : null)
  );
}

function CardFounderChip({ f }) {
  const [imgFailed, setImgFailed] = useState(false);
  const photo = founderPhoto(f, imgFailed);
  const first = String(f.name || "").trim().split(/\s+/)[0] || "?";
  return (
    <span className="radar-card-person">
      <span className="radar-card-avatar" aria-hidden>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" onError={() => setImgFailed(true)} referrerPolicy="no-referrer" />
        ) : (
          initials(f.name)
        )}
      </span>
      {first}
    </span>
  );
}

function FounderProfile({ f }) {
  const name = f.name || "Leadership";
  const role = f.role || f.title || null;
  const slug = linkedInSlug(f.linkedin);
  const [imgFailed, setImgFailed] = useState(false);
  const photo = founderPhoto(f, imgFailed);

  return (
    <li className="radar-person-card">
      <div className="radar-person-card-media" aria-hidden>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="radar-person-photo"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="radar-person-fallback">{initials(name)}</span>
        )}
      </div>
      <div className="radar-person-card-body">
        <p className="radar-person-name">{name}</p>
        {role ? <p className="radar-person-role">{role}</p> : null}
        {slug ? (
          <OutLink href={f.linkedin} className="radar-person-link">
            LinkedIn · {slug}
          </OutLink>
        ) : f.linkedin ? (
          <OutLink href={f.linkedin} className="radar-person-link">
            LinkedIn
          </OutLink>
        ) : (
          <span className="radar-person-muted">No public LinkedIn on file</span>
        )}
      </div>
    </li>
  );
}

/** Split long blurbs into readable paragraphs */
function briefParagraphs(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return [raw];
  const out = [];
  let buf = [];
  for (const s of sentences) {
    buf.push(s);
    const len = buf.join(" ").length;
    if (buf.length >= 2 && len > 160) {
      out.push(buf.join(" "));
      buf = [];
    }
  }
  if (buf.length) out.push(buf.join(" "));
  return out;
}

function whyHardLabels(row) {
  const missLabels = row.missReasonLabels || [];
  const stealth = row.depth?.stealthSignals || [];
  return [...missLabels, ...stealth.filter((s) => !missLabels.includes(s))];
}

/** GCC-style showcase card */
function ShowcaseCard({ row, onOpen }) {
  const place = areaLine(row.area, row.geoLabel);
  const founders = row.depth?.founders || row.founders || [];
  const why = whyHardLabels(row).slice(0, 2);
  const jobs = row.liveJobs || 0;
  const tier = row.exclusiveTier === "core" ? "core" : "watch";
  const lede = row.why || null;
  const careers = row.careers || null;

  return (
    <article className="radar-card radar-card--v2">
      <button type="button" className="radar-card-hit" onClick={() => onOpen(row.id)} aria-label={`Open ${row.name}`}>
        <div className="radar-card-top">
          <StartupLogo
            name={row.name}
            logoUrl={row.logoUrl}
            website={row.website}
            size={48}
            className="radar-card-logo"
          />
          <div className="radar-card-id">
            <div className="radar-card-meta-row">
              <span className={`radar-tier radar-tier--${tier}`}>
                {tier === "core" ? "Core" : "Watch"}
              </span>
              {jobs > 0 ? <span className="radar-card-jobs">{jobs} open</span> : null}
            </div>
            <h2 className="radar-card-name">{row.name}</h2>
            <p className="radar-card-place">{[row.sector, place].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        {lede ? <p className="radar-card-line">{lede}</p> : null}
        {why.length ? (
          <ul className="radar-card-why">
            {why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {founders.length ? (
          <div className="radar-card-people">
            {founders.slice(0, 3).map((f) => (
              <CardFounderChip key={f.name} f={f} />
            ))}
            {founders.length > 3 ? (
              <span className="radar-card-person radar-card-person--more">+{founders.length - 3}</span>
            ) : null}
          </div>
        ) : null}
      </button>
      <div className="radar-card-actions">
        <button type="button" className="radar-card-open" onClick={() => onOpen(row.id)}>
          Open brief
        </button>
        {careers ? (
          <OutLink href={careers} className="radar-card-ext">
            Careers
          </OutLink>
        ) : row.website ? (
          <OutLink href={row.website} className="radar-card-ext">
            Website
          </OutLink>
        ) : null}
      </div>
    </article>
  );
}

function CompanyDetail({ row, onBack, listUpdatedAt }) {
  const founders = row.depth?.founders || row.founders || [];
  const why = whyHardLabels(row);
  const sources = row.depth?.sources || row.sources || [];
  const signals = buildSignals(row);
  const place = areaLine(row.area, row.geoLabel);
  const lede = row.why || null;
  const notes = row.depth?.researchNotes || null;
  const blurbParas = briefParagraphs(notes && notes !== lede ? notes : null);
  const jobs = row.liveJobs || 0;
  const tier = row.exclusiveTier === "core" ? "core" : row.exclusiveTier === "watch" ? "watch" : null;
  const careers = row.careers || null;
  const lastChecked = formatUpdated(row.depth?.lastVerified || listUpdatedAt);

  return (
    <article className="radar-brief radar-brief--v2" data-tier={row.exclusiveTier || ""}>
      <div className="radar-brief-toolbar">
        <button type="button" className="radar-back" onClick={onBack}>
          <span aria-hidden>←</span> Back to Radar
        </button>
        <span className="radar-brief-toolbar-hint">Research brief</span>
      </div>

      <div className="radar-brief-layout">
        <div className="radar-brief-main">
          <header className="radar-brief-hero">
            <div className="radar-brief-hero-row">
              <StartupLogo
                name={row.name}
                logoUrl={row.logoUrl}
                website={row.website}
                size={72}
                className="radar-brief-logo"
              />
              <div className="radar-brief-identity">
                <div className="radar-brief-chips">
                  {tier ? (
                    <span className={`radar-tier radar-tier--${tier}`}>
                      {tier === "core" ? "Core" : "Watch"}
                    </span>
                  ) : null}
                  {row.sector ? <span className="radar-chip">{row.sector}</span> : null}
                  {place ? <span className="radar-chip">{place}</span> : null}
                  {jobs > 0 ? (
                    <span className="radar-chip radar-chip--jobs">
                      {jobs} live role{jobs === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <h2 className="radar-brief-name">{row.name}</h2>
                {lede ? <p className="radar-brief-lede">{lede}</p> : null}
              </div>
            </div>

            <div className="radar-brief-cta">
              {careers ? (
                <OutLink href={careers} className="radar-cta radar-cta--primary">
                  Careers
                </OutLink>
              ) : null}
              {row.website ? (
                <OutLink
                  href={row.website}
                  className={`radar-cta ${careers ? "radar-cta--ghost" : "radar-cta--primary"}`}
                >
                  Website
                </OutLink>
              ) : null}
              {row.onMap && row.slug ? (
                <Link href={`/startups/${row.slug}`} className="radar-cta radar-cta--ghost">
                  Company page
                </Link>
              ) : null}
              {row.onMap && row.slug ? (
                <Link href={`/?startup=${encodeURIComponent(row.slug)}`} className="radar-cta radar-cta--ghost">
                  Map
                </Link>
              ) : null}
            </div>
          </header>

          {blurbParas.length ? (
            <section className="radar-panel">
              <div className="radar-panel-head">
                <h3>What they do</h3>
              </div>
              <div className="radar-panel-body radar-brief-copy">
                {blurbParas.map((para) => (
                  <p key={para.slice(0, 48)}>{para}</p>
                ))}
              </div>
            </section>
          ) : null}

          {why.length ? (
            <section className="radar-panel">
              <div className="radar-panel-head">
                <h3>Why it&apos;s hard to find</h3>
                <p className="radar-panel-sub">Signals that keep this company under the radar</p>
              </div>
              <ul className="radar-why-grid">
                {why.map((w) => (
                  <li key={w} className="radar-why-item">
                    {w}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {founders.length ? (
            <section className="radar-panel">
              <div className="radar-panel-head">
                <h3>People to know</h3>
                <p className="radar-panel-sub">Founders and operators worth a look</p>
              </div>
              <ul className="radar-people-grid">
                {founders.map((f) => (
                  <FounderProfile key={`${f.name}-${f.linkedin || ""}`} f={f} />
                ))}
              </ul>
            </section>
          ) : null}

          {signals.length ? (
            <section className="radar-panel">
              <div className="radar-panel-head">
                <h3>Signals</h3>
              </div>
              <ul className="radar-signal-row">
                {signals.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {sources.length ? (
            <section className="radar-panel radar-panel--quiet">
              <div className="radar-panel-head">
                <h3>Sources</h3>
              </div>
              <ul className="radar-sources-list">
                {sources.map((s, i) => (
                  <li key={`${sourceLabel(s)}-${i}`}>
                    {s.url ? <OutLink href={s.url}>{sourceLabel(s)}</OutLink> : sourceLabel(s)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(row.aliases && row.aliases.length) || officeLabel(row) || lastChecked ? (
            <footer className="radar-brief-foot">
              {officeLabel(row) ? <span>{officeLabel(row)}</span> : null}
              {lastChecked ? <span>Last checked {lastChecked}</span> : null}
              {row.aliases?.length ? <span>Also known as: {row.aliases.join(", ")}</span> : null}
            </footer>
          ) : null}
        </div>

        <aside className="radar-brief-aside">
          <figure className="radar-brief-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CHARMINAR_SRC}
              alt="Charminar, Hyderabad — line etching"
              width={480}
              height={640}
              loading="lazy"
            />
            <figcaption>Hyderabad · Charminar</figcaption>
          </figure>
          {(careers || row.website) && (
            <div className="radar-brief-aside-card">
              <p className="radar-brief-aside-kicker">Next step</p>
              <p className="radar-brief-aside-title">
                {careers ? "Check open roles" : "Visit the company site"}
              </p>
              <OutLink
                href={careers || row.website}
                className="radar-cta radar-cta--primary radar-cta--block"
              >
                {careers ? "Open careers" : "Open website"}
              </OutLink>
            </div>
          )}
        </aside>
      </div>
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

  // Brief replaces the list in-place; keep the previous scroll and you land on Sources/footer.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [selectedId]);

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

  const showHero = !selected;

  return (
    <main className={`radar-page${selected ? " is-brief" : ""}`}>
      <div className="feed-page radar-feed">
        {showHero ? (
          <header className="radar-hero">
            <p className="radar-kicker">Mapping HYD · Radar</p>
            <h1>Companies worth knowing.</h1>
            <p className="radar-sub">
              A deliberately small list of Hyderabad employers that are easy to miss — researched
              and edited by Mapping HYD.
            </p>
            <p className="radar-stats">
              {total || "—"} companies · {exclusive.coreCount || 0} core ·{" "}
              {exclusive.watchCount || 0} watch
              {updatedLabel ? <> · Updated {updatedLabel}</> : null}
              {payload?.temporaryPublic ? (
                <span className="radar-unlocked"> · Temporarily open</span>
              ) : null}
            </p>
          </header>
        ) : null}

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
          selected ? (
            <CompanyDetail
              row={selected}
              onBack={() => setSelectedId(null)}
              listUpdatedAt={initialMeta?.updatedAt}
            />
          ) : (
            <>
              <label className="radar-feed-search">
                <span className="visually-hidden">Search companies, sectors, aliases</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search companies…"
                  aria-label="Search companies, sectors, aliases"
                />
              </label>

              {coreFiltered.length ? (
                <section className="radar-showcase-section" aria-label="Core">
                  <header className="radar-dir-head">
                    <h2>
                      Core <span>· {coreFiltered.length}</span>
                    </h2>
                    <p>Strong Hyderabad signal.</p>
                  </header>
                  <div className="feed-list">
                    {coreFiltered.map((row) => (
                      <ShowcaseCard key={row.id} row={row} onOpen={setSelectedId} />
                    ))}
                  </div>
                </section>
              ) : null}

              {watchFiltered.length ? (
                <section className="radar-showcase-section" aria-label="Watch">
                  <header className="radar-dir-head">
                    <h2>
                      Watch <span>· {watchFiltered.length}</span>
                    </h2>
                    <p>Worth keeping an eye on.</p>
                  </header>
                  <div className="feed-list">
                    {watchFiltered.map((row) => (
                      <ShowcaseCard key={row.id} row={row} onOpen={setSelectedId} />
                    ))}
                  </div>
                </section>
              ) : null}

              {!coreFiltered.length && !watchFiltered.length ? (
                <p className="radar-dir-empty">No companies match that search.</p>
              ) : null}
            </>
          )
        ) : (
          <section className="radar-gate">
            <h2>Members only</h2>
            <p>{payload?.message || "Sign in to open Radar."}</p>
          </section>
        )}
      </div>
    </main>
  );
}
