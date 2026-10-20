import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import StartupLogo from "../components/StartupLogo.jsx";
import VerificationNote from "../components/VerificationNote.jsx";
import { readGccs, gccsUpdatedAt, isGccProfileEligible } from "../../lib/gccs.js";
import { getAllJobs } from "../../lib/jobs.js";
import { gccSpotlightIdSetAsync } from "../../lib/placements.js";
import { getSiteUrl } from "../../lib/site-url.js";

export const revalidate = 3600;

function GccRow({ gcc, jobCount = 0 }) {
  const profileEligible = isGccProfileEligible(gcc);
  return (
    <div className={`feed-row${gcc.sponsored ? " feed-row-sponsored" : ""}`}>
      <StartupLogo name={gcc.name} website={gcc.website} size={40} />
      <div className="feed-row-body">
        <div className="feed-row-name">
          {profileEligible ? <Link href={`/gccs/${gcc.id}`}>{gcc.name}</Link> : gcc.name}
          {gcc.sponsored && <span className="sponsored-badge">Sponsored</span>}
        </div>
        <div className="feed-row-sub">
          {[gcc.industry, gcc.area || "Hyderabad", gcc.functions?.join(" · ")].filter(Boolean).join(" · ")}
        </div>
        {jobCount > 0 && <div className="feed-row-desc">{jobCount} current tracked role{jobCount === 1 ? "" : "s"}</div>}
      </div>
      {gcc.careers && <a className="nls-more-link" href={gcc.careers} target="_blank" rel="noopener noreferrer">Official careers ↗</a>}
    </div>
  );
}

export default async function GccsPage() {
  const [spotlight, jobs] = await Promise.all([
    gccSpotlightIdSetAsync().catch(() => new Set()),
    getAllJobs().catch(() => []),
  ]);
  const gccs = readGccs().map((gcc) => ({ ...gcc, sponsored: spotlight.has(gcc.id) || gcc.sponsored === true }));
  const updatedAt = gccsUpdatedAt() || new Date().toISOString().slice(0, 10);
  const jobsByCompany = new Map();
  for (const job of jobs) {
    const key = String(job.company || "").trim().toLowerCase();
    if (key) jobsByCompany.set(key, (jobsByCompany.get(key) || 0) + 1);
  }
  const groups = [...gccs.reduce((map, gcc) => {
    const key = gcc.industry || "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(gcc);
    return map;
  }, new Map()).entries()].sort((a, b) => b[1].length - a[1].length);
  const profileCount = gccs.filter(isGccProfileEligible).length;
  const site = getSiteUrl();
  const pageUrl = `${site}/gccs`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: "Global Capability Centers in Hyderabad",
        description: `Directory of ${gccs.length} mapped GCC employers in Hyderabad with official career links.`,
        dateModified: updatedAt,
        spatialCoverage: { "@type": "City", name: "Hyderabad" },
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#gcc-list`,
        name: "GCC companies in Hyderabad",
        numberOfItems: gccs.length,
        itemListElement: gccs.map((gcc, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: gcc.name,
          url: isGccProfileEligible(gcc) ? `${site}/gccs/${gcc.id}` : gcc.careers,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Mapping HYD", item: site },
          { "@type": "ListItem", position: 2, name: "GCC companies in Hyderabad", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav active="gccs" />
      <div className="feed-page industry-page">
        <header className="industry-head">
          <p className="story-kicker">Hyderabad employer directory</p>
          <h1>GCC Companies in Hyderabad</h1>
          <p className="industry-lead">
            Mapping HYD lists {gccs.length} global capability center employers with direct official career links. {profileCount} currently have evidence-complete Hyderabad profiles; the remaining companies stay directory-only until their local details are verified.
          </p>
          <VerificationNote updatedAt={updatedAt} />
          <p className="industry-lead-soft">Looking specifically for openings? <Link href="/jobs">Browse current jobs in Hyderabad →</Link></p>
        </header>

        {gccs.some((gcc) => gcc.sponsored) && (
          <section className="gcc-spotlight-block" aria-label="Hiring spotlight">
            <div className="spotlight-head" style={{ padding: "0 0 10px" }}><span className="spotlight-title">Hiring spotlight</span><span className="spotlight-sub">Sponsored placement</span></div>
            <div className="feed-list">
              {gccs.filter((gcc) => gcc.sponsored).map((gcc) => <GccRow key={gcc.id} gcc={gcc} jobCount={jobsByCompany.get(gcc.name.toLowerCase()) || 0} />)}
            </div>
          </section>
        )}

        {groups.map(([industry, rows]) => (
          <section className="industry-section" key={industry}>
            <h2>{industry} GCCs <span className="industry-facet-count">{rows.length}</span></h2>
            <div className="feed-list">
              {rows.filter((gcc) => !gcc.sponsored).map((gcc) => <GccRow key={gcc.id} gcc={gcc} jobCount={jobsByCompany.get(gcc.name.toLowerCase()) || 0} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
