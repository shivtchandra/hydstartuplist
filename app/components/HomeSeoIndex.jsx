// Server-rendered SEO index for the homepage.
//
// The homepage itself is a client-side map ("use client"), so its initial HTML
// is an empty shell — Googlebot sees "Loading…" and no content or links on the
// site's highest-authority page. This block ships real, crawlable content in
// the server HTML: a keyword-bearing intro plus ~60 links into the SSR
// /startups/[slug] pages, grouped by sector and area. It sits below the map
// (the .app pane is 100vh; the body scrolls), so it's genuine reachable
// content, not a hidden stuffing block.
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { getApproved } from "../../lib/store.js";
import { getAllJobs } from "../../lib/jobs.js";
import { startupSlug } from "../../lib/slug.js";
import { prettyName, colorFor } from "../../lib/startupUi.js";
import { industrySlugForSector } from "../../lib/industries.js";

const getApprovedCached = unstable_cache(
  async () => getApproved(),
  ["home-seo-approved"],
  { revalidate: 300 }
);

const PER_SECTOR = 6;
const MAX_SECTORS = 10;
const MAX_AREAS = 16;

function normalizeSector(sec) {
  if (!sec) return "Other";
  const s = String(sec).trim();
  const lower = s.toLowerCase();
  if (lower === "healthtech") return "Healthtech";
  if (lower === "deeptech") return "Deeptech";
  if (lower === "fintech") return "Fintech";
  if (lower === "edtech") return "Edtech";
  if (lower === "cleantech") return "Cleantech";
  if (lower === "proptech") return "Proptech";
  if (lower === "hrtech") return "HRtech";
  if (lower === "agritech") return "Agritech";
  if (lower === "biotech") return "Biotech";
  if (lower === "adtech") return "Adtech";
  if (lower === "martech") return "Martech";
  if (lower === "legaltech") return "Legaltech";
  if (lower === "insurtech") return "Insurtech";
  return s;
}

function cleanAreaName(area) {
  if (!area) return "";
  let a = String(area).trim();
  a = a.replace(/,\s*(Hyderabad|Telangana|India|Andhra Pradesh).*$/gi, "").trim();
  a = a.replace(/,\s*(Hyderabad|Telangana|India).*$/gi, "").trim();
  if (a.toLowerCase() === "hyderabad" || a.toLowerCase() === "telangana") return "";
  return a;
}

export default async function HomeSeoIndex() {
  let all = [];
  try {
    all = await getApprovedCached();
  } catch {
    return null; // never let an SEO block break the page
  }
  if (!all.length) return null;

  const total = all.length;

  // Sectors by startup count
  const sectorMap = new Map();
  for (const s of all) {
    const sec = normalizeSector(s.sector);
    if (!sectorMap.has(sec)) sectorMap.set(sec, []);
    sectorMap.get(sec).push(s);
  }

  const bySector = [...sectorMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_SECTORS)
    .map(([sector, list]) => ({
      sector,
      color: colorFor(sector),
      count: list.length,
      picks: [...list]
        .sort((a, b) => Number(!!b.hiring) - Number(!!a.hiring))
        .slice(0, PER_SECTOR),
    }));

  // Areas by startup count
  const areaMap = new Map();
  for (const s of all) {
    const a = cleanAreaName(s.area);
    if (!a) continue;
    if (!areaMap.has(a)) areaMap.set(a, []);
    areaMap.get(a).push(s);
  }

  const byArea = [...areaMap.entries()]
    .map(([area, list]) => ({ area, count: list.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_AREAS);

  const jobs = await getAllJobs();
  const hiringNames = new Set(jobs.filter(j => j.category === "startup").map(j => j.company));
  const hiringCount = hiringNames.size;
  const year = new Date().getFullYear();

  return (
    <section className="home-seo" aria-label="Hyderabad Startup Directory">
      {/* Visual pull dock header indicator */}
      <div className="home-seo-dock-header">
        <span className="home-seo-dock-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          Explore Hyderabad Startup Directory &amp; Ecosystem
        </span>
      </div>

      <div className="home-seo-inner">
        {/* Intro hero header */}
        <header className="home-seo-head">
          <div className="home-seo-title-row">
            <div>
              <h2>Hyderabad Startup Ecosystem &amp; Directory</h2>
              <p className="home-seo-sub">
                A verified directory of <strong>{total.toLocaleString()}+ startups</strong> across HITEC City, Gachibowli, Madhapur, Jubilee Hills, and beyond. Explore sectors, track funding stages, and connect with companies actively hiring in {year}.
              </p>
            </div>
          </div>

          {/* Quick Ecosystem Stats Bar */}
          <div className="home-seo-stats-strip">
            <div className="home-seo-stat-card">
              <span className="stat-num">{total.toLocaleString()}+</span>
              <span className="stat-label">Mapped Startups</span>
            </div>
            <div className="home-seo-stat-card">
              <span className="stat-num stat-hiring">
                <span className="stat-pulse-dot" />
                {hiringCount || "60+"}
              </span>
              <span className="stat-label">Hiring Startups</span>
            </div>
            <div className="home-seo-stat-card">
              <span className="stat-num">{sectorMap.size}</span>
              <span className="stat-label">Industry Sectors</span>
            </div>
            <div className="home-seo-stat-card">
              <span className="stat-num">{byArea.length}+</span>
              <span className="stat-label">Local Hubs</span>
            </div>
          </div>

          {/* Ecosystem navigation links */}
          <nav className="home-seo-sections" aria-label="Ecosystem Hubs">
            <Link href="/jobs" className="seo-nav-chip">
              <span aria-hidden="true">💼</span> Startup Jobs
            </Link>
            <Link href="/gccs" className="seo-nav-chip">
              <span aria-hidden="true">🏢</span> GCCs
            </Link>
            <Link href="/product-companies" className="seo-nav-chip">
              <span aria-hidden="true">🚀</span> Product Companies
            </Link>
            <Link href="/industries" className="seo-nav-chip">
              <span aria-hidden="true">🏷️</span> Industries
            </Link>
            <Link href="/insights" className="seo-nav-chip">
              <span aria-hidden="true">📊</span> Ecosystem Insights
            </Link>
            <Link href="/feed" className="seo-nav-chip">
              <span aria-hidden="true">⚡</span> Live Feed
            </Link>
            <Link href="/news" className="seo-nav-chip">
              <span aria-hidden="true">📰</span> News
            </Link>
            <Link href="/stories" className="seo-nav-chip">
              <span aria-hidden="true">✨</span> Stories
            </Link>
          </nav>
        </header>

        {/* Sector cards grid */}
        <div className="home-seo-sectors-section">
          <div className="home-seo-section-title-wrap">
            <h3 className="home-seo-section-title">Explore by Sector</h3>
            <Link href="/industries" className="home-seo-view-all">View all industries →</Link>
          </div>

          <div className="home-seo-sectors">
            {bySector.map(({ sector, color, count, picks }) => (
              <div className="home-seo-card" key={sector} style={{ "--sector-accent": color }}>
                <div className="home-seo-card-head">
                  <div className="home-seo-sector-badge" style={{ backgroundColor: color }}></div>
                  <Link href={`/industries/${industrySlugForSector(sector)}`} className="home-seo-sector-title">
                    {sector}
                  </Link>
                  <span className="home-seo-count">{count}</span>
                </div>
                <ul className="home-seo-startup-list">
                  {picks.map((s) => (
                    <li key={s.id} className="home-seo-startup-item">
                      <Link href={`/startups/${startupSlug(s)}`} className="home-seo-startup-link">
                        <span className="home-seo-startup-name">{prettyName(s.name)}</span>
                        {s.hiring && <span className="home-seo-hiring-badge">Hiring</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="home-seo-card-footer">
                  <Link href={`/industries/${industrySlugForSector(sector)}`} className="home-seo-more-link">
                    All {count} {sector} startups →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Area chips section */}
        {byArea.length > 0 && (
          <div className="home-seo-areas-section">
            <h3 className="home-seo-section-title">Startups by Hyderabad Tech Clusters</h3>
            <div className="home-seo-areas-grid">
              {byArea.map((a) => (
                <div key={a.area} className="home-seo-area-chip">
                  <span className="home-seo-area-name">{a.area}</span>
                  <span className="home-seo-area-count">{a.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom invitation card */}
        <div className="home-seo-cta-banner">
          <div className="home-seo-cta-content">
            <h4>Building or hiring at a tech startup in Hyderabad?</h4>
            <p>Get featured on the interactive ecosystem map, showcase open jobs, and reach talent across India.</p>
          </div>
          <div className="home-seo-cta-actions">
            <Link href="/submit" className="btn home-seo-cta-btn">
              Add your startup for free →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
