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

  const title = `${college.name} Placements 2026 – Median CTC & Top Recruiters`;
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

  const allJobs = await getAllJobs();
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
        <div className="fresher-tool-card" style={{ margin: "20px 0 28px" }}>
          <p className="fresher-tool-kicker">Verified Disclosures (2024–2026)</p>
          <div className="fresher-metric-grid" style={{ marginBottom: 0 }}>
            <div className="fresher-metric-cell">
              <span className="fresher-metric-lbl">Median CTC</span>
              <span className="fresher-metric-num emerald">{college.stats.medianCTC}</span>
            </div>
            <div className="fresher-metric-cell">
              <span className="fresher-metric-lbl">Placement Rate</span>
              <span className="fresher-metric-num">{college.stats.placementRate}</span>
            </div>
            <div className="fresher-metric-cell">
              <span className="fresher-metric-lbl">Highest Offer</span>
              <span className="fresher-metric-num">{college.stats.highestCTC}</span>
            </div>
            <div className="fresher-metric-cell">
              <span className="fresher-metric-lbl">Total Offers</span>
              <span className="fresher-metric-num">{college.stats.totalOffers}</span>
            </div>
            <div className="fresher-metric-cell">
              <span className="fresher-metric-lbl">Graduating Batch</span>
              <span className="fresher-metric-num">{college.stats.placedCount} / {college.stats.batchSize}</span>
            </div>
          </div>
        </div>

        {/* Verified LPA Salary Distribution & Selection Breakdown */}
        {college.salaryDistribution && college.salaryDistribution.length > 0 && (
          <div className="fresher-tool-card" style={{ marginBottom: "28px" }}>
            <div className="fresher-tool-header">
              <span className="fresher-tool-kicker">Placement Ground Reality</span>
              <h2 className="fresher-tool-title">LPA Salary Distribution &amp; Selection Volume ({college.stats.batchSize} Batch)</h2>
              <p className="fresher-tool-sub">
                Actual student selection count, percentage distribution across CTC tiers, and confirmed hiring employers.
              </p>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid var(--border-glass, #e2e8f0)", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>CTC Bracket</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Selections</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Batch Share</th>
                    <th style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hiring Companies</th>
                  </tr>
                </thead>
                <tbody>
                  {college.salaryDistribution.map((tier, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-glass, #e2e8f0)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: tier.lpaBand.includes(">") ? "#059669" : "var(--text-main)" }}>
                        {tier.lpaBand}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "12.5px" }}>
                        <strong style={{ display: "block" }}>{tier.category}</strong>
                        <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{tier.description}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                        {tier.studentCount ? `~${tier.studentCount} students` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          background: tier.percentage.startsWith("0") || tier.percentage.startsWith("1.") || tier.percentage.startsWith("2.") || tier.percentage.startsWith("3.") || tier.percentage.startsWith("4.") || tier.percentage.startsWith("5.") || tier.percentage.startsWith("6.") ? "rgba(16, 185, 129, 0.1)" : "rgba(0,0,0,0.05)",
                          color: tier.percentage.startsWith("0") || tier.percentage.startsWith("1.") || tier.percentage.startsWith("2.") || tier.percentage.startsWith("3.") || tier.percentage.startsWith("4.") || tier.percentage.startsWith("5.") || tier.percentage.startsWith("6.") ? "#059669" : "var(--text-main)",
                        }}>
                          {tier.percentage}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "12px", color: "var(--text-muted)" }}>
                        {tier.companies}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Recruiters & Alumni Startups */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "28px" }}>
          <div className="fresher-tool-card" style={{ padding: "18px 20px" }}>
            <h3 style={{ fontSize: "14px", margin: "0 0 10px", color: "var(--text-main)" }}>Recurring Recruiters</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {college.topRecruiters.map((r) => (
                <span
                  key={r}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--bg-glass, rgba(0,0,0,0.04))",
                    border: "1px solid var(--border-glass, #e2e8f0)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="fresher-tool-card" style={{ padding: "18px 20px" }}>
            <h3 style={{ fontSize: "14px", margin: "0 0 10px", color: "var(--text-main)" }}>Connected Alumni Startups</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {college.alumniStartups.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "var(--radius-full)",
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
