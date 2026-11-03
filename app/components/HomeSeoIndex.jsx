// Server-rendered directory summary, company links and factual answers.
// The map already receives SSR company results; this section adds context,
// methodology and matching structured data, visible without a client-side reveal.
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { getApproved, visibleHiring } from "../../lib/store.js";
import { startupSlug } from "../../lib/slug.js";
import { prettyName, colorFor } from "../../lib/startupUi.js";
import { industrySlugForSector } from "../../lib/industries.js";
import { homeAnswers, homeAnswerSchema } from "../../lib/home-answers.js";
import { getSiteUrl } from "../../lib/site-url.js";

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
  const snapshotDate = new Date();
  const answers = homeAnswers({ total, hiringCount, sectorCount: sectorMap.size });
  const faqLd = homeAnswerSchema(answers, getSiteUrl());

  return (
    <section className="home-seo" aria-label="Hyderabad Startup Directory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div id="home-seo-directory" className="home-seo-reveal is-open is-inview">
        <div className="home-seo-inner">
          <header className="home-seo-head home-seo-step">
            <h1>
              Hyderabad Startup Map
              <span className="home-seo-h1-sub">Companies, jobs &amp; funding</span>
            </h1>
            <p className="home-seo-sub">
              {answers[0].answer}
            </p>
            <dl className="home-seo-stats">
              <div>
                <dt>Company listings</dt>
                <dd>{total.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt>Hiring signals</dt>
                <dd>{hiringCount.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt>Sectors</dt>
                <dd>{sectorMap.size}</dd>
              </div>
            </dl>
            <p className="home-seo-updated">
              Counts calculated <time dateTime={snapshotDate.toISOString()}>{snapshotDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</time>
              {" · "}
              <Link href="/hyderabad-tech-statistics">Statistics</Link>
              {" · "}<Link href="/how-we-verify">Sources and verification</Link>
              {" · "}<Link href="/about">Who runs Mapping HYD</Link>
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
              <h2 className="home-seo-section-title">Explore by sector</h2>
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

          <section id="questions" className="home-seo-faq home-seo-step" aria-label="Questions about the Hyderabad company directory">
            <h2 className="home-seo-section-title">Using the Hyderabad company directory</h2>
            {answers.map(({ question, answer, links }) => (
              <article key={question} className="home-answer">
                <h3>{question}</h3>
                <p>{answer}</p>
                <nav aria-label={question}>{links.map(({ href, label }) => (
                  <Link key={href} href={href}>{label}</Link>
                ))}</nav>
              </article>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}
