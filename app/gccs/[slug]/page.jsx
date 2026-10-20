import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import StartupLogo from "../../components/StartupLogo.jsx";
import VerificationNote from "../../components/VerificationNote.jsx";
import { areaSlugForName } from "../../../lib/areas.js";
import { getGccBySlug, isGccProfileEligible, verifiedGccProfiles } from "../../../lib/gccs.js";
import { getAllJobs } from "../../../lib/jobs.js";
import { breadcrumbJsonLd, itemListJsonLd, jobUrlId } from "../../../lib/jobs-seo.js";
import { getSiteUrl } from "../../../lib/site-url.js";

export const revalidate = 86400;

export function generateStaticParams() {
  return verifiedGccProfiles().map((gcc) => ({ slug: gcc.id }));
}

export async function generateMetadata({ params }) {
  const gcc = getGccBySlug(params.slug);
  if (!isGccProfileEligible(gcc)) return { title: "GCC profile not found", robots: { index: false } };
  const url = `${getSiteUrl()}/gccs/${gcc.id}`;
  const title = `${gcc.name} Hyderabad Office, Functions & Careers`;
  const description = `${gcc.name} in ${gcc.area}: verified Hyderabad office information, ${gcc.functions.join(", ")}, official careers link, and current tracked roles.`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
}

export default async function GccProfilePage({ params }) {
  const gcc = getGccBySlug(params.slug);
  if (!isGccProfileEligible(gcc)) notFound();
  const allJobs = await getAllJobs().catch(() => []);
  const jobs = allJobs.filter((job) => String(job.company || "").trim().toLowerCase() === gcc.name.toLowerCase());
  const site = getSiteUrl();
  const pageUrl = `${site}/gccs/${gcc.id}`;
  const areaSlug = areaSlugForName(gcc.area);
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "GCC Companies", href: "/gccs" },
    { name: gcc.name },
  ];
  const graph = [
    {
      "@type": "Organization",
      "@id": `${pageUrl}#organization`,
      name: gcc.name,
      url: gcc.website,
      sameAs: [gcc.website, gcc.officialSourceUrl].filter(Boolean),
      department: {
        "@type": "Organization",
        name: `${gcc.name} Hyderabad`,
        areaServed: { "@type": "City", name: "Hyderabad" },
        address: { "@type": "PostalAddress", streetAddress: gcc.officeAddress, addressLocality: "Hyderabad", addressRegion: "Telangana", addressCountry: "IN" },
      },
      knowsAbout: gcc.functions,
    },
    {
      "@type": "CollectionPage",
      "@id": `${pageUrl}#page`,
      url: pageUrl,
      name: `${gcc.name} Hyderabad office and careers`,
      dateModified: gcc.verifiedAt,
      about: { "@id": `${pageUrl}#organization` },
      spatialCoverage: { "@type": "Place", name: gcc.area },
    },
  ];
  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    { "@context": "https://schema.org", "@graph": graph },
    ...(jobs.length ? [itemListJsonLd(jobs, `${gcc.name} jobs in Hyderabad`)] : []),
  ];

  return (
    <div className="page-with-nav">
      {jsonLd.map((row, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(row) }} />)}
      <SiteNav active="gccs" />
      <div className="feed-page industry-page">
        <JobsBreadcrumbs items={breadcrumbs} />
        <header className="industry-head">
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <StartupLogo name={gcc.name} website={gcc.website} size={64} />
            <div><p className="story-kicker">Verified GCC · {gcc.area}</p><h1>{gcc.name} Hyderabad</h1></div>
          </div>
          <p className="industry-lead">{gcc.name} has a verified Hyderabad presence in {gcc.area}. Mapping HYD currently classifies its local functions as {gcc.functions.join(", ")}.</p>
          <VerificationNote updatedAt={gcc.verifiedAt}>
            <>Office and function details are backed by Mapping HYD data and the company&apos;s <a href={gcc.officialSourceUrl} target="_blank" rel="noopener noreferrer">official Hyderabad careers source ↗</a>.</>
          </VerificationNote>
        </header>

        <section className="industry-section">
          <h2>{gcc.name} Hyderabad office</h2>
          <p className="industry-section-sub">{gcc.officeAddress || gcc.area}</p>
          <p className="industry-section-sub"><strong>Local functions:</strong> {gcc.functions.join(", ")}</p>
          <p><a className="btn" href={gcc.careers} target="_blank" rel="noopener noreferrer">Open official careers ↗</a></p>
        </section>

        {jobs.length > 0 && (
          <section className="industry-section">
            <h2>Current tracked roles</h2>
            <ul className="industry-facet-list">
              {jobs.slice(0, 30).map((job) => <li key={job.id}><Link href={`/jobs/${jobUrlId(job)}`}>{job.title}</Link></li>)}
            </ul>
          </section>
        )}

        <nav className="industry-other-links" aria-label="Related directories">
          <Link href="/gccs">All GCC companies in Hyderabad</Link>
          {areaSlug && <Link href={`/areas/${areaSlug}`}>Companies in {gcc.area.replace(/,\s*Hyderabad.*$/i, "")}</Link>}
          <Link href="/jobs">Jobs in Hyderabad</Link>
        </nav>
      </div>
    </div>
  );
}
