import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import JobsBreadcrumbs from "../components/JobsBreadcrumbs.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { getSiteUrl } from "../../lib/site-url.js";
import { TELANGANA_COLLEGES } from "../../lib/colleges.js";
import { breadcrumbJsonLd } from "../../lib/jobs-seo.js";

export const metadata = {
  title: "Hyderabad Engineering College Placements 2026 (NIRF & Campus Reports) | Mapping HYD",
  description:
    "Compare verified campus placements, median packages, and top recruiters across Hyderabad engineering colleges: CBIT, VNR VJIET, Vasavi, JNTU-H, IIIT Hyderabad, IIT Hyderabad, and GRIET.",
  alternates: { canonical: `${getSiteUrl()}/colleges` },
  openGraph: {
    title: "Hyderabad Engineering College Placements 2026 | Mapping HYD",
    description:
      "Verified placement statistics, median salaries (₹5.8L to ₹32L+), top product recruiters, and alumni startups across Hyderabad engineering colleges.",
    url: `${getSiteUrl()}/colleges`,
    type: "website",
  },
};

export default function CollegesIndexPage() {
  const breadcrumbs = [
    { name: "Hyderabad Startup Map", href: "/" },
    { name: "College Placements" },
  ];

  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Hyderabad Engineering College Placements",
      numberOfItems: TELANGANA_COLLEGES.length,
      itemListElement: TELANGANA_COLLEGES.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        url: `${getSiteUrl()}/colleges/${c.slug}`,
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
          <p className="story-kicker">Ecosystem Data &amp; NIRF Benchmarks</p>
          <h1>Hyderabad Engineering College Placements (2026 Report)</h1>
          <p className="jobs-intro">
            Comprehensive placement comparison across top engineering institutions in Hyderabad and Telangana.
            Includes NIRF-verified placement percentages, median CTC, highest packages, and top product/GCC recruiters.
          </p>
        </div>

        {/* Comparison Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", margin: "24px 0" }}>
          {TELANGANA_COLLEGES.map((col) => (
            <div
              key={col.slug}
              style={{
                border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.1))",
                borderRadius: "14px",
                padding: "20px",
                background: "var(--bg-card, rgba(255, 255, 255, 0.7))",
                backdropFilter: "blur(10px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                  <h2 style={{ fontSize: "16px", margin: 0 }}>
                    <Link href={`/colleges/${col.slug}`} style={{ color: "var(--text-main)", textDecoration: "none" }}>
                      {col.shortName}
                    </Link>
                  </h2>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
                    Est. {col.established}
                  </span>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: "12px", color: "var(--accent-primary, #ff5722)", fontWeight: 600 }}>
                  {col.tier} · {col.location}
                </p>
                <p style={{ margin: "0 0 14px", fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  {col.overview}
                </p>

                {/* Placement Stats Ribbon */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.03)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                    fontSize: "12px",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>Median CTC</span>
                    <strong style={{ color: "#059669", fontSize: "13.5px" }}>{col.stats.medianCTC}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>Placement %</span>
                    <strong>{col.stats.placementRate}</strong>
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>Highest Offer</span>
                    <strong>{col.stats.highestCTC}</strong>
                  </div>
                </div>

                {/* Top Recruiters */}
                <div style={{ fontSize: "12px", marginBottom: "14px" }}>
                  <strong style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Top Recruiters: </strong>
                  <span>{col.topRecruiters.slice(0, 5).join(", ")} +more</span>
                </div>
              </div>

              <Link
                href={`/colleges/${col.slug}`}
                style={{
                  display: "inline-block",
                  textAlign: "center",
                  padding: "8px 14px",
                  background: "var(--bg-glass, rgba(0,0,0,0.05))",
                  border: "1px solid var(--border-glass, #cbd5e1)",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  textDecoration: "none",
                }}
              >
                View Full Placement Report &amp; Recruiter Jobs →
              </Link>
            </div>
          ))}
        </div>

        {/* Context & Next Steps */}
        <section className="industry-section" style={{ marginTop: 32 }}>
          <h2>Hyderabad Tech Placement Landscape (2026)</h2>
          <p className="industry-section-sub">
            Over 80,000 engineering and computer science graduates compete in Hyderabad each year across on-campus
            and off-campus pipelines. While Tier-1 research institutions (IIIT-H, IIT-H) command median offers above
            ₹20 LPA, top autonomous colleges (VNR, CBIT, Vasavi, JNTU) average ₹5.8L – ₹6.5L median CTC with substantial
            product startup intake.
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <Link href="/stories/hyderabad-fresher-tech-hiring-guide-2026" className="op-primary" style={{ textDecoration: "none", padding: "8px 16px", borderRadius: "6px" }}>
              Read 2026 Fresher Hiring Blueprint →
            </Link>
            <Link href="/jobs/fresher" style={{ textDecoration: "none", padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-glass)" }}>
              Explore Live Fresher Jobs →
            </Link>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
