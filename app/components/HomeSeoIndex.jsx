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
import HomeSeoReveal from "./HomeSeoReveal.jsx";

const getApprovedCached = unstable_cache(
  async () => getApproved(),
  ["home-seo-approved"],
  // 300 here capped the whole homepage's ISR window at 5 minutes (Next uses the
  // lowest revalidate in the render). Approvals bust "startups-dynamic" by tag.
  { revalidate: 86400, tags: ["startups-dynamic"] }
);

const PER_SECTOR = 5;
const MAX_SECTORS = 10;

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
      hiring: list.filter((s) => visibleHiring(s)).length,
      picks: [...list]
        .sort((a, b) => Number(!!visibleHiring(b)) - Number(!!visibleHiring(a)))
        .slice(0, PER_SECTOR),
    }));

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
      <HomeSeoReveal>
        <div className="home-seo-inner">
          <header className="home-seo-head home-seo-step">
            <h1>
              Hyderabad Startup Map
              <span className="home-seo-h1-sub">Companies, jobs &amp; funding</span>
            </h1>
            <p className="home-seo-sub">
              Interactive map of startups and product companies across HITEC City, Gachibowli, Madhapur, and beyond — plus open jobs and funding, updated for {year}.
            </p>
            <dl className="home-seo-stats">
              <div>
                <dt>Startups</dt>
                <dd>{total.toLocaleString()}+</dd>
              </div>
              <div>
                <dt>Hiring now</dt>
                <dd>{hiringCount || "60+"}</dd>
              </div>
              <div>
                <dt>Sectors</dt>
                <dd>{sectorMap.size}</dd>
              </div>
            </dl>
            <p className="home-seo-updated">
              Updated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              <Link href="/hyderabad-tech-statistics">See all statistics</Link>
            </p>
            <nav className="home-seo-actions" aria-label="Explore">
              <Link href="/jobs">Jobs in Hyderabad</Link>
              <Link href="/jobs/fresher">Fresher jobs</Link>
              <Link href="/product-companies">Product companies</Link>
              <Link href="/industries">Industries</Link>
            </nav>
            <Link href="/submit" className="home-seo-add">
              Add your startup to the map →
            </Link>
          </header>

          <div className="home-seo-sectors-section home-seo-step">
            <div className="home-seo-section-title-wrap">
              <h3 className="home-seo-section-title">Explore by sector</h3>
              <Link href="/industries" className="home-seo-view-all">View all industries →</Link>
            </div>

            <div className="home-seo-sectors">
              {bySector.map(({ sector, color, count, hiring, picks }) => (
                <details key={sector} className="home-seo-sector-row">
                  <summary>
                    <span className="home-seo-sector-badge" style={{ backgroundColor: color }} />
                    <span className="home-seo-sector-name">{sector}</span>
                    {hiring > 0 && <span className="home-seo-sector-hiring">{hiring} hiring</span>}
                    <span className="home-seo-count">{count}</span>
                    <svg className="home-seo-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </summary>
                  <div className="home-seo-sector-body">
                    {picks.map((s) => (
                      <Link key={s.id} href={`/startups/${startupSlug(s)}`} className="home-seo-pick">
                        {visibleHiring(s) && <span className="home-seo-pick-dot" aria-label="Hiring" />}
                        {prettyName(s.name)}
                      </Link>
                    ))}
                    <Link href={`/industries/${industrySlugForSector(sector)}`} className="home-seo-pick-all">
                      All {count} {sector} companies →
                    </Link>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <section className="home-seo-faq home-seo-step" aria-label="FAQ">
            <h2 className="home-seo-section-title">FAQ</h2>
            <details>
              <summary>How many startups are on Mapping HYD?</summary>
              <p>
                This directory lists <strong>{total.toLocaleString()}+</strong> Hyderabad startups across HITEC City,
                Gachibowli, Madhapur, and more — updated for {year}. See the{" "}
                <Link href="/hyderabad-tech-statistics">full statistics</Link>.
              </p>
            </details>
            <details>
              <summary>Where can I find jobs in Hyderabad?</summary>
              <p>
                <Link href="/jobs">Browse live openings</Link> or jump to{" "}
                <Link href="/jobs/fresher">fresher jobs in Hyderabad</Link> — free, no signup.
              </p>
            </details>
            <details>
              <summary>Is Mapping HYD Startups free?</summary>
              <p>
                Yes. Browse the map, company pages, and jobs without creating an account.{" "}
                <Link href="/submit">Submit your company</Link> if you are missing.
              </p>
            </details>
          </section>
        </div>
      </HomeSeoReveal>
    </section>
  );
}
