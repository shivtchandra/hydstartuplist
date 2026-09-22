import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import StartupLogo from "../../../components/StartupLogo.jsx";
import { getJobsForStartupSlug, getCompaniesWithJobs } from "../../../../lib/jobs.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import { prettyName } from "../../../../lib/startupUi.js";
import { startupSlug } from "../../../../lib/slug.js";
import { breadcrumbJsonLd, itemListJsonLd, jobPostingJsonLd, jobUrlId, thinListingRobots } from "../../../../lib/jobs-seo.js";
import { jobDescriptionForPage } from "../../../../lib/job-content.js";

// Job data only refreshes via the twice-daily sync crons (2:30am, 3:00am IST),
// so revalidating every 30 min bought no freshness — just full ISR
// recomputes on cache misses (this route is thin/many-URL enough that hit
// rate is near zero).
export const revalidate = 21600;

// Every prerendered path adds to deployment size, so only the companies with
// the most open roles are prebuilt (this route saw ~0% ISR cache hit rate —
// each is a distinct URL usually visited once — which made this the single
// largest Fluid CPU consumer on the account). The long tail still works:
// dynamicParams defaults to true, so an unlisted slug renders on first
// request and is cached by ISR from then on.
const PRERENDERED_COMPANY_LIMIT = 300;

export async function generateStaticParams() {
  const companies = await getCompaniesWithJobs();
  return companies.slice(0, PRERENDERED_COMPANY_LIMIT).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { startup, jobs, companyName } = await getJobsForStartupSlug(params.slug);
  if (!startup && !jobs.length) return { title: "Company jobs not found" };

  const name = prettyName(startup?.name || companyName || params.slug);
  const count = jobs.length;
  const title = `${name} Jobs in Hyderabad – ${count} Open Role${count === 1 ? "" : "s"}`;
  const description = startup
    ? `Apply to ${count} open role${count === 1 ? "" : "s"} at ${name}, a ${startup.fundingStage} ${startup.sector} startup in ${startup.area || "Hyderabad"}.`
    : `Apply to ${count} open role${count === 1 ? "" : "s"} at ${name} in Hyderabad / Telangana.`;
  const url = `${getSiteUrl()}/jobs/company/${params.slug}`;

  const ogImage = `${getSiteUrl()}/jobs/company/${params.slug}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: thinListingRobots(count, { min: 1 }),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${name} jobs in Hyderabad` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function CompanyJobsPage({ params }) {
  const { startup, jobs, companyName } = await getJobsForStartupSlug(params.slug);
  if (!startup && !jobs.length) notFound();

  const name = prettyName(startup?.name || companyName || params.slug);
  const slug = startup ? startupSlug(startup) : params.slug;
  const pageUrl = `${getSiteUrl()}/jobs/company/${params.slug}`;
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: name },
  ];
  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd(jobs, `${name} jobs in Hyderabad`),
    ...jobs.slice(0, 10).map((j) =>
      jobPostingJsonLd(j, {
        pageUrl: `${getSiteUrl()}/jobs/${jobUrlId(j.id)}`,
        companyUrl: startup?.website,
        description: jobDescriptionForPage(j),
      })
    ),
  ];

  return (
    <div className="page-with-nav">
      {jsonLd.map((data, i) => (
        <script
          key={data["@id"] || data["@type"] + i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <SiteNav active="jobs" />
      <div className="feed-page">
        <JobsBreadcrumbs items={breadcrumbs} />

        <header className="jobs-company-head">
          {startup ? (
          <StartupLogo
            name={startup.name}
            website={startup.website}
            logoUrl={startup.logoUrl}
            sector={startup.sector}
            size={56}
          />
          ) : null}
          <div>
            <h1>{name} Jobs in Hyderabad</h1>
            <p className="jobs-intro">
              {jobs.length} open role{jobs.length === 1 ? "" : "s"} at {name}
              {startup
                ? <> — a {startup.fundingStage} {startup.sector} startup in {startup.area || "Hyderabad"}.</>
                : <> in Hyderabad / Telangana.</>}
              {startup ? (
                <>
                  {" "}
                  <Link href={`/startups/${slug}`}>View company profile →</Link>
                </>
              ) : null}
            </p>
            {startup ? (
              <div className="jobs-company-meta">
                <span className="s-chip">{startup.sector}</span>
                <span>{startup.fundingStage}</span>
                <span>{startup.area}</span>
              </div>
            ) : null}
          </div>
        </header>

        {jobs.length === 0 ? (
          <p className="form-sub">
            No open roles listed right now.{" "}
            {startup?.careers || startup?.website ? (
              <>
                Check the{" "}
                <a href={startup.careers || startup.website} target="_blank" rel="noreferrer">
                  careers page
                </a>{" "}
                or{" "}
              </>
            ) : null}
            <Link href="/jobs">browse all Hyderabad jobs</Link>.
          </p>
        ) : (
          <div className="feed-list">
            {jobs.map((j) => (
              <Link key={j.id} className="feed-row feed-row-link" href={`/jobs/${jobUrlId(j.id)}`}>
                <div className="feed-row-body">
                  <div className="feed-row-name">{j.title}</div>
                  <div className="feed-row-sub">
                    {j.location} · {timeAgo(j.postedAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
