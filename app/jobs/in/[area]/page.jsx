import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import { getJobsByArea } from "../../../../lib/jobs.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import { JOB_AREA_LANDINGS, areaLanding, breadcrumbJsonLd, itemListJsonLd, jobUrlId, thinListingRobots } from "../../../../lib/jobs-seo.js";

export const revalidate = 1800;

export function generateStaticParams() {
  return JOB_AREA_LANDINGS.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({ params }) {
  const landing = areaLanding(params.area);
  if (!landing) return { title: "Area jobs not found" };
  const jobs = await getJobsByArea(landing.area);
  const title = `${landing.title} – ${jobs.length} Open Roles`;
  const url = `${getSiteUrl()}/jobs/in/${params.area}`;
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

export default async function AreaJobsPage({ params }) {
  const landing = areaLanding(params.area);
  if (!landing) notFound();

  const jobs = await getJobsByArea(landing.area);
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: landing.area },
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
            {jobs.length} opening{jobs.length === 1 ? "" : "s"} in or near {landing.area}.{" "}
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
