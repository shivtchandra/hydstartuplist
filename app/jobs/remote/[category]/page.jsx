import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../../components/JobsBreadcrumbs.jsx";
import RemoteJobsList from "../../../components/RemoteJobsList.jsx";
import { getRemoteJobs } from "../../../../lib/jobs.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import {
  REMOTE_CATEGORIES,
  remoteCategoryBySlug,
  filterRemoteJobsByCategory,
} from "../../../../lib/remote-seo.js";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  thinListingRobots,
  REMOTE_JOBS_LANDING,
} from "../../../../lib/jobs-seo.js";

export const revalidate = 604800;

export async function generateStaticParams() {
  return REMOTE_CATEGORIES.map((cat) => ({
    category: cat.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  const cat = remoteCategoryBySlug(slug);
  if (!cat) return {};

  const allJobs = await getRemoteJobs();
  const jobs = filterRemoteJobsByCategory(allJobs, slug);
  const title = `${cat.metaTitle || cat.title} (${jobs.length} Active Roles)`;
  const url = `${getSiteUrl()}/jobs/remote/${cat.slug}`;

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
      `remote ${cat.categoryName.toLowerCase()} jobs india`,
      `work from home ${cat.categoryName.toLowerCase()} jobs`,
      "remote tech jobs india",
      "remote startup hiring india",
    ],
  };
}

export default async function RemoteCategoryPage({ params }) {
  const { category: slug } = await params;
  const cat = remoteCategoryBySlug(slug);
  if (!cat) notFound();

  const allJobs = await getRemoteJobs();
  const jobs = filterRemoteJobsByCategory(allJobs, slug);

  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: "Remote", href: "/jobs/remote" },
    { name: cat.categoryName },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (cat.faq || []).map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    itemListJsonLd(jobs, cat.title),
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
          <h1>{cat.headline || cat.title}</h1>
          <p className="jobs-intro">{cat.subheading || cat.description}</p>
          <p className="form-sub">
            {`${jobs.length} verified remote opening${
              jobs.length === 1 ? "" : "s"
            } active right now. Direct company ATS links.`}
          </p>
        </div>

        {/* Remote Category Chips */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            Filter Remote Specialization
          </p>
          <div className="fresher-chips">
            <Link href="/jobs/remote" className="fresher-chip">
              All Remote Roles
            </Link>
            {REMOTE_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/jobs/remote/${c.slug}`}
                className={`fresher-chip${c.slug === cat.slug ? " is-active" : ""}`}
              >
                {c.categoryName}
              </Link>
            ))}
          </div>
        </div>

        {/* Role Benchmarks Card */}
        {cat.benchmarks && (
          <div
            style={{
              padding: "16px 20px",
              background: "var(--bg-subtle, #f9fafb)",
              border: "1px solid var(--border-color, #e5e7eb)",
              borderRadius: "12px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            {cat.benchmarks.typicalSalary && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", margin: "0 0 4px" }}>
                  Typical Salary
                </p>
                <strong style={{ fontSize: "14px", color: "#059669" }}>
                  {cat.benchmarks.typicalSalary}
                </strong>
              </div>
            )}
            {cat.benchmarks.typicalStipend && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", margin: "0 0 4px" }}>
                  Typical Stipend
                </p>
                <strong style={{ fontSize: "14px", color: "#059669" }}>
                  {cat.benchmarks.typicalStipend}
                </strong>
              </div>
            )}
            {cat.benchmarks.experienceBands && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", margin: "0 0 4px" }}>
                  Experience Bands
                </p>
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                  {cat.benchmarks.experienceBands}
                </span>
              </div>
            )}
            {cat.benchmarks.popularTech && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", margin: "0 0 4px" }}>
                  In-Demand Stack
                </p>
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                  {cat.benchmarks.popularTech}
                </span>
              </div>
            )}
          </div>
        )}

        {jobs.length ? (
          <RemoteJobsList jobs={jobs} />
        ) : (
          <div className="fresher-empty">
            <p className="form-sub">
              No live roles in this specific track right now. Check{" "}
              <Link href="/jobs/remote">all remote jobs</Link> or the full{" "}
              <Link href="/jobs">jobs board</Link>.
            </p>
          </div>
        )}

        {cat.faq && cat.faq.length > 0 && (
          <section className="industry-section" aria-label="FAQ" style={{ marginTop: 32 }}>
            <h2>Frequently Asked Questions</h2>
            {cat.faq.map((f, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <p className="industry-section-sub">
                  <strong>{f.question}</strong> {f.answer}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
