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
            {`${jobs.length} verified fresher / early-career role${
              jobs.length === 1 ? "" : "s"
            } right now, newest first. `}
            <Link href="/stories/hyderabad-fresher-tech-hiring-guide-2026">Read 2026 Fresher Salary & Hiring Guide →</Link>
          </p>
        </div>

        {/* 2026 Fresher Market Overview Ribbon */}
        <div className="fresher-benchmarks-card" style={{
          background: "var(--bg-glass, rgba(255, 255, 255, 0.7))",
          border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.08))",
          borderRadius: "12px",
          padding: "16px 20px",
          margin: "0 0 20px",
          backdropFilter: "blur(10px)",
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "var(--text-main)" }}>
            ⚡ 2026 Hyderabad Entry-Level Tech Landscape
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            fontSize: "12.5px",
          }}>
            <div>
              <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Product Startups</strong>
              <span>₹6 – ₹16 LPA (Median: ₹7.5 LPA)</span>
            </div>
            <div>
              <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>GCCs & Tech Giants</strong>
              <span>₹12 – ₹24 LPA+</span>
            </div>
            <div>
              <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Internships</strong>
              <span>₹20,000 – ₹55,000 / mo</span>
            </div>
            <div>
              <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Zero Agency Spam</strong>
              <span>100% Direct Company ATS</span>
            </div>
          </div>
        </div>

        {/* Specialized Fresher Category Hubs */}
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>
            Explore by Specialization
          </p>
          <div className="fresher-chips">
            <Link href="/jobs/fresher" className="fresher-chip is-active" style={{ textDecoration: "none" }}>
              All Roles
            </Link>
            <Link href="/jobs/fresher/internships" className="fresher-chip" style={{ textDecoration: "none" }}>
              🎓 Internships
            </Link>
            <Link href="/jobs/fresher/software-engineer" className="fresher-chip" style={{ textDecoration: "none" }}>
              💻 Software Engineer / SDE-1
            </Link>
            <Link href="/jobs/fresher/data-analyst" className="fresher-chip" style={{ textDecoration: "none" }}>
              📊 Data & AI
            </Link>
            <Link href="/jobs/fresher/frontend" className="fresher-chip" style={{ textDecoration: "none" }}>
              🎨 Frontend & UI
            </Link>
            <Link href="/jobs/fresher/qa-testing" className="fresher-chip" style={{ textDecoration: "none" }}>
              🧪 QA & SDET
            </Link>
            <Link href="/jobs/fresher/non-tech" className="fresher-chip" style={{ textDecoration: "none" }}>
              💼 Non-Tech / Business
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
