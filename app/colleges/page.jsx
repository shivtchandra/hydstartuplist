import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import JobsBreadcrumbs from "../components/JobsBreadcrumbs.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { getSiteUrl } from "../../lib/site-url.js";
import { TELANGANA_COLLEGES } from "../../lib/colleges.js";
import { breadcrumbJsonLd } from "../../lib/jobs-seo.js";

export const metadata = {
  title: "Hyderabad Engineering College Placements 2026 (NIRF & Campus Reports)",
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
        <div className="colleges-directory-grid">
          {TELANGANA_COLLEGES.map((col) => (
            <div key={col.slug} className="college-item-card">
              <div>
                <div className="college-card-head">
                  <h2 className="college-card-title">
                    <Link href={`/colleges/${col.slug}`}>
                      {col.shortName}
                    </Link>
                  </h2>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Est. {col.established}
                  </span>
                </div>
                <p className="college-card-meta">
                  {col.tier} · {col.location}
                </p>
                <p className="college-card-desc">
                  {col.overview}
                </p>

                {/* Placement Stats Ribbon */}
                <div className="college-stat-bar">
                  <div className="college-stat-col">
                    <span>Median CTC</span>
                    <strong className="green">{col.stats.medianCTC}</strong>
                  </div>
                  <div className="college-stat-col">
                    <span>Placement %</span>
                    <strong>{col.stats.placementRate}</strong>
                  </div>
                  <div className="college-stat-col">
                    <span>Highest</span>
                    <strong>{col.stats.highestCTC}</strong>
                  </div>
                </div>

                {/* Top Recruiters */}
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "14px" }}>
                  <strong style={{ textTransform: "uppercase", fontSize: "10.5px" }}>Recruiters: </strong>
                  <span>{col.topRecruiters.slice(0, 4).join(", ")} +more</span>
                </div>
              </div>

              <Link href={`/colleges/${col.slug}`} className="college-pill-btn">
                View Campus Report &amp; Jobs →
              </Link>
            </div>
          ))}
        </div>

        {/* Context & Next Steps */}
        <section className="industry-section" style={{ marginTop: 24 }}>
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
