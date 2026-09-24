import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import StartupLogo from "../../components/StartupLogo.jsx";
import { TECH_PARKS, techParkLanding, getTechParkPage } from "../../../lib/parks.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import { prettyName } from "../../../lib/startupUi.js";
import { jobUrlId } from "../../../lib/jobs-seo.js";

export const revalidate = 86400;

export function generateStaticParams() {
  return TECH_PARKS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const landing = techParkLanding(params.slug);
  if (!landing) return { title: "Tech park not found" };
  const data = await getTechParkPage(params.slug);
  const count = data?.count ?? 0;
  const title = `${landing.title} (${count} Companies)`;
  const url = `${getSiteUrl()}/parks/${params.slug}`;
  return {
    title,
    description: landing.description,
    alternates: { canonical: url },
    openGraph: { title, description: landing.description, url, type: "website" },
    keywords: [
      `companies in ${landing.name.toLowerCase()}`,
      `${landing.name.toLowerCase()} companies list`,
      `${landing.name.toLowerCase()} hyderabad`,
      `${landing.name.toLowerCase()} it companies`,
      `software companies in ${landing.name.toLowerCase()}`,
      "hyderabad tech parks",
      "hyderabad startup map",
    ],
  };
}

export default async function TechParkDetailPage({ params }) {
  const data = await getTechParkPage(params.slug);
  if (!data) notFound();

  const { park, count, hiringCount, jobsCount, topSectors, startups, jobs } = data;
  const others = TECH_PARKS.filter((p) => p.slug !== park.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: park.name,
    description: park.overview,
    address: {
      "@type": "PostalAddress",
      addressLocality: park.area,
      addressRegion: "Telangana",
      addressCountry: "IN",
    },
    url: `${getSiteUrl()}/parks/${park.slug}`,
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Companies in ${park.name}, Hyderabad`,
    numberOfItems: startups.length,
    itemListElement: startups.slice(0, 30).map((s, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: prettyName(s.name),
      url: `${getSiteUrl()}/startups/${s.slug}`,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What companies are located in ${park.name}, Hyderabad?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Key tech employers and startups in ${park.name} include ${park.keyTenants.join(", ")} and ${count} mapped companies on Mapping HYD.`,
        },
      },
      {
        "@type": "Question",
        name: `How do I commute to ${park.name} via public transit?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${park.transit} Nearby landmarks include ${park.landmarks}.`,
        },
      },
      {
        "@type": "Question",
        name: `Are companies in ${park.name} hiring?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes, ${hiringCount} mapped startups and tech offices in ${park.name} are actively hiring across engineering, AI, product, and operations.`,
        },
      },
    ],
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <nav className="industry-crumbs" aria-label="Breadcrumb">
          <Link href="/">Hyderabad Startup Map</Link>
          <span aria-hidden="true">/</span>
          <Link href="/parks">Tech Parks</Link>
          <span aria-hidden="true">/</span>
          <span>{park.name}</span>
        </nav>

        <header className="industry-head">
          <p className="story-kicker">{park.area} · Tech Campus</p>
          <h1>{park.name}</h1>
          <p className="industry-lead" style={{ fontWeight: 600, color: "var(--accent-text, #c2410c)" }}>
            {park.tagline}
          </p>
          <p className="industry-lead-soft">{park.overview}</p>
        </header>

        {/* Transit and Campus Guide Banner */}
        <section
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            color: "#166534",
          }}
          aria-label="Campus Transit Guide"
        >
          <h2 style={{ fontSize: "14px", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
            Commute &amp; Landmark Guide
          </h2>
          <p style={{ fontSize: "13.5px", margin: "0 0 6px", lineHeight: 1.5 }}>
            <strong>Transit &amp; Metro:</strong> {park.transit}
          </p>
          <p style={{ fontSize: "13.5px", margin: 0, lineHeight: 1.5 }}>
            <strong>Key Landmarks:</strong> {park.landmarks}
          </p>
        </section>

        <section className="industry-stat-strip" aria-label="Campus snapshot">
          <div className="industry-stat">
            <div className="industry-stat-value">{count.toLocaleString()}</div>
            <div className="industry-stat-label">Mapped companies</div>
          </div>
          <div className="industry-stat">
            <div className="industry-stat-value">{hiringCount.toLocaleString()}</div>
            <div className="industry-stat-label">Actively hiring</div>
          </div>
          <div className="industry-stat">
            <div className="industry-stat-value">{jobsCount.toLocaleString()}</div>
            <div className="industry-stat-label">Nearby roles</div>
          </div>
          <div className="industry-stat">
            <div className="industry-stat-value">{park.keyTenants.length}+</div>
            <div className="industry-stat-label">Anchor tenants</div>
          </div>
        </section>

        {/* Anchor Tenants Badges */}
        <section style={{ margin: "24px 0" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px", color: "var(--fg)" }}>
            Major Campuses &amp; Anchor Employers
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {park.keyTenants.map((tenant) => (
              <span
                key={tenant}
                style={{
                  background: "#e2e8f0",
                  color: "#1e293b",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {tenant}
              </span>
            ))}
          </div>
        </section>

        {topSectors.length > 0 && (
          <section className="industry-sectors-strip" aria-label="Top sectors">
            <h2>Dominant Sectors in {park.name}</h2>
            <div className="industry-sectors-pills">
              {topSectors.map((s) => (
                <Link key={s.slug} href={`/industries/${s.slug}`} className="industry-sector-pill">
                  <span>{s.sector}</span>
                  <span className="industry-sector-count">{s.count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="industry-list-section" aria-label="Mapped companies in campus">
          <div className="industry-list-head">
            <h2>
              Mapped Companies &amp; Startups in {park.name} ({startups.length})
            </h2>
            <p className="industry-list-sub">
              Verified startups and software companies with offices in this corridor.
            </p>
          </div>

          <div className="industry-company-grid">
            {startups.map((s) => (
              <article key={s.id || s.slug} className="industry-company-card">
                <div className="industry-company-top">
                  <div className="industry-company-brand">
                    <span className="industry-company-rank">#{s.rank}</span>
                    <StartupLogo name={s.name} website={s.website} size={28} />
                    <Link href={`/startups/${s.slug}`} className="industry-company-name">
                      {prettyName(s.name)}
                    </Link>
                  </div>
                  <div className="industry-company-badges">
                    {s.hiring && <span className="industry-badge-hiring">Hiring</span>}
                    {s.fundingStage && <span className="industry-badge-stage">{s.fundingStage}</span>}
                  </div>
                </div>

                {s.description && (
                  <p className="industry-company-desc">{s.description}</p>
                )}

                <div className="industry-company-foot">
                  {s.sector && <span className="industry-tag">{s.sector}</span>}
                  {s.area && <span className="industry-company-area">{s.area}</span>}
                  <Link href={`/startups/${s.slug}`} className="industry-company-link">
                    View Office Pin →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {jobs.length > 0 && (
          <section className="industry-jobs-section" aria-label="Live roles near park">
            <div className="industry-list-head">
              <h2>Open Roles Near {park.name}</h2>
              <p className="industry-list-sub">Live opportunities from mapped employers.</p>
            </div>
            <div className="industry-jobs-grid">
              {jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${jobUrlId(j.id)}`} className="industry-job-card">
                  <div className="industry-job-top">
                    <span className="industry-job-title">{j.title}</span>
                    <span className="industry-job-company">{j.company}</span>
                  </div>
                  <div className="industry-job-meta">
                    {j.location && <span>{j.location}</span>}
                    {j.source && <span className="industry-job-source">{j.source}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <nav className="industry-others-nav" aria-label="Other Tech Parks">
          <h2>Explore Other Hyderabad IT Parks &amp; Campuses</h2>
          <div className="industry-others-grid">
            {others.map((other) => (
              <Link key={other.slug} href={`/parks/${other.slug}`} className="industry-other-card">
                <span className="industry-other-name">{other.name}</span>
                <span className="industry-other-desc">{other.area}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
