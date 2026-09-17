import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import JobsBreadcrumbs from "../../components/JobsBreadcrumbs.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import FresherJobsList from "../../components/FresherJobsList.jsx";
import { getSiteUrl } from "../../../lib/site-url.js";
import { TELANGANA_COLLEGES, getCollegeBySlug } from "../../../lib/colleges.js";
import { getAllJobs } from "../../../lib/jobs.js";
import { breadcrumbJsonLd } from "../../../lib/jobs-seo.js";

export const revalidate = 1800;

export async function generateStaticParams() {
  return TELANGANA_COLLEGES.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const college = getCollegeBySlug(slug);
  if (!college) return {};

  const title = `${college.name} Placements 2026 – Median CTC & Top Recruiters | Mapping HYD`;
  const url = `${getSiteUrl()}/colleges/${college.slug}`;

  return {
    title,
    description: `${college.name} placement statistics: median package ${college.stats.medianCTC}, highest offer ${college.stats.highestCTC}, ${college.stats.placementRate} placement rate, top recruiters (${college.topRecruiters.slice(0, 5).join(", ")}), and live startup jobs.`,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: college.overview,
      url,
      type: "website",
    },
    keywords: [
      `${college.shortName.toLowerCase()} placements 2026`,
      `${college.shortName.toLowerCase()} median package`,
      `${college.shortName.toLowerCase()} highest package`,
      `${college.shortName.toLowerCase()} recruiters`,
      "hyderabad engineering placements",
    ],
  };
}

export default async function CollegeDetailPage({ params }) {
  const { slug } = await params;
  const college = getCollegeBySlug(slug);
  if (!college) notFound();

  // Load live jobs and match against college's recruiters
  const allJobs = await getAllJobs();
  const recruiterNames = new Set(college.topRecruiters.map((r) => r.toLowerCase()));
  const matchingRecruiterJobs = allJobs.filter((j) => {
    const co = String(j.company || "").toLowerCase();
    return college.topRecruiters.some((r) => co.includes(r.toLowerCase()) || r.toLowerCase().includes(co));
  });

  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "Colleges", href: "/colleges" },
    { name: college.shortName },
  ];

  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: college.name,
      alternateName: college.shortName,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Hyderabad",
        addressRegion: "Telangana",
        addressCountry: "IN",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: college.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
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
      <SiteNav active="colleges" />
      <div className="feed-page">
        <JobsBreadcrumbs items={breadcrumbs} />

        <div className="feed-head">
          <p className="story-kicker">{college.tier} · Est. {college.established}</p>
          <h1>{college.name} Placements (2026)</h1>
          <p className="jobs-intro">{college.overview}</p>
          <p className="form-sub">
            {college.location} · {college.nirfRankBand}
          </p>
        </div>

        {/* Highlight Stats Ribbon */}
        <div
          style={{
            background: "var(--bg-card, rgba(255, 255, 255, 0.75))",
            border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.1))",
            borderRadius: "14px",
            padding: "20px 24px",
            margin: "20px 0 28px",
            backdropFilter: "blur(10px)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 14px", color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            📊 Verified Placement Disclosures (2024–2026)
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Median CTC</span>
              <strong style={{ fontSize: "20px", color: "#059669" }}>{college.stats.medianCTC}</strong>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Placement Rate</span>
              <strong style={{ fontSize: "20px", color: "var(--text-main)" }}>{college.stats.placementRate}</strong>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Highest Offer</span>
              <strong style={{ fontSize: "20px", color: "var(--text-main)" }}>{college.stats.highestCTC}</strong>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Offers</span>
              <strong style={{ fontSize: "20px", color: "var(--text-main)" }}>{college.stats.totalOffers}</strong>
            </div>
            <div>
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Placed Students</span>
              <strong style={{ fontSize: "20px", color: "var(--text-main)" }}>{college.stats.placedCount} / {college.stats.batchSize}</strong>
            </div>
          </div>
        </div>

        {/* Top Recruiters & Alumni Startups */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px", marginBottom: "28px" }}>
          <div style={{ border: "1px solid var(--border-glass)", borderRadius: "10px", padding: "16px", background: "var(--bg-card)" }}>
            <h3 style={{ fontSize: "14.5px", margin: "0 0 10px" }}>🏢 Top Recurring Recruiters</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {college.topRecruiters.map((r) => (
                <span
                  key={r}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "100px",
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid var(--border-glass)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid var(--border-glass)", borderRadius: "10px", padding: "16px", background: "var(--bg-card)" }}>
            <h3 style={{ fontSize: "14.5px", margin: "0 0 10px" }}>🚀 Connected Alumni Startups</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {college.alumniStartups.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "100px",
                    background: "var(--accent-soft, rgba(255, 87, 34, 0.1))",
                    color: "var(--accent-primary, #ff5722)",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Live Matching Openings */}
        {matchingRecruiterJobs.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2>Live Jobs at {college.shortName} Recruiters ({matchingRecruiterJobs.length} Openings)</h2>
            <p className="jobs-intro" style={{ marginBottom: 16 }}>
              Direct verified openings from companies that actively recruit from {college.shortName} campus:
            </p>
            <FresherJobsList jobs={matchingRecruiterJobs} />
          </div>
        )}

        {/* FAQ Section */}
        {college.faq && college.faq.length > 0 && (
          <section className="industry-section" aria-label="FAQ" style={{ marginTop: 32 }}>
            <h2>Frequently Asked Questions</h2>
            {college.faq.map((item, idx) => (
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
      <SiteFooter />
    </div>
  );
}
