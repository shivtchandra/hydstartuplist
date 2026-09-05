import Link from "next/link";
import { Suspense } from "react";
import OpportunityExplorer from "../components/OpportunityExplorer.jsx";
import { searchOpportunities } from "../../lib/opportunity-store.js";
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

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const jobs = await getAllJobs();
  const count = jobs.length;
  const title = `Startup Jobs in Hyderabad – ${count}+ Open Roles at Tech Companies`;
  const description =
    "Find startup jobs in Hyderabad at 1,000+ mapped companies. Browse open roles from SaaS, fintech, and deeptech startups in Gachibowli, Madhapur, and HITEC City — plus broader IT openings.";
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
      "startup jobs hyderabad",
      "hyderabad startup jobs",
      "tech jobs hyderabad startups",
      "hyderabad startup careers",
      "saas jobs hyderabad",
      "fintech jobs hyderabad",
    ],
  };
}

async function getFetchedAt() {
  const db = await getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.collection("job_board").doc("adzuna_latest").get();
    return snap.exists ? snap.data().fetchedAt : null;
  } catch {
    return null;
  }
}

export default async function JobsPage({ searchParams = {} }) {
  if (process.env.LANDING_V2 !== "0") {
    const initial = await searchOpportunities(searchParams).catch(() => ({ jobs: [], total: 0, stale: true }));
    return <Suspense fallback={<p>Loading opportunities…</p>}><OpportunityExplorer initial={initial} /></Suspense>;
  }
  const [jobs, fetchedAt] = await Promise.all([getAllJobs(), getFetchedAt()]);
  const startupCount = jobs.filter((j) => j.category === "startup").length;
  const breadcrumbs = [{ name: "Home", href: "/" }, { name: "Jobs" }];
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
          <h1>Startup Jobs in Hyderabad</h1>
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
