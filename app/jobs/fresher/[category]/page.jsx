import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import FresherAlertCta from "../../../components/FresherAlertCta.jsx";
import FresherJobsList from "../../../components/FresherJobsList.jsx";
import VerificationNote from "../../../components/VerificationNote.jsx";
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

// This app redeploys multiple times a day, which already resets the ISR
// cache — see app/jobs/company/[slug]/page.jsx.
export const revalidate = 604800;

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
  const employers = new Set(jobs.map((job) => job.company).filter(Boolean));
  const locationCounts = new Map();
  for (const job of jobs) {
    const location = String(job.location || "Hyderabad").split(",")[0].trim();
    if (location) locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
  }
  const topLocations = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
  const latestTimestamp = jobs.map((job) => Date.parse(job.postedAt || job.sourcePostedAt || job.fetchedAt || "")).filter(Number.isFinite).sort((a, b) => b - a)[0];
  const updatedAt = latestTimestamp ? new Date(latestTimestamp).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const compensationDisclosed = jobs.filter((job) => job.salary || job.salaryMin || job.salaryMax).length;

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
          {jobs.length > 0 && <p className="jobs-intro">
            {`${jobs.length} ${cat.categoryName} opening${jobs.length === 1 ? " is" : "s are"} live in Hyderabad right now at ${new Set(jobs.map((j) => j.company).filter(Boolean)).size} companies — all intern or entry-level roles open to freshers and recent graduates.`}
          </p>}
          <p className="jobs-intro">{cat.subheading}</p>
          <p className="form-sub">
            {`${jobs.length} current role${jobs.length === 1 ? "" : "s"} across ${employers.size} employer${employers.size === 1 ? "" : "s"}. `}
            <Link href="/jobs/fresher">View all fresher roles →</Link>
          </p>
          <VerificationNote updatedAt={updatedAt} />
        </div>

        <section className="fresher-tool-card" style={{ marginBottom: 24 }} aria-label={`${cat.categoryName} live listing snapshot`}>
          <div className="fresher-tool-header">
            <span className="fresher-tool-kicker">Live listing snapshot</span>
            <h2 className="fresher-tool-title">Current {cat.categoryName} opportunities</h2>
            <p className="fresher-tool-sub">These figures are calculated from the current listings shown on this page, not market estimates.</p>
          </div>
          <div className="fresher-metric-board">
            <div className="fresher-metric-grid">
              <div className="fresher-metric-cell"><span className="fresher-metric-lbl">Current roles</span><span className="fresher-metric-num">{jobs.length}</span><span className="fresher-metric-sub">Matching listings</span></div>
              <div className="fresher-metric-cell"><span className="fresher-metric-lbl">Employers</span><span className="fresher-metric-num">{employers.size}</span><span className="fresher-metric-sub">Distinct companies</span></div>
              <div className="fresher-metric-cell"><span className="fresher-metric-lbl">Top locations</span><span className="fresher-metric-num" style={{ fontSize: "16px" }}>{topLocations.join(", ") || "Hyderabad"}</span><span className="fresher-metric-sub">From current listings</span></div>
              <div className="fresher-metric-cell"><span className="fresher-metric-lbl">Pay disclosed</span><span className="fresher-metric-num">{compensationDisclosed}</span><span className="fresher-metric-sub">Listings with employer pay data</span></div>
            </div>
          </div>
        </section>

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
