import Link from "next/link";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import RemoteJobsList from "../../components/RemoteJobsList.jsx";
import { getRemoteJobs } from "../../../lib/jobs.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  thinListingRobots,
  REMOTE_JOBS_LANDING,
} from "../../../lib/jobs-seo.js";
import { REMOTE_CATEGORIES } from "../../../lib/remote-seo.js";

export const revalidate = 604800;

export async function generateMetadata() {
  const jobs = await getRemoteJobs();
  const title = `Remote Tech & Startup Jobs in India (${jobs.length} Verified Openings 2026)`;
  const description =
    "Looking for verified remote jobs in India? Explore 450+ remote software engineer, AI, product, and tech openings at product startups. 100% direct ATS portals, zero consultancy spam.";
  const url = `${getSiteUrl()}/jobs/remote`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: thinListingRobots(jobs.length, { min: 1 }),
    openGraph: { title, description, url, type: "website" },
    keywords: [
      "remote jobs india",
      "remote software engineer jobs india",
      "work from home tech jobs india",
      "remote tech jobs india",
      "remote startup jobs india",
      "remote software developer jobs",
      "remote product manager india",
      "remote frontend developer india",
      "remote backend developer india",
      "remote ai jobs india",
      "wfh tech jobs india",
      "remote jobs hyderabad",
    ],
  };
}

export default async function RemoteJobsPage() {
  const landing = REMOTE_JOBS_LANDING;
  const jobs = await getRemoteJobs();
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Remote" },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are these remote jobs open to candidates across India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All remote listings indexed here accept applicants located anywhere in India (including Hyderabad, Bengaluru, Pune, Delhi NCR, and tier-2/3 cities).",
        },
      },
      {
        "@type": "Question",
        name: "How are these remote jobs verified?",
        answer:
          "Hyderabad Startups Map crawls direct ATS career portals (Greenhouse, Lever, Ashby, Workday, Keka) and filters out third-party staffing agencies, ensuring 100% direct company listings.",
      },
      {
        "@type": "Question",
        name: "Do global and US startups hire engineers in India remotely?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Many US and European product startups hire Indian engineers directly or via Employer of Record (EOR) platforms like Deel and Remote with global compensation bands.",
        },
      },
      {
        "@type": "Question",
        name: "Are these remote jobs free to browse and apply?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All job postings and ATS links are 100% free with no login or subscription required.",
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
            {`${jobs.length} verified remote role${
              jobs.length === 1 ? "" : "s"
            } right now, newest first. Direct ATS application links only.`}
          </p>
        </div>

        {/* Remote Specialization Category Hubs */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            Filter Remote Specialization
          </p>
          <div className="fresher-chips">
            <Link href="/jobs/remote" className="fresher-chip is-active">
              All Remote Roles
            </Link>
            {REMOTE_CATEGORIES.map((cat) => (
              <Link key={cat.slug} href={`/jobs/remote/${cat.slug}`} className="fresher-chip">
                {cat.categoryName}
              </Link>
            ))}
          </div>
        </div>

        {jobs.length ? (
          <RemoteJobsList jobs={jobs} />
        ) : (
          <div className="fresher-empty">
            <p className="form-sub">
              No remote openings matched right now. Check{" "}
              <Link href="/jobs">all tech jobs</Link> or check back after the next 6-hour scrape.
            </p>
          </div>
        )}

        <section className="industry-section" aria-label="FAQ" style={{ marginTop: 32 }}>
          <h2>Frequently Asked Questions About Remote Jobs</h2>
          <p className="industry-section-sub">
            <strong>Are these remote jobs open to candidates across India?</strong> Yes. All listings indexed on this
            page accept applicants based anywhere in India, including Hyderabad, Bengaluru, Pune, and remote tier-2 cities.
          </p>
          <p className="industry-section-sub">
            <strong>How do you filter out fake consultancies and placement agencies?</strong> We crawl direct ATS career
            pages (Greenhouse, Lever, Ashby, Workday, Keka) and enforce an automated employer allowlist, scrubbing out
            unverified consultancies and paid placement scams.
          </p>
          <p className="industry-section-sub">
            <strong>What types of roles are available remotely?</strong> Engineering (frontend, backend, full-stack, DevOps),
            applied AI/ML, data science, product management, and UX design are the most common remote tech opportunities.
          </p>
        </section>
      </div>
    </div>
  );
}
