import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import FresherAlertCta from "../../../components/FresherAlertCta.jsx";
import FresherJobsList from "../../../components/FresherJobsList.jsx";
import { getFresherJobs } from "../../../../lib/jobs.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import {
  FRESHER_CATEGORIES,
  fresherCategoryBySlug,
  filterFresherJobsByCategory,
} from "../../../../lib/fresher-seo.js";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  thinListingRobots,
  FRESHER_JOBS_LANDING,
} from "../../../../lib/jobs-seo.js";

// Job data only refreshes via the twice-daily sync crons (2:30am, 3:00am IST).
export const revalidate = 21600;

export async function generateStaticParams() {
  return FRESHER_CATEGORIES.map((cat) => ({
    category: cat.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const cat = fresherCategoryBySlug(slug);
  if (!cat) return {};

  const allJobs = await getFresherJobs(FRESHER_JOBS_LANDING.experienceLevels);
  const jobs = filterFresherJobsByCategory(allJobs, slug);
  const title = `${cat.metaTitle || cat.title} (${jobs.length} Active Roles)`;
  const url = `${getSiteUrl()}/jobs/fresher/${cat.slug}`;

  return {
    title,
    description: cat.description,
    alternates: { canonical: url },
    robots: thinListingRobots(jobs.length, { min: 1 }),
    openGraph: {
      title,
      description: cat.description,
      url,
      type: "website",
    },
    keywords: [
      `${cat.categoryName.toLowerCase()} fresher jobs hyderabad`,
      `${cat.categoryName.toLowerCase()} internships hyderabad`,
      "fresher tech jobs hyderabad",
      "startup fresher hiring hyderabad",
    ],
  };
}

export default async function FresherCategoryPage({ params }) {
  const { category: slug } = await params;
  const cat = fresherCategoryBySlug(slug);
  if (!cat) notFound();

  const allJobs = await getFresherJobs(FRESHER_JOBS_LANDING.experienceLevels);
  const jobs = filterFresherJobsByCategory(allJobs, slug);

  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Fresher Hub", href: "/jobs/fresher" },
    { name: cat.categoryName },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cat.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd(jobs, cat.headline),
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
          <h1>{cat.headline}</h1>
          <p className="jobs-intro">{cat.subheading}</p>
          <p className="form-sub">
            {`${jobs.length} verified role${
              jobs.length === 1 ? "" : "s"
            } active right now. `}
            <Link href="/jobs/fresher">View all fresher roles →</Link>
          </p>
        </div>

        {/* 2026 Fresher Benchmark Card */}
        {cat.benchmarks && (
          <section className="fresher-tool-card" style={{ marginBottom: 24 }} aria-label={`${cat.categoryName} Market Benchmarks`}>
            <div className="fresher-tool-header">
              <span className="fresher-tool-kicker">Role Intelligence</span>
              <h2 className="fresher-tool-title">{cat.categoryName} Market Benchmarks</h2>
              <p className="fresher-tool-sub">
                Hiring standards, realistic compensation, and key hubs across Hyderabad startups and tech centers.
              </p>
            </div>

            <div className="fresher-metric-board">
              <div className="fresher-metric-grid">
                <div className="fresher-metric-cell">
                  <span className="fresher-metric-lbl">Compensation</span>
                  <span className="fresher-metric-num" style={{ fontSize: "16px" }}>{cat.benchmarks.typicalStipend}</span>
                  <span className="fresher-metric-sub">Base pay / stipend</span>
                </div>
                <div className="fresher-metric-cell">
                  <span className="fresher-metric-lbl">Target Experience</span>
                  <span className="fresher-metric-num" style={{ fontSize: "16px" }}>{cat.benchmarks.duration}</span>
                  <span className="fresher-metric-sub">Eligibility band</span>
                </div>
                <div className="fresher-metric-cell">
                  <span className="fresher-metric-lbl">Key Tech Hubs</span>
                  <span className="fresher-metric-num" style={{ fontSize: "16px" }}>{cat.benchmarks.topLocations}</span>
                  <span className="fresher-metric-sub">Primary clusters</span>
                </div>
                <div className="fresher-metric-cell">
                  <span className="fresher-metric-lbl">In-Demand Skills</span>
                  <span className="fresher-metric-num" style={{ fontSize: "16px" }}>{cat.benchmarks.popularSkills}</span>
                  <span className="fresher-metric-sub">ATS keyword filters</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Category Navigation */}
        <div className="fresher-chips" style={{ marginBottom: 24 }}>
          <Link
            href="/jobs/fresher"
            className="fresher-chip"
          >
            All Fresher Roles
          </Link>
          {FRESHER_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/jobs/fresher/${c.slug}`}
              className={`fresher-chip${c.slug === slug ? " is-active" : ""}`}
            >
              {c.categoryName}
            </Link>
          ))}
        </div>

        {jobs.length ? (
          <FresherJobsList jobs={jobs} />
        ) : (
          <div className="fresher-empty">
            <p className="form-sub">
              No active {cat.categoryName.toLowerCase()} openings matching right now. Check{" "}
              <Link href="/jobs/fresher">all fresher jobs in Hyderabad</Link> or set an alert
              to be notified when new openings drop.
            </p>
          </div>
        )}

        <FresherAlertCta />

        {/* FAQ Section */}
        {cat.faq && cat.faq.length > 0 && (
          <section className="industry-section" aria-label="FAQ" style={{ marginTop: 28 }}>
            <h2>Frequently Asked Questions</h2>
            {cat.faq.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 16 }}>
                <p className="industry-section-sub" style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
                  {item.question}
                </p>
                <p className="industry-section-sub">
                  {item.answer}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
