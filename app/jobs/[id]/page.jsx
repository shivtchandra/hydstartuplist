import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import { getJobById } from "../../../lib/jobs.js";
import { getStartupBySlug } from "../../../lib/store.js";
import { startupSlug, slugify } from "../../../lib/slug.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import {
  breadcrumbJsonLd,
  companyJobsPath,
  jobIdFromUrl,
  jobPostingJsonLd,
} from "../../../lib/jobs-seo.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const id = jobIdFromUrl(params.id);
  const job = await getJobById(id);
  if (!job) return { title: "Job not found" };

  const title = `${job.title} at ${job.company} – Hyderabad Startup Jobs`;
  const description = `Apply for ${job.title} at ${job.company} in ${job.location || "Hyderabad"}. Listed on Hyderabad Startup Map.`;
  const url = `${getSiteUrl()}/jobs/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

function timeAgo(iso) {
  if (!iso) return "Recently posted";
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `Posted ${hrs}h ago`;
  return `Posted ${Math.floor(hrs / 24)}d ago`;
}

export default async function JobDetailPage({ params }) {
  const id = jobIdFromUrl(params.id);
  const job = await getJobById(id);
  if (!job) notFound();

  const pageUrl = `${getSiteUrl()}/jobs/${params.id}`;
  const companySlug = slugify(job.company);
  const startup = await getStartupBySlug(companySlug);
  const companyPath = startup ? `/jobs/company/${startupSlug(startup)}` : companyJobsPath(companySlug);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: job.company, href: companyPath },
    { name: job.title },
  ];

  const jsonLd = breadcrumbJsonLd(breadcrumbs);
  const posting = jobPostingJsonLd(job, {
    pageUrl,
    companyUrl: startup?.website,
    description: `${job.title} at ${job.company} in ${job.location || "Hyderabad"}. Apply via the official listing.`,
  });

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(posting) }} />
      <SiteNav active="jobs" />
      <div className="feed-page job-detail">
        <div className="job-detail-back-row">
          <Link href="/jobs" className="job-detail-back">← All jobs</Link>
        </div>

        <header className="feed-head">
          <h1>{job.title}</h1>
          <p className="jobs-intro">
            <Link href={companyPath}>{job.company}</Link>
            {" · "}
            {job.location || "Hyderabad"}
            {" · "}
            {timeAgo(job.postedAt)}
            {job.category === "startup" && (
              <>
                {" · "}
                <span className="job-detail-badge">Startup role</span>
              </>
            )}
          </p>
        </header>

        <div className="job-detail-actions">
          <a className="btn cmd-submit job-apply-btn" href={job.url} target="_blank" rel="noreferrer">
            Apply on company site →
          </a>
        </div>

        {startup && (
          <section className="job-detail-company">
            <h2>About {job.company}</h2>
            <p>
              {startup.description || `${job.company} is a ${startup.sector} startup in ${startup.area || "Hyderabad"}.`}
            </p>
            <p>
              <Link href={`/startups/${startupSlug(startup)}`}>View {job.company} on the map →</Link>
            </p>
          </section>
        )}

        <p className="form-sub">
          This listing links to the employer&apos;s official application page. Hyderabad Startup Map aggregates
          open roles from startup career pages and licensed job feeds — we don&apos;t accept applications directly.
        </p>
      </div>
    </div>
  );
}
