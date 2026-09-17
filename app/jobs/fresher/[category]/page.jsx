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

export const revalidate = 1800;

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
          <div className="fresher-benchmarks-card" style={{
            background: "var(--bg-glass, rgba(255, 255, 255, 0.7))",
            border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.08))",
            borderRadius: "12px",
            padding: "16px 20px",
            margin: "0 0 24px",
            backdropFilter: "blur(10px)",
          }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "var(--text-main)" }}>
              📊 2026 Hyderabad {cat.categoryName} Market Benchmarks
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              fontSize: "12.5px",
            }}>
              <div>
                <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Compensation</strong>
                <span>{cat.benchmarks.typicalStipend}</span>
              </div>
              <div>
                <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Target Experience</strong>
                <span>{cat.benchmarks.duration}</span>
              </div>
              <div>
                <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Key Hubs</strong>
                <span>{cat.benchmarks.topLocations}</span>
              </div>
              <div>
                <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>In-Demand Skills</strong>
                <span>{cat.benchmarks.popularSkills}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Category Navigation */}
        <div className="fresher-chips" style={{ marginBottom: 20 }}>
          <Link
            href="/jobs/fresher"
            className="fresher-chip"
            style={{ textDecoration: "none" }}
          >
            All Fresher Roles
          </Link>
          {FRESHER_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/jobs/fresher/${c.slug}`}
              className={`fresher-chip${c.slug === slug ? " is-active" : ""}`}
              style={{ textDecoration: "none" }}
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
