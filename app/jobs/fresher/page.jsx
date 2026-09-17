import Link from "next/link";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import FresherAlertCta from "../../components/FresherAlertCta.jsx";
import FresherJobsList from "../../components/FresherJobsList.jsx";
import FresherSalaryCalculator from "../../components/FresherSalaryCalculator.jsx";
import CompanyScamShield from "../../components/CompanyScamShield.jsx";
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
  const title = `${landing.title} – ${jobs.length} Entry-Level Openings`;
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
            {`${jobs.length} verified fresher / early-career role${
              jobs.length === 1 ? "" : "s"
            } right now, newest first. `}
            <Link href="/stories/hyderabad-fresher-tech-hiring-guide-2026">Read 2026 Fresher Salary & Hiring Guide →</Link>
          </p>
        </div>

        {/* 2026 Fresher Market Overview Card */}
        <section className="fresher-tool-card" style={{ marginBottom: "24px" }} aria-label="Hyderabad Fresher Market Benchmarks">
          <div className="fresher-tool-header">
            <span className="fresher-tool-kicker">2026 Market Intelligence</span>
            <h2 className="fresher-tool-title">Hyderabad Entry-Level Tech Landscape</h2>
            <p className="fresher-tool-sub">
              Verified compensation and hiring bands compiled from direct startup ATS data and off-campus placements.
            </p>
          </div>

          <div className="fresher-metric-board">
            <div className="fresher-metric-grid">
              <div className="fresher-metric-cell">
                <span className="fresher-metric-lbl">Product Startups</span>
                <span className="fresher-metric-num" style={{ fontSize: "16px" }}>₹6 – ₹16 LPA</span>
                <span className="fresher-metric-sub">Median: ₹7.5 LPA Base</span>
              </div>
              <div className="fresher-metric-cell">
                <span className="fresher-metric-lbl">GCCs & Tech Hubs</span>
                <span className="fresher-metric-num" style={{ fontSize: "16px" }}>₹12 – ₹24 LPA</span>
                <span className="fresher-metric-sub">HITEC City & Gachibowli</span>
              </div>
              <div className="fresher-metric-cell">
                <span className="fresher-metric-lbl">Internship Stipends</span>
                <span className="fresher-metric-num" style={{ fontSize: "16px" }}>₹20k – ₹1.2L</span>
                <span className="fresher-metric-sub">Monthly (startup – GCC)</span>
              </div>
              <div className="fresher-metric-cell">
                <span className="fresher-metric-lbl">Application Pipeline</span>
                <span className="fresher-metric-num" style={{ fontSize: "16px" }}>100% Direct</span>
                <span className="fresher-metric-sub">Zero consultancies / agency fees</span>
              </div>
            </div>
          </div>
        </section>

        {/* Specialized Fresher Category Hubs */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            Filter by Specialization
          </p>
          <div className="fresher-chips">
            <Link href="/jobs/fresher" className="fresher-chip is-active">
              All Roles
            </Link>
            <Link href="/jobs/fresher/internships" className="fresher-chip">
              Internships
            </Link>
            <Link href="/jobs/fresher/software-engineer" className="fresher-chip">
              Software Engineer / SDE-1
            </Link>
            <Link href="/jobs/fresher/data-analyst" className="fresher-chip">
              Data & AI
            </Link>
            <Link href="/jobs/fresher/frontend" className="fresher-chip">
              Frontend & UI
            </Link>
            <Link href="/jobs/fresher/qa-testing" className="fresher-chip">
              QA & SDET
            </Link>
            <Link href="/jobs/fresher/non-tech" className="fresher-chip">
              Non-Tech / Business
            </Link>
          </div>
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

        {/* Interactive Fresher Salary & Reality Check Calculator */}
        <FresherSalaryCalculator />

        {/* Scam Shield / Company Legitimacy Checker */}
        <CompanyScamShield />

        <FresherAlertCta />

        <section className="industry-section" aria-label="FAQ" style={{ marginTop: 28 }}>
          <h2>Frequently Asked Questions</h2>
          <p className="industry-section-sub">{landing.body}</p>
          <p className="industry-section-sub">
            <strong>Where can I find verified fresher jobs in Hyderabad?</strong> This page lists entry-level
            openings at mapped startups — or browse the full{" "}
            <Link href="/jobs">jobs in Hyderabad</Link> board.
          </p>
          <p className="industry-section-sub">
            <strong>How do you filter out fake consultancies and Ameerpet placement scams?</strong> Mapping
            HYD enforces a strict employer allowlist and denylist, scrubs 40+ staffing agencies, and crawls
            direct company ATS portals (Greenhouse, Lever, Zoho, Freshteam, Keka) so every listing is 100% direct.
          </p>
          <p className="industry-section-sub">
            <strong>What counts as a fresher role?</strong> Intern, fresher, trainee, GET (Graduate Engineer Trainee),
            and graduate postings sit under <em>Intern &amp; fresher</em>; roles asking for up to about two years
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
