import Link from "next/link";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import FresherAlertCta from "../../components/FresherAlertCta.jsx";
import FresherJobsList from "../../components/FresherJobsList.jsx";
import { getFresherJobs } from "../../../lib/jobs.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  FRESHER_JOBS_LANDING,
  thinListingRobots,
} from "../../../lib/jobs-seo.js";

export const revalidate = 1800;

export async function generateMetadata() {
  const landing = FRESHER_JOBS_LANDING;
  const jobs = await getFresherJobs(landing.experienceLevels);
  const title = `${landing.title} – ${jobs.length} Entry-Level Openings | Mapping HYD`;
  const url = `${getSiteUrl()}/jobs/fresher`;
  return {
    title,
    description: landing.description,
    alternates: { canonical: url },
    robots: thinListingRobots(jobs.length, { min: 1 }),
    openGraph: { title, description: landing.description, url, type: "website" },
    keywords: [
      "fresher jobs in Hyderabad",
      "fresher jobs hyderabad",
      "entry level jobs hyderabad",
      "internship jobs hyderabad startups",
    ],
  };
}

export default async function FresherJobsPage() {
  const landing = FRESHER_JOBS_LANDING;
  const jobs = await getFresherJobs(landing.experienceLevels);
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Fresher" },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where can I find fresher jobs in Hyderabad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Mapping HYD lists fresher jobs in Hyderabad from mapped startups — entry-level, intern, and early-career openings. Browse this page or open the full jobs board.",
        },
      },
      {
        "@type": "Question",
        name: "Are these fresher jobs free to browse?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Fresher jobs in Hyderabad on Mapping HYD are free to browse with no signup required.",
        },
      },
      {
        "@type": "Question",
        name: "What counts as a fresher or early-career role?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We surface roles whose titles or descriptions signal intern, fresher, trainee, graduate, or junior experience bands.",
        },
      },
    ],
  };
  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd(jobs, landing.title),
    faqLd,
  ];

  return (
    <div className="page-with-nav">
      {jsonLd.map((data, i) => (
        <script
          key={data["@type"] + i}
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
            {`${jobs.length} fresher / early-career role${
              jobs.length === 1 ? "" : "s"
            } right now, newest first. `}
            <Link href="/jobs?level=early">Filter early career on the jobs board →</Link>
          </p>
        </div>

        {jobs.length ? (
          <FresherJobsList jobs={jobs} />
        ) : (
          <div className="fresher-empty">
            <p className="form-sub">
              No fresher-tagged openings matched right now. Check{" "}
              <Link href="/jobs">all jobs in Hyderabad</Link> or get an email when new
              ones land.
            </p>
          </div>
        )}

        <FresherAlertCta />

        <section className="industry-section" aria-label="FAQ" style={{ marginTop: 28 }}>
          <h2>FAQ</h2>
          <p className="industry-section-sub">{landing.body}</p>
          <p className="industry-section-sub">
            <strong>Where can I find fresher jobs in Hyderabad?</strong> This page lists entry-level
            openings at mapped startups — or browse the full{" "}
            <Link href="/jobs">jobs in Hyderabad</Link> board.
          </p>
          <p className="industry-section-sub">
            <strong>What counts as a fresher role?</strong> Intern, fresher, trainee and graduate
            postings sit under <em>Intern &amp; fresher</em>; roles asking for up to about two years
            sit under <em>Junior</em>. Senior, staff and lead postings are excluded.
          </p>
          <p className="industry-section-sub">
            <strong>Is it free?</strong> Yes. No signup to browse fresher jobs in Hyderabad on Mapping
            HYD.
          </p>
        </section>
      </div>
</div>
  );
}
