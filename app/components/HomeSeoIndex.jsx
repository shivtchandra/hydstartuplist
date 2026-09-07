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
import { getApproved, visibleHiring } from "../../lib/store.js";
import { startupSlug } from "../../lib/slug.js";
import { prettyName, colorFor } from "../../lib/startupUi.js";
import { industrySlugForSector } from "../../lib/industries.js";
import { areaSlugForName } from "../../lib/areas.js";
import HomeSeoReveal from "./HomeSeoReveal.jsx";

const getApprovedCached = unstable_cache(
  async () => getApproved(),
  ["home-seo-approved"],
  { revalidate: 300 }
);

const PER_SECTOR = 3;
const MAX_SECTORS = 10;
const MAX_AREAS = 8;

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
  a = a.replace(/,\s*(Hyderabad|Telangana|India|Andhra Pradesh)\b.*$/gi, "").trim();
  if (a.toLowerCase() === "hyderabad" || a.toLowerCase() === "telangana") return "";
  return a;
}

export default async function HomeSeoIndex() {
  let all = [];
  try {
    all = await getApprovedCached();
  } catch {
    return null;
  }
  if (!all.length) return null;

  const total = all.length;

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
        .sort((a, b) => Number(!!visibleHiring(b)) - Number(!!visibleHiring(a)))
        .slice(0, PER_SECTOR),
    }));

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

  const hiringCount = all.filter((s) => visibleHiring(s)).length;
  const year = new Date().getFullYear();

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How many companies in Hyderabad are on this map?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mapping HYD lists ${total.toLocaleString()}+ companies in Hyderabad across tech areas, updated for ${year}.`,
        },
      },
      {
        "@type": "Question",
        name: "How many startups are mapped in Hyderabad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mapping HYD lists ${total.toLocaleString()}+ startups across Hyderabad tech areas, updated for ${year}.`,
        },
      },
      {
        "@type": "Question",
        name: "Where can I find startup jobs in Hyderabad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open https://startups.mapmyhyd.com/jobs for jobs in Hyderabad, or https://startups.mapmyhyd.com/jobs/fresher for fresher and early-career roles. Free, no signup.",
        },
      },
      {
        "@type": "Question",
        name: "Is Mapping HYD Startups free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Browse the map, company pages, and jobs without an account.",
        },
      },
    ],
  };

  return (
    <section className="home-seo" aria-label="Hyderabad Startup Directory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="home-seo-bridge" aria-hidden="true">
        <span className="home-seo-bridge-label">
          Browse the directory
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </div>

      <HomeSeoReveal>
        <div className="home-seo-inner">
          <header className="home-seo-head home-seo-step">
            <h1>Companies in Hyderabad — Startup Directory</h1>
            <p className="home-seo-sub">
              A verified directory of companies in Hyderabad across HITEC City, Gachibowli, Madhapur, and beyond — updated for {year}.
            </p>
            <p className="home-seo-stats-line">
              <strong>{total.toLocaleString()}+</strong> startups
              <span aria-hidden="true"> · </span>
              <strong>{hiringCount || "60+"}</strong> hiring
              <span aria-hidden="true"> · </span>
              <strong>{sectorMap.size}</strong> sectors
            </p>
            <nav className="home-seo-actions" aria-label="Explore">
              <Link href="/jobs">Jobs in Hyderabad</Link>
              <Link href="/jobs/fresher">Fresher jobs in Hyderabad</Link>
              <Link href="/industries">Industries</Link>
              <Link href="/product-companies">Product companies</Link>
              <Link href="/submit">Add your startup</Link>
            </nav>
          </header>

          <div className="home-seo-sectors-section home-seo-step">
            <div className="home-seo-section-title-wrap">
              <h3 className="home-seo-section-title">Explore by sector</h3>
              <Link href="/industries" className="home-seo-view-all">View all industries →</Link>
            </div>

            <div className="home-seo-sectors">
              {bySector.map(({ sector, color, count, picks }) => (
                <div
                  key={sector}
                  className="home-seo-card"
                  style={{ "--sector-accent": color }}
                >
                  <div className="home-seo-card-head">
                    <span className="home-seo-sector-badge" style={{ backgroundColor: color }} />
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
                          {visibleHiring(s) && <span className="home-seo-hiring-badge">Hiring</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {byArea.length > 0 && (
            <div className="home-seo-areas-section home-seo-step">
              <h3 className="home-seo-section-title">Tech clusters</h3>
              <div className="home-seo-areas-grid">
                {byArea.map((a) => {
                  const hub = areaSlugForName(a.area);
                  return (
                  <Link
                    key={a.area}
                    href={hub ? `/areas/${hub}` : `/?view=companies&area=${encodeURIComponent(a.area)}`}
                    className="home-seo-area-chip"
                  >
                    <span className="home-seo-area-name">{a.area}</span>
                    <span className="home-seo-area-count">{a.count}</span>
                  </Link>
                  );
                })}
              </div>
            </div>
          )}

          <section className="home-seo-faq home-seo-step" aria-label="FAQ">
            <h2 className="home-seo-section-title">FAQ</h2>
            <p>
              <strong>How many startups are on Mapping HYD?</strong> This directory lists{" "}
              <strong>{total.toLocaleString()}+</strong> Hyderabad startups across HITEC City,
              Gachibowli, Madhapur, and more — updated for {year}.
            </p>
            <p>
              <strong>Where can I find jobs in Hyderabad?</strong>{" "}
              <Link href="/jobs">Browse live openings</Link> or jump to{" "}
              <Link href="/jobs/fresher">fresher jobs in Hyderabad</Link> — free, no signup.
            </p>
            <p>
              <strong>Is Mapping HYD Startups free?</strong> Yes. Browse the map, company pages, and
              jobs without creating an account.{" "}
              <Link href="/submit">Submit your company</Link> if you are missing.
            </p>
          </section>

          <div className="home-seo-cta home-seo-step">
            <p>
              Building in Hyderabad?{" "}
              <Link href="/submit">Add your startup to the map →</Link>
            </p>
          </div>
        </div>
      </HomeSeoReveal>
    </section>
  );
}
