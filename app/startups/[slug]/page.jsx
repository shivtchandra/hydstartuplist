import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import StartupLogo from "../../components/StartupLogo.jsx";
import { getStartupBySlug, getApproved, visibleHiring } from "../../../lib/store.js";
import { startupSlug } from "../../../lib/slug.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import {
  colorFor,
  prettyName,
  careersUrl,
  faviconUrl,
  normalizeArea,
  relatedStartups,
} from "../../../lib/startupUi.js";
import { featuredPinIdSetAsync } from "../../../lib/placements.js";
import { cleanCompanyDescription, fundingLabel } from "../../../lib/company-quality.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const startup = await getStartupBySlug(params.slug);
  if (!startup) return { title: "Startup not found" };

  const name = prettyName(startup.name);
  const cleanDesc = cleanCompanyDescription(startup.descriptionLong || startup.description || "");
  const stage = fundingLabel(startup.fundingStage);
  const title = `${name} – ${startup.sector} Startup in ${startup.area || "Hyderabad"}`;
  const description =
    cleanDesc ||
    `${name} is a ${stage} ${startup.sector} startup based in ${startup.area || "Hyderabad"}.`;
  const url = `${getSiteUrl()}/startups/${params.slug}`;
  const image = faviconUrl(startup.website) || `${getSiteUrl()}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: image, alt: `${name} logo` }],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function directionsUrl(address, lat, lng) {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

function orgJsonLd(startup, slug, sponsored) {
  const site = getSiteUrl();
  const hiring = visibleHiring(startup);
  const cleanDesc = cleanCompanyDescription(startup.descriptionLong || startup.description || "");
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}/startups/${slug}#organization`,
    name: prettyName(startup.name),
    url: startup.website || `${site}/startups/${slug}`,
    description: cleanDesc || undefined,
    keywords: startup.services?.length ? startup.services.join(", ") : undefined,
    foundingDate: startup.founded ? String(startup.founded) : undefined,
    address: startup.address
      ? {
          "@type": "PostalAddress",
          streetAddress: startup.address,
          addressLocality: startup.area || "Hyderabad",
          addressRegion: "Telangana",
          addressCountry: "IN",
        }
      : undefined,
    areaServed: startup.area || "Hyderabad",
    sameAs: startup.website ? [startup.website] : undefined,
    jobPosting: hiring?.roles?.slice(0, 5).map((r) => ({
      "@type": "JobPosting",
      title: r.title,
      url: r.url,
      hiringOrganization: { "@type": "Organization", name: prettyName(startup.name) },
    })),
  };
  if (sponsored) data.additionalProperty = { "@type": "PropertyValue", name: "featured", value: true };
  return data;
}

function faqItems(startup) {
  const name = prettyName(startup.name);
  const place = startup.area || "Hyderabad";
  const hiring = visibleHiring(startup);
  const cleanDesc = cleanCompanyDescription(startup.descriptionLong || startup.description || "");
  const stage = fundingLabel(startup.fundingStage);
  const items = [];

  if (cleanDesc) {
    items.push({ q: `What does ${name} do?`, a: cleanDesc });
  }
  items.push({
    q: `Where is ${name} located?`,
    a: startup.address
      ? `${name} is based at ${startup.address}.`
      : `${name} is located in ${place}.`,
  });
  if (startup.founded) {
    items.push({ q: `When was ${name} founded?`, a: `${name} was founded in ${startup.founded}.` });
  }
  items.push({
    q: `What sector is ${name} in?`,
    a: `${name} operates in ${startup.sector}${
      stage && stage !== "Not disclosed" ? ` and is at the ${stage} stage` : ""
    }.`,
  });
  items.push({
    q: `Is ${name} hiring?`,
    a: hiring?.roles?.length
      ? `Yes, ${name} currently has ${hiring.count || hiring.roles.length} open role${
          (hiring.count || hiring.roles.length) === 1 ? "" : "s"
        } listed. Explore the open roles directly on this page.`
      : `There are no verified openings for ${name} right now. Check back soon or visit their careers page.`,
  });
  return items;
}

function faqJsonLd(startup) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems(startup).map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export default async function StartupDetailPage({ params }) {
  const startup = await getStartupBySlug(params.slug);
  if (!startup) notFound();

  const hiring = visibleHiring(startup);
  const sponsored = (await featuredPinIdSetAsync()).has(startup.id) || startup.sponsored === true;
  const careers = startup.careers || careersUrl(startup.website);
  const maps = directionsUrl(startup.address, startup.lat, startup.lng);
  const slug = startupSlug(startup);
  const jsonLd = orgJsonLd(startup, slug, sponsored);
  const faqLd = faqJsonLd(startup);
  const faqs = faqItems(startup);
  const about = cleanCompanyDescription(startup.descriptionLong || startup.description || "");
  const services = Array.isArray(startup.services) ? startup.services.slice(0, 8) : [];
  const stage = fundingLabel(startup.fundingStage);
  const sectorColor = colorFor(startup.sector);
  const openRolesCount = hiring?.count || hiring?.roles?.length || 0;
  const related = relatedStartups(startup, await getApproved(), 6);

  return (
    <div className="page-with-nav startup-page-wrap" style={{ "--sector-color": sectorColor }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <SiteNav />

      <main className="startup-sheet-container" id="main-content">
        <div className="startup-sheet">
          {/* Top navigation row */}
          <nav className="startup-sheet-nav" aria-label="Breadcrumbs">
            <Link href="/" className="startup-nav-link startup-back-link">
              <span aria-hidden="true">←</span> Back to map
            </Link>
            <div className="startup-nav-actions">
              <Link href={`/jobs/company/${slug}`} className="startup-nav-link startup-roles-link">
                {openRolesCount > 0 ? (
                  <span className="startup-open-pill">
                    <span className="startup-pulse-dot" />
                    {openRolesCount} open role{openRolesCount === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span>Browse jobs →</span>
                )}
              </Link>
            </div>
          </nav>

          {/* Hero header block */}
          <header className="startup-hero-card">
            <div className="startup-hero-top">
              <div className="startup-hero-logo-frame">
                <StartupLogo
                  name={startup.name}
                  website={startup.website}
                  logoUrl={startup.logoUrl}
                  sector={startup.sector}
                  size={68}
                />
              </div>

              <div className="startup-hero-main">
                <div className="startup-hero-title-row">
                  <h1 className="startup-hero-title">
                    {prettyName(startup.name)}
                  </h1>
                  {sponsored && <span className="sponsored-badge">Sponsored</span>}
                </div>

                <div className="startup-hero-meta-strip">
                  <span className="startup-sector-badge" style={{ borderColor: sectorColor, color: sectorColor }}>
                    {startup.sector}
                  </span>
                  {startup.area && (
                    <span className="startup-area-pill">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      {startup.area}
                    </span>
                  )}
                  {stage && stage !== "Not disclosed" && (
                    <span className="startup-stage-pill">{stage}</span>
                  )}
                  {hiring && (
                    <span className="startup-hiring-badge">
                      <span className="hiring-dot" />
                      Hiring now
                    </span>
                  )}
                </div>

                {startup.oneLiner && (
                  <p className="startup-hero-oneliner">{startup.oneLiner}</p>
                )}
              </div>
            </div>

            {/* Hero Quick Action Bar */}
            <div className="startup-hero-ctas">
              {startup.website && (
                <a className="btn startup-cta-btn" href={startup.website} target="_blank" rel="noopener noreferrer">
                  Visit website <span aria-hidden="true">↗</span>
                </a>
              )}
              {careers && (
                <a className="btn btn-ghost startup-ghost-btn" href={careers} target="_blank" rel="noopener noreferrer">
                  Careers page <span aria-hidden="true">↗</span>
                </a>
              )}
              {maps && (
                <a className="btn btn-ghost startup-ghost-btn" href={maps} target="_blank" rel="noopener noreferrer">
                  Get directions <span aria-hidden="true">↗</span>
                </a>
              )}
              <Link className="startup-claim-link" href={`/submit?claim=${startup.id}&name=${encodeURIComponent(startup.name)}`}>
                Claim listing
              </Link>
            </div>
          </header>

          {/* Key Facts Metric Row */}
          <section className="startup-facts-row" aria-label="Company Overview">
            <div className="startup-fact-card">
              <span className="fact-label">Funding Stage</span>
              <strong className="fact-value">{stage || "Not disclosed"}</strong>
            </div>
            <div className="startup-fact-card">
              <span className="fact-label">Sector</span>
              <strong className="fact-value" style={{ color: sectorColor }}>{startup.sector}</strong>
            </div>
            <div className="startup-fact-card">
              <span className="fact-label">Location</span>
              <strong className="fact-value">{startup.area || "Hyderabad"}</strong>
            </div>
            {startup.founded && (
              <div className="startup-fact-card">
                <span className="fact-label">Founded</span>
                <strong className="fact-value">{startup.founded}</strong>
              </div>
            )}
          </section>

          {/* About Section */}
          {about && (
            <section className="startup-card-section">
              <h2 className="startup-card-title">About {prettyName(startup.name)}</h2>
              <p className="startup-card-desc">{about}</p>
              {services.length > 0 && (
                <div className="startup-tags-cloud">
                  {services.map((s) => (
                    <span key={s} className="startup-chip">{s}</span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Open Roles Section */}
          {hiring?.roles?.length > 0 && (
            <section className="startup-card-section">
              <div className="startup-section-header-flex">
                <h2 className="startup-card-title">Open roles ({hiring.roles.length})</h2>
                <Link className="startup-view-all-link" href={`/jobs/company/${slug}`}>
                  View company jobs →
                </Link>
              </div>
              <div className="startup-roles-grid">
                {hiring.roles.map((r, i) => (
                  <a
                    key={r.url || i}
                    className="startup-role-item"
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="startup-role-info">
                      <span className="startup-role-name">{r.title}</span>
                      <span className="startup-role-sub">{startup.area || "Hyderabad"}</span>
                    </div>
                    <span className="startup-role-apply">Apply ↗</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Office Address & Directions */}
          {(startup.address || startup.area) && (
            <section className="startup-card-section startup-office-section">
              <div className="startup-office-body">
                <div>
                  <h2 className="startup-card-title">Office & Location</h2>
                  <p className="startup-address-text">{startup.address || startup.area}</p>
                </div>
                {maps && (
                  <a className="btn btn-ghost startup-directions-btn" href={maps} target="_blank" rel="noopener noreferrer">
                    Get directions ↗
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Latest news if available */}
          {startup.news?.[0] && (
            <section className="startup-card-section">
              <h2 className="startup-card-title">Latest news</h2>
              <a className="modal-news" href={startup.news[0].url} target="_blank" rel="noopener noreferrer">
                <span aria-hidden="true">📰</span> {startup.news[0].title}
              </a>
            </section>
          )}

          {/* Frequently Asked Questions */}
          {faqs.length > 0 && (
            <section className="startup-card-section">
              <h2 className="startup-card-title">Frequently asked questions</h2>
              <div className="startup-faq-list">
                {faqs.map((it) => (
                  <details key={it.q} className="startup-faq-accordion" open={it.q.startsWith("What does")}>
                    <summary className="startup-faq-summary">
                      <span>{it.q}</span>
                      <svg className="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                    </summary>
                    <p className="startup-faq-answer">{it.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Related startups chips */}
          {related.length > 0 && (
            <section className="startup-card-section">
              <h2 className="startup-card-title">Similar startups in Hyderabad</h2>
              <div className="startup-related-grid">
                {related.map((r) => (
                  <Link key={r.id} className="startup-related-card" href={`/startups/${startupSlug(r)}`}>
                    <div className="startup-related-name">{prettyName(r.name)}</div>
                    <div className="startup-related-sub">
                      <span className="startup-related-dot" style={{ background: colorFor(r.sector) }} />
                      {r.sector} · {normalizeArea(r.area)}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
