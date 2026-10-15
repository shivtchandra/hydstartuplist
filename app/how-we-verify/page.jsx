import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import { getApproved } from "../../lib/store.js";
import { getSiteUrl, PARENT_ORG_ID } from "../../lib/site-url.js";

export const revalidate = 86400;

const TITLE = "How We Verify Hyderabad Companies & Jobs";
const DESCRIPTION =
  "How Mapping HYD verifies every company and job on its Hyderabad startup map: geocoded office addresses, weekly hiring checks, direct ATS job feeds, agency filtering, and expiry rules.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${getSiteUrl()}/how-we-verify` },
  openGraph: { title: `${TITLE} | Mapping HYD`, description: DESCRIPTION, type: "article" },
};

const ATS = [
  "Greenhouse",
  "Lever",
  "Ashby",
  "Workable",
  "SmartRecruiters",
  "Keka",
  "Zoho Recruit",
  "Freshteam",
  "Recruitee",
  "Rippling",
  "Breezy HR",
  "Gem",
];

export default async function HowWeVerifyPage() {
  const companies = (await getApproved()).filter((s) => s.active !== false).length;
  const pageUrl = `${getSiteUrl()}/how-we-verify`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#page`,
    url: pageUrl,
    name: TITLE,
    description: DESCRIPTION,
    publisher: { "@id": PARENT_ORG_ID },
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <header className="industry-head">
          <p className="story-kicker">Methodology</p>
          <h1>How we verify companies &amp; jobs</h1>
          <p className="industry-lead">
            Mapping HYD tracks {companies.toLocaleString()} tech companies with a real office in Hyderabad. A
            company or job is called &quot;verified&quot; on this site only when it passes the checks below.
          </p>
        </header>

        <section className="industry-section">
          <h2>Companies</h2>
          <ul>
            <li>
              <strong>Hyderabad office, geocoded.</strong> Before a company is approved, its Hyderabad office is
              looked up on Google Places and the coordinates are checked against the city&apos;s boundaries. When the
              exact building can&apos;t be found, the company is pinned to its tech area instead.
            </li>
            <li>
              <strong>Hiring status is checked, not assumed.</strong> A company shows &quot;Hiring verified&quot; only
              when its careers page was checked within the last 7 days and had open roles. Older checks show as
              &quot;Not recently checked&quot;.
            </li>
            <li>
              <strong>No guessed data.</strong> Funding stage, sector, and description appear only when known;
              otherwise the page says &quot;Not disclosed&quot;.
            </li>
            <li>
              <strong>Open submissions, reviewed.</strong> Founders can{" "}
              <Link href="/submit">submit a company</Link>; each submission is reviewed and geocoded before it
              goes on the map.
            </li>
          </ul>
        </section>

        <section className="industry-section">
          <h2>Jobs</h2>
          <ul>
            <li>
              <strong>Direct from employers first.</strong> Roles are pulled from company applicant tracking
              systems ({ATS.join(", ")}) and company careers pages, plus job search feeds such as Adzuna.
            </li>
            <li>
              <strong>Staffing agencies filtered out.</strong> Listings from recruitment consultancies, placement
              agencies, and body shops are removed by keyword and pattern rules.
            </li>
            <li>
              <strong>Expired roles drop out.</strong> A job page stops being indexed once the role is closed,
              passes its listed end date, or is more than 30 days old.
            </li>
            <li>
              <strong>Apply at the source.</strong> Every job links to the employer&apos;s original posting. Mapping
              HYD does not charge candidates or act as a recruiter.
            </li>
          </ul>
        </section>

        <section className="industry-section">
          <h2>Numbers on this site</h2>
          <p className="industry-section-sub">
            Counts on area, industry, stage, and job pages are computed from the live dataset each time the site
            is rebuilt. See the <Link href="/hyderabad-tech-statistics">Hyderabad tech statistics</Link> page for
            the full breakdown, or browse <Link href="/jobs">jobs in Hyderabad</Link> and the{" "}
            <Link href="/product-companies">product companies directory</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
