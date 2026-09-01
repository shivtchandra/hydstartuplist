import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import { getJobsBySector } from "../../../../lib/jobs.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import { breadcrumbJsonLd, itemListJsonLd, jobUrlId, sectorLanding } from "../../../../lib/jobs-seo.js";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [
    { sector: "saas" },
    { sector: "fintech" },
    { sector: "healthtech" },
    { sector: "deeptech" },
    { sector: "edtech" },
  ];
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
    { name: "Home", href: "/" },
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
