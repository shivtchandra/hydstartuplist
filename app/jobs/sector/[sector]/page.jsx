import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import { getJobsBySector } from "../../../../lib/jobs.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import { JOB_SECTOR_LANDINGS, breadcrumbJsonLd, itemListJsonLd, jobUrlId, sectorLanding, thinListingRobots } from "../../../../lib/jobs-seo.js";

export const revalidate = 1800;

export function generateStaticParams() {
  return JOB_SECTOR_LANDINGS.map((s) => ({ sector: s.slug }));
}

export async function generateMetadata({ params }) {
  const landing = sectorLanding(params.sector);
  if (!landing) return { title: "Sector jobs not found" };
  const jobs = await getJobsBySector(landing.sector);
  const title = `${landing.title} – ${jobs.length} Open Roles`;
  const url = `${getSiteUrl()}/jobs/sector/${params.sector}`;
  return {
    title,
    description: landing.description,
    alternates: { canonical: url },
    robots: thinListingRobots(jobs.length),
    openGraph: { title, description: landing.description, url, type: "website" },
  };
}

function timeAgo(iso) {
  if (!iso) return "";
  const hrs = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

export default async function SectorJobsPage({ params }) {
  const landing = sectorLanding(params.sector);
  if (!landing) notFound();

  const jobs = await getJobsBySector(landing.sector);
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: landing.sector },
  ];
  const jsonLd = [breadcrumbJsonLd(breadcrumbs), itemListJsonLd(jobs, landing.title)];

  return (
    <div className="page-with-nav">
      {jsonLd.map((data) => (
        <script
          key={data["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <SiteNav active="jobs" />
      <div className="feed-page">
        <JobsBreadcrumbs items={breadcrumbs} />
        <div className="feed-head">
          <h1>{landing.title}</h1>
          <p className="jobs-intro">{landing.description}</p>
          {landing.body && <p className="jobs-intro jobs-intro-body">{landing.body}</p>}
          <p className="form-sub">
            {jobs.length} role{jobs.length === 1 ? "" : "s"} at mapped {landing.sector} startups.{" "}
            <Link href="/jobs">View all jobs →</Link>
          </p>
        </div>

        <div className="feed-list">
          {jobs.map((j) => (
            <Link key={j.id} className="feed-row feed-row-link" href={`/jobs/${jobUrlId(j.id)}`}>
              <div className="feed-row-body">
                <div className="feed-row-name">{j.title}</div>
                <div className="feed-row-sub">
                  {j.company} · {j.location} · {timeAgo(j.postedAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
