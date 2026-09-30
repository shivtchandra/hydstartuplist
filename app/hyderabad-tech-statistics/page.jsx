import Link from "next/link";
import { getEcosystemStats, pct } from "../../lib/ecosystem-stats.js";
import { getJobMarketPulse } from "../../lib/jobs.js";
import { getSiteUrl } from "../../lib/site-url.js";
import { areaSlugForName } from "../../lib/areas.js";
import { industrySlugForSector } from "../../lib/industries.js";
import SiteNav from "../components/SiteNav.jsx";

export const revalidate = 86400;

const PATH = "/hyderabad-tech-statistics";
const YEAR = 2026;
const TITLE = `Hyderabad Tech Statistics ${YEAR}: Startups, GCCs, Jobs & Tech Parks`;
const DESCRIPTION =
  "Live, citable numbers on Hyderabad's tech ecosystem from Mapping HYD: startups by sector, funding stage and area, hiring share, GCC count, open roles by experience level, and tech park coverage — with methodology.";

const LEVEL_LABELS = {
  intern: "Intern / fresher",
  junior: "Junior (0–2 years)",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead",
  manager: "Manager and above",
};

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

async function loadData() {
  const [eco, pulse] = await Promise.all([getEcosystemStats(), getJobMarketPulse()]);
  return { eco, pulse };
}

export async function generateMetadata() {
  const { eco } = await loadData();
  const url = `${getSiteUrl()}${PATH}`;
  const description = `${eco.totalStartups.toLocaleString()} mapped startups, ${eco.totalGccs} GCCs, ${eco.hiringPct}% actively hiring. ${DESCRIPTION}`;
  return {
    alternates: { canonical: url },
    title: TITLE,
    description,
    openGraph: { title: TITLE, description, url, type: "article" },
    twitter: { card: "summary_large_image", title: TITLE, description },
    keywords: [
      "hyderabad tech statistics",
      "hyderabad startup statistics 2026",
      "number of startups in hyderabad",
      "GCCs in hyderabad count",
      "hyderabad tech jobs data",
      "hyderabad IT ecosystem facts",
    ],
  };
}

function StatTable({ caption, rows, nameHeader, hrefFor, extra }) {
  return (
    <table className="story-table">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{nameHeader}</th>
          <th scope="col">Count</th>
          <th scope="col">Share</th>
          {extra && <th scope="col">{extra.header}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const href = hrefFor?.(r.name);
          return (
            <tr key={r.name}>
              <th scope="row">{href ? <Link href={href}>{r.name}</Link> : r.name}</th>
              <td>{r.count.toLocaleString()}</td>
              <td>{r.pct}%</td>
              {extra && <td>{extra.value(r)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function HyderabadTechStatisticsPage() {
  const { eco, pulse } = await loadData();
  const site = getSiteUrl();
  const pageUrl = `${site}${PATH}`;
  const topSector = eco.bySector[0];
  const topArea = eco.byArea[0];
  const topStage = eco.byStage[0];
  const engPct = pct(pulse.engineering, pulse.totalRoles);
  const earlyPct = pct(pulse.earlyCareer, pulse.totalRoles);
  const levelRows = Object.entries(LEVEL_LABELS)
    .filter(([k]) => pulse.knownLevel[k]?.count)
    .map(([k, label]) => ({ name: label, count: pulse.knownLevel[k].count, pct: pulse.knownLevel[k].pct }));

  const faqs = [
    {
      q: "How many startups are there in Hyderabad?",
      a: `Mapping HYD tracks ${eco.totalStartups.toLocaleString()} active startups and software companies in Hyderabad as of ${fmtDate(eco.asOf)}.`,
    },
    {
      q: "Which sector has the most startups in Hyderabad?",
      a: topSector
        ? `${topSector.name} leads with ${topSector.count.toLocaleString()} companies, or ${topSector.pct}% of mapped startups.`
        : "Sector data is refreshing.",
    },
    {
      q: "Which area of Hyderabad has the most startups?",
      a: topArea
        ? `${topArea.name} has the most mapped startups: ${topArea.count.toLocaleString()} (${topArea.pct}% of startups with a known neighbourhood).`
        : "Area data is refreshing.",
    },
    {
      q: "How many GCCs (global capability centres) are in Hyderabad?",
      a: `Mapping HYD lists ${eco.totalGccs} GCCs with Hyderabad offices and verified careers pages.`,
    },
    {
      q: "What share of Hyderabad startups are hiring right now?",
      a: `${eco.hiringStartups.toLocaleString()} of ${eco.totalStartups.toLocaleString()} mapped startups (${eco.hiringPct}%) show a live hiring signal.`,
    },
    {
      q: "How many tech jobs are open in Hyderabad?",
      a: `The Mapping HYD board shows ${pulse.totalRoles.toLocaleString()} distinct open roles across ${pulse.uniqueEmployers.toLocaleString()} employers, with ${pulse.recent7.toLocaleString()} posted in the last 7 days.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        "@id": `${pageUrl}#dataset`,
        name: TITLE,
        description: DESCRIPTION,
        url: pageUrl,
        creator: { "@id": `${site}/#organization` },
        publisher: { "@id": `${site}/#organization` },
        dateModified: eco.asOf,
        temporalCoverage: `${YEAR}`,
        spatialCoverage: { "@type": "Place", name: "Hyderabad, Telangana, India" },
        isAccessibleForFree: true,
        license: "https://creativecommons.org/licenses/by/4.0/",
        variableMeasured: [
          "Startups by sector",
          "Startups by funding stage",
          "Startups by area",
          "Share of startups hiring",
          "GCCs by industry",
          "Open tech roles by experience level",
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site },
          { "@type": "ListItem", position: 2, name: "Hyderabad Tech Statistics", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <article className="story-page">
        <p className="story-kicker">
          <Link href="/insights">Ecosystem data</Link> · Statistics
        </p>
        <h1>{TITLE}</h1>
        <p className="story-lede">
          Hyderabad has <strong>{eco.totalStartups.toLocaleString()} mapped startups and software companies</strong>,{" "}
          <strong>{eco.totalGccs} global capability centres</strong> and{" "}
          <strong>{pulse.totalRoles.toLocaleString()} open tech roles</strong> on the Mapping HYD board. Every
          number on this page is computed from live data, not copied from press releases, and refreshes daily.
        </p>
        <p className="story-meta">
          As of {fmtDate(eco.asOf)} · Source: Mapping HYD · Free to cite with attribution
        </p>

        <div className="story-body">
          <h2>Key facts</h2>
          <ul>
            <li>
              Mapping HYD tracks <strong>{eco.totalStartups.toLocaleString()}</strong> active startups and software
              companies in Hyderabad, each pinned to its office on the map.
            </li>
            <li>
              <strong>{eco.hiringPct}%</strong> of mapped Hyderabad startups ({eco.hiringStartups.toLocaleString()})
              show a live hiring signal.
            </li>
            {topSector && (
              <li>
                <Link href={`/industries/${industrySlugForSector(topSector.name)}`}>{topSector.name}</Link> is the
                largest sector at <strong>{topSector.pct}%</strong> of companies ({topSector.count.toLocaleString()}).
              </li>
            )}
            {topArea && (
              <li>
                {areaSlugForName(topArea.name) ? (
                  <Link href={`/areas/${areaSlugForName(topArea.name)}`}>{topArea.name}</Link>
                ) : (
                  topArea.name
                )}{" "}
                hosts the most startups: <strong>{topArea.pct}%</strong> of those with a known neighbourhood.
              </li>
            )}
            {topStage && (
              <li>
                The most common funding stage is <strong>{topStage.name}</strong> ({topStage.pct}% of companies).
              </li>
            )}
            <li>
              Hyderabad has <strong>{eco.totalGccs}</strong> tracked <Link href="/gccs">GCCs</Link>, and Mapping HYD
              covers <strong>{eco.techParks}</strong> <Link href="/parks">tech parks</Link> and{" "}
              <strong>{eco.areaHubs}</strong> <Link href="/areas">tech neighbourhoods</Link>.
            </li>
            <li>
              <strong>{pulse.totalRoles.toLocaleString()}</strong> distinct open roles across{" "}
              <strong>{pulse.uniqueEmployers.toLocaleString()}</strong> employers;{" "}
              <strong>{pulse.recent7.toLocaleString()}</strong> were posted in the last 7 days.
            </li>
            <li>
              Engineering accounts for <strong>{engPct}%</strong> of open roles, while intern and junior roles make up
              only <strong>{earlyPct}%</strong> (see the <Link href="/jobs/fresher">fresher jobs board</Link>).
            </li>
            <li>
              The top 10 employers hold <strong>{pulse.top10Pct}%</strong> of open roles, and{" "}
              <strong>{pulse.corridorPct}%</strong> of roles sit in the Gachibowli–Madhapur–Financial District corridor.
            </li>
          </ul>

          <h2>Startups by sector</h2>
          <StatTable
            caption={`Hyderabad startups by sector, ${fmtDate(eco.asOf)}`}
            rows={eco.bySector}
            nameHeader="Sector"
            hrefFor={(name) => (name === "GCC" ? "/gccs" : `/industries/${industrySlugForSector(name)}`)}
            extra={{ header: "Hiring", value: (r) => r.hiring.toLocaleString() }}
          />

          <h2>Startups by funding stage</h2>
          <StatTable
            caption={`Hyderabad startups by funding stage, ${fmtDate(eco.asOf)}`}
            rows={eco.byStage}
            nameHeader="Stage"
          />

          <h2>Startups by area (top 12)</h2>
          <p>
            Share of the {eco.startupsWithArea.toLocaleString()} companies whose listing names a specific neighbourhood.
          </p>
          <StatTable
            caption={`Hyderabad startups by neighbourhood, ${fmtDate(eco.asOf)}`}
            rows={eco.byArea}
            nameHeader="Area"
            hrefFor={(name) => {
              const slug = areaSlugForName(name);
              return slug ? `/areas/${slug}` : null;
            }}
          />

          <h2>Open tech roles by experience level</h2>
          <p>
            Based on {pulse.knownCount.toLocaleString()} roles where the experience level could be inferred from the
            title and description. For the full breakdown, read the{" "}
            <Link href="/stories/hyderabad-job-market-pulse-2026">Hyderabad job market pulse</Link>.
          </p>
          <StatTable caption="Open roles by level" rows={levelRows} nameHeader="Level" />

          <h2>GCCs by industry</h2>
          <StatTable
            caption="Hyderabad GCCs by parent industry"
            rows={eco.gccsByIndustry.map((r) => ({ ...r, pct: pct(r.count, eco.totalGccs) }))}
            nameHeader="Industry"
          />

          <h2>Frequently asked questions</h2>
          {faqs.map((f) => (
            <div key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}

          <h2>Methodology</h2>
          <p>
            Company records come from founder submissions and manual research. Each one is reviewed before it
            appears on the <Link href="/">Hyderabad startup map</Link>. Sector labels are normalised (GCC sub-types
            are grouped as &quot;GCC&quot;), and listings tagged only &quot;Hyderabad&quot; are left out of the area
            ranking. Hiring signals and open roles come from direct syncs with employer
            applicant tracking systems (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Workable and Recruitee) and company career pages.
            Duplicate requisitions with the same title are collapsed into one role, so role counts measure distinct
            jobs, not raw postings. Percentages are rounded to one decimal place. The data refreshes daily.
          </p>
          <p>
            Want to know who runs Mapping HYD and how the data is maintained? See{" "}
            <Link href="/about">about Mapping HYD</Link>.
          </p>

          <h2>How to cite</h2>
          <div className="story-callout">
            Mapping HYD, &quot;{TITLE}&quot;, {fmtDate(eco.asOf)}. {pageUrl}
            <br />
            Licensed CC BY 4.0: free to reuse with a link back to this page.
          </div>
        </div>
      </article>
    </div>
  );
}
