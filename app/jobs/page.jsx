import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import OpportunityExplorer from "../components/OpportunityExplorer.jsx";
import { opportunityDataset, searchOpportunities } from "../../lib/opportunity-store.js";
import SiteNav from "../components/SiteNav.jsx";
import JobsBreadcrumbs from "../components/JobsBreadcrumbs.jsx";
import JobsClient from "./JobsClient.jsx";
import { getAllJobs } from "../../lib/jobs.js";
import { getAdminDb } from "../../lib/firebaseAdmin.js";
import { getSiteUrl } from "../../lib/site-url.js";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  JOB_AREA_LANDINGS,
  JOB_SECTOR_LANDINGS,
  JOB_ROLE_LANDINGS,
} from "../../lib/jobs-seo.js";
import JobsSeoIndex from "../components/JobsSeoIndex.jsx";

// This app redeploys multiple times a day, which already resets the ISR
// cache — see app/jobs/company/[slug]/page.jsx.
export const revalidate = 604800;

/**
 * Distinct roles, not raw postings.
 *
 * The board collapses repeat requisitions of one role, so counting getAllJobs() would
 * advertise a bigger number than the list actually shows. The dataset is memoized and
 * the page render needs it anyway, so this adds no extra read.
 */
async function distinctRoleCount() {
  const data = await opportunityDataset().catch(() => null);
  if (data?.jobs?.length) return data.jobs.length;
  const jobs = await getAllJobs().catch(() => []);
  return jobs.length;
}

export async function generateMetadata() {
  const count = await distinctRoleCount();
  const title = `Jobs in Hyderabad – ${count}+ Startup & Tech Openings | Mapping HYD`;
  const description =
    "Jobs in Hyderabad at 1,000+ mapped startups and tech companies. Browse open roles across Gachibowli, Madhapur, and HITEC City — including fresher jobs in Hyderabad, SaaS, and fintech.";
  return {
    title,
    description,
    alternates: { canonical: `${getSiteUrl()}/jobs` },
    openGraph: {
      title,
      description,
      url: `${getSiteUrl()}/jobs`,
      type: "website",
    },
    keywords: [
      "jobs in Hyderabad",
      "startup jobs hyderabad",
      "fresher jobs in Hyderabad",
      "tech jobs hyderabad startups",
      "hyderabad startup careers",
      "saas jobs hyderabad",
    ],
  };
}

const getFetchedAt = unstable_cache(
  async () => {
    const db = await getAdminDb();
    if (!db) return null;
    try {
      const snap = await db.collection("job_board").doc("adzuna_latest").get();
      return snap.exists ? snap.data().fetchedAt : null;
    } catch {
      return null;
    }
  },
  ["jobs-fetched-at"],
  { revalidate: 600 }
);

// No searchParams here on purpose: a page component that reads searchParams
// forces the whole route into per-request dynamic rendering, which silently
// overrides `revalidate` above (this route was running full SSR on every
// hit, ignoring the caching fix entirely). The `?job=` redirect now lives in
// middleware.js, and the client (OpportunityExplorer) already refetches via
// /api/v2/jobs whenever filters are present — this initial fetch only ever
// matters for the unfiltered, cacheable case.
export default async function JobsPage() {
  if (process.env.LANDING_V2 !== "0") {
    const initial = await searchOpportunities({}).catch(() => ({ jobs: [], total: 0, stale: true }));
    const roleCount = await distinctRoleCount();
    return (
      <>
        <Suspense fallback={<p>Loading opportunities…</p>}>
          <OpportunityExplorer initial={initial} />
        </Suspense>
        <JobsSeoIndex jobCount={roleCount || initial.total || 0} />
      </>
    );
  }
  const [jobs, fetchedAt] = await Promise.all([getAllJobs(), getFetchedAt()]);
  const startupCount = jobs.filter((j) => j.category === "startup").length;
  const breadcrumbs = [{ name: "Hyderabad Startup Map", href: "/" }, { name: "Jobs" }];
  const jsonLd = [breadcrumbJsonLd(breadcrumbs), itemListJsonLd(jobs)];

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
          <h1>Jobs in Hyderabad</h1>
          <p className="jobs-intro">
            <strong>{jobs.length} open roles</strong>
            {startupCount > 0 ? (
              <>
                {" "}
                · <strong>{startupCount}</strong> from mapped startups
              </>
            ) : null}
            . See the{" "}
            <Link href="/stories/hyderabad-startup-hiring-report-2026">Hyderabad startup hiring report</Link>{" "}
            for who&apos;s hiring now.
          </p>
        </div>

        <JobsClient initialJobs={jobs} fetchedAt={fetchedAt} />

        <section className="jobs-landing-links" aria-labelledby="jobs-browse-heading">
          <h2 id="jobs-browse-heading">Browse jobs by sector, area, or role</h2>
          <div className="jobs-landing-grid">
            <div>
              <h3>By sector</h3>
              <ul>
                {JOB_SECTOR_LANDINGS.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/jobs/sector/${s.slug}`}>{s.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>By area</h3>
              <ul>
                {JOB_AREA_LANDINGS.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/jobs/in/${a.slug}`}>{a.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>By role</h3>
              <ul>
                {JOB_ROLE_LANDINGS.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/jobs/role/${r.slug}`}>{r.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
