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
import { prettyName } from "../../lib/startupUi.js";
import { industrySlugForSector } from "../../lib/industries.js";

const getApprovedCached = unstable_cache(
  async () => getApproved(),
  ["home-seo-approved"],
  { revalidate: 300 }
);

const PER_SECTOR = 6;
const MAX_SECTORS = 10;
const MAX_AREAS = 14;

function groupCount(list, key) {
  const m = new Map();
  for (const s of list) {
    const v = s[key];
    if (!v) continue;
    if (!m.has(v)) m.set(v, []);
    m.get(v).push(s);
  }
  return m;
}

function shortArea(area) {
  return String(area || "").replace(/,\s*(Hyderabad|Telangana|India)\b.*$/i, "").trim();
}

export default async function HomeSeoIndex() {
  let all = [];
  try {
    all = await getApprovedCached();
  } catch {
    return null; // never let an SEO block break the page
  }
  if (!all.length) return null;

  const withSite = all.filter((s) => s.website);
  const total = all.length;

  // Sectors by startup count; within each, hiring first so the links lead with
  // the most useful pages.
  const bySector = [...groupCount(all, "sector").entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_SECTORS)
    .map(([sector, list]) => ({
      sector,
      count: list.length,
      picks: [...list]
        .sort((a, b) => Number(!!b.hiring) - Number(!!a.hiring))
        .slice(0, PER_SECTOR),
    }));

  const byArea = [...groupCount(all, "area").entries()]
    .map(([area, list]) => ({ area: shortArea(area), count: list.length }))
    .filter((a) => a.area)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_AREAS);

  const jobs = await getAllJobs();
  const hiringNames = new Set(jobs.filter(j => j.category === "startup").map(j => j.company));
  const hiringCount = hiringNames.size;
  const year = new Date().getFullYear();

  return (
    <section className="home-seo" aria-label="Explore Hyderabad startups">
      <div className="home-seo-inner">
        <header className="home-seo-head">
          <h2>Explore the Hyderabad startup ecosystem</h2>
          <p>
            A live map of <strong>{total.toLocaleString()}+ startup companies in Hyderabad</strong> — from
            Gachibowli and HITEC City to Jubilee Hills and Banjara Hills. Browse companies by sector, see
            who&apos;s hiring ({hiringCount} startups with open roles right now), and explore funding stages
            across the city&apos;s tech scene, updated for {year}.
          </p>
          <nav className="home-seo-sections" aria-label="Sections">
            <Link href="/jobs">Startup Jobs</Link>
            <Link href="/gccs">GCCs</Link>
            <Link href="/product-companies">Product Companies</Link>
            <Link href="/industries">Industries</Link>
            <Link href="/insights">Ecosystem Insights</Link>
            <Link href="/feed">Startup Feed</Link>
            <Link href="/news">News</Link>
            <Link href="/stories">Stories</Link>
          </nav>
        </header>

        <div className="home-seo-sectors">
          {bySector.map(({ sector, count, picks }) => (
            <div className="home-seo-col" key={sector}>
              <h3>
                <Link href={`/industries/${industrySlugForSector(sector)}`}>
                  {sector} <span className="home-seo-count">{count}</span>
                </Link>
              </h3>
              <ul>
                {picks.map((s) => (
                  <li key={s.id}>
                    <Link href={`/startups/${startupSlug(s)}`}>
                      {prettyName(s.name)}
                      {s.hiring ? <span className="home-seo-hiring"> · hiring</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {byArea.length > 0 && (
          <div className="home-seo-areas">
            <h3>Startups by area</h3>
            <ul>
              {byArea.map((a) => (
                <li key={a.area}>
                  {a.area} <span className="home-seo-count">{a.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="home-seo-foot">
          Building in Hyderabad? <Link href="/submit">Add your startup to the map →</Link>
        </p>
      </div>
    </section>
  );
}
