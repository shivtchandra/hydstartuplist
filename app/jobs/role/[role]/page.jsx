import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import { getJobsByRole } from "../../../../lib/jobs.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import {breadcrumbJsonLd, itemListJsonLd, jobUrlId, roleLanding, thinListingRobots } from "../../../../lib/jobs-seo.js";

export const revalidate = 1800;

export function generateStaticParams() {
  return [
    { role: "software-engineer" },
    { role: "product-manager" },
    { role: "data-scientist" },
    { role: "designer" },
    { role: "sales" },
    { role: "marketing" },
    { role: "devops" },
    { role: "backend-engineer" },
    { role: "frontend-engineer" },
    { role: "full-stack-engineer" },
  ];
}

export async function generateMetadata({ params }) {
  const landing = roleLanding(params.role);
  if (!landing) return { title: "Role jobs not found" };
  const jobs = await getJobsByRole(landing);
  const title = `${landing.title} – ${jobs.length} Open Roles`;
  const url = `${getSiteUrl()}/jobs/role/${params.role}`;
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

export default async function RoleJobsPage({ params }) {
  const landing = roleLanding(params.role);
  if (!landing) notFound();

  const jobs = await getJobsByRole(landing);
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: landing.role },
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
            {jobs.length} {landing.role.toLowerCase()} opening{jobs.length === 1 ? "" : "s"} at Hyderabad
            startups. <Link href="/jobs">View all jobs →</Link>
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
