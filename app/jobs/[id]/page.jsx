import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import ShareJobButton from "../../components/ShareJobButton.jsx";
import { getJobById, getJobsByArea, getJobsForCompany } from "../../../lib/jobs.js";
import { getStartupBySlug, getApproved } from "../../../lib/store.js";
import { startupSlug, slugify } from "../../../lib/slug.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import {
  jobDescriptionForPage,
  jobDescriptionIsHtml,
  formatSalaryInr,
} from "../../../lib/job-content.js";
import {
  breadcrumbJsonLd,
  companyJobsPath,
  jobIdFromUrl,
  jobPostingJsonLd,
  jobShouldIndex,
  jobUrlId,
  localContextForArea,
} from "../../../lib/jobs-seo.js";
import {
  relatedStartups,
  normalizeArea,
  faviconUrl,
  prettyName,
} from "../../../lib/startupUi.js";
import { fundingLabel } from "../../../lib/company-quality.js";

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const id = jobIdFromUrl(params.id);
  const job = await getJobById(id);
  if (!job) return { title: "Job not found" };

  const title = `${job.title} at ${job.company} – Hyderabad Startup Jobs`;
  const description = `Apply for ${job.title} at ${job.company} in ${job.location || "Hyderabad"}. Listed on Hyderabad Startup Map.`;
  const url = `${getSiteUrl()}/jobs/${params.id}`;

  const indexable = jobShouldIndex(job);
  const site = getSiteUrl();
  return {
    title,
    description,
    keywords: [
      `${job.title} ${job.company}`,
      `${job.title} jobs Hyderabad`,
      `${job.company} careers Hyderabad`,
      "startup jobs Hyderabad",
    ],
    // Stale openings: noindex + canonical to the jobs hub so crawl budget
    // concentrates on evergreen landings instead of expired JobPosting URLs.
    alternates: { canonical: indexable ? url : `${site}/jobs` },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "Mapping HYD",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function timeAgo(iso) {
  if (!iso || !Number.isFinite(Date.parse(iso)) || Date.parse(iso) > Date.now()) return "Posting date unavailable";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `Posted ${hrs}h ago`;
  return `Posted ${Math.floor(hrs / 24)}d ago`;
}

function titleTokens(title) {
  return String(title || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "senior", "junior", "lead"].includes(w));
}

export default async function JobDetailPage({ params }) {
  const id = jobIdFromUrl(params.id);
  const job = await getJobById(id);
  if (!job) notFound();

  const pageUrl = `${getSiteUrl()}/jobs/${params.id}`;
  const companySlug = slugify(job.company);
  const startup = await getStartupBySlug(companySlug);
  const companyPath = startup ? `/jobs/company/${startupSlug(startup)}` : companyJobsPath(companySlug);

  const descriptionHtml = jobDescriptionForPage(job);
  const descriptionIsHtml = jobDescriptionIsHtml(descriptionHtml);
  const salaryLabel = formatSalaryInr(job.salary);
  const stage = startup ? fundingLabel(startup.fundingStage) : "";
  const areaLabel = startup?.area || job.location || "Hyderabad";
  const local = localContextForArea(areaLabel);

  const allStartups = startup ? await getApproved() : [];
  const nearby = startup ? relatedStartups(startup, allStartups, 4) : [];

  const areaJobs = await getJobsByArea(normalizeArea(areaLabel) || areaLabel).catch(() => []);
  const tokens = titleTokens(job.title);
  const similarNearby = areaJobs
    .filter((j) => j.id !== job.id)
    .filter((j) => {
      const hay = String(j.title || "").toLowerCase();
      return tokens.some((t) => hay.includes(t));
    })
    .slice(0, 3);

  const companyJobs = await getJobsForCompany(job.company).catch(() => []);

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
    description: descriptionHtml,
    lat: startup?.lat,
    lng: startup?.lng,
    streetAddress: startup?.address,
    addressLocality: normalizeArea(startup?.area) || job.location || "Hyderabad",
    logoUrl: faviconUrl(startup?.website) || undefined,
  });

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(posting) }} />
      <SiteNav active="jobs" />
      <div className="feed-page job-detail">
        <JobsBreadcrumbs items={breadcrumbs} />
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
            {salaryLabel && (
              <>
                {" · "}
                <span className="job-detail-salary">{salaryLabel}</span>
              </>
            )}
            {job.category && (
              <>
                {" · "}
                <span className={`job-detail-badge jobs-type-badge jobs-type-${job.category}`}>
                  {job.category === "startup"
                    ? "Startup"
                    : job.category === "gcc"
                      ? "GCC"
                      : job.category === "enterprise"
                        ? "Enterprise"
                        : "Other"}
                </span>
              </>
            )}
          </p>
        </header>

        <div className="job-detail-actions">
          <a
            className="btn cmd-submit job-apply-btn"
            href={job.url}
            target="_blank"
            rel="noreferrer"
          >
            Apply →
          </a>
          <ShareJobButton url={pageUrl} title={`${job.title} at ${job.company}`} />
          <Link className="btn btn-ghost" href={companyPath}>
            Company jobs
          </Link>
        </div>

        <section className="job-detail-description">
          <h2>Job description</h2>
          {descriptionIsHtml ? (
            <div
              className="job-detail-description-body"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          ) : (
            <p className="job-detail-description-body" style={{ whiteSpace: "pre-wrap" }}>{descriptionHtml}</p>
          )}
        </section>

        {(startup || local || similarNearby.length > 0) && (
          <section className="job-detail-context">
            <h2>Mapping HYD context</h2>
            <ul className="job-context-list">
              {startup && (
                <li>
                  <strong>{prettyName(startup.name)}</strong>
                  {startup.sector ? ` is a ${startup.sector} company` : ""}
                  {stage && stage !== "Not disclosed" ? ` at ${stage}` : ""}
                  {startup.area ? ` in ${startup.area}` : " in Hyderabad"}
                  {startup.founded ? `, founded ${startup.founded}` : ""}.
                  {" "}
                  <Link href={`/startups/${startupSlug(startup)}`}>View on the map →</Link>
                </li>
              )}
              {local && (
                <li>
                  Neighbourhood: near {local.landmarks}. Transit: {local.transit}.
                </li>
              )}
              {nearby.length > 0 && (
                <li>
                  Other mapped startups nearby:{" "}
                  {nearby.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 ? ", " : ""}
                      <Link href={`/startups/${startupSlug(s)}`}>{prettyName(s.name)}</Link>
                    </span>
                  ))}
                  .
                </li>
              )}
              {similarNearby.length > 0 && (
                <li>
                  Similar roles nearby:{" "}
                  {similarNearby.map((j, i) => (
                    <span key={j.id}>
                      {i > 0 ? " · " : ""}
                      <Link href={`/jobs/${jobUrlId(j.id)}`}>{j.title}</Link>
                      {" at "}
                      {j.company}
                    </span>
                  ))}
                  .
                </li>
              )}
              {companyJobs.length > 1 && (
                <li>
                  {companyJobs.length} open roles listed for {job.company} on Mapping HYD.{" "}
                  <Link href={companyPath}>See all →</Link>
                </li>
              )}
            </ul>
          </section>
        )}

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
