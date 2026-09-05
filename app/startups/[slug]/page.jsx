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
  const image = faviconUrl(startup.website) || `${getSiteUrl()}/brand/og-card-v3.png`;

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

      <main className="startup-profile" id="main-content">
        <nav className="startup-crumb" aria-label="Breadcrumbs">
          <Link href="/" className="startup-nav-link">
            <span aria-hidden="true">←</span> Back to map
          </Link>
          <Link href={`/jobs/company/${slug}`} className="startup-nav-link">
            {openRolesCount > 0 ? (
              <span className="startup-open-pill">
                <span className="startup-pulse-dot" />
                {openRolesCount} open role{openRolesCount === 1 ? "" : "s"}
              </span>
            ) : (
              <span>Browse jobs →</span>
            )}
          </Link>
        </nav>

        <header className="startup-hero">
          <div className="startup-hero-identity">
            <StartupLogo
              name={startup.name}
              website={startup.website}
              logoUrl={startup.logoUrl}
              sector={startup.sector}
              size={72}
            />
            <div className="startup-hero-copy">
              <div className="startup-hero-title-row">
                <h1 className="startup-hero-title">{prettyName(startup.name)}</h1>
                {sponsored && <span className="sponsored-badge">Sponsored</span>}
              </div>
              {startup.oneLiner && (
                <p className="startup-hero-oneliner">{startup.oneLiner}</p>
              )}
              <p className="startup-hero-meta">
                <span>{startup.sector}</span>
                {startup.area && <><span className="startup-meta-sep" aria-hidden="true">·</span><span>{startup.area}</span></>}
                {stage && stage !== "Not disclosed" && <><span className="startup-meta-sep" aria-hidden="true">·</span><span>{stage}</span></>}
                {startup.founded && <><span className="startup-meta-sep" aria-hidden="true">·</span><span>Founded {startup.founded}</span></>}
                {hiring && <><span className="startup-meta-sep" aria-hidden="true">·</span><span className="startup-meta-hiring">Hiring</span></>}
              </p>
            </div>
          </div>

          <div className="startup-hero-actions">
            {startup.website && (
              <a className="btn startup-cta-btn" href={startup.website} target="_blank" rel="noopener noreferrer">
                Visit website <span aria-hidden="true">↗</span>
              </a>
            )}
            {careers && (
              <a className="btn btn-ghost startup-ghost-btn" href={careers} target="_blank" rel="noopener noreferrer">
                Careers <span aria-hidden="true">↗</span>
              </a>
            )}
            {maps && (
              <a className="btn btn-ghost startup-ghost-btn" href={maps} target="_blank" rel="noopener noreferrer">
                Directions <span aria-hidden="true">↗</span>
              </a>
            )}
            <Link className="startup-claim-link" href={`/submit?claim=${startup.id}&name=${encodeURIComponent(startup.name)}`}>
              Claim listing
            </Link>
          </div>
        </header>

        <div className="startup-layout">
          <div className="startup-main">
            {about && (
              <section className="startup-section">
                <h2 className="startup-section-title">About</h2>
                <p className="startup-section-body">{about}</p>
                {services.length > 0 && (
                  <ul className="startup-service-list">
                    {services.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {hiring?.roles?.length > 0 && (
              <section className="startup-section">
                <div className="startup-section-head">
                  <h2 className="startup-section-title">Open roles</h2>
                  <Link className="startup-view-all-link" href={`/jobs/company/${slug}`}>
                    All company jobs →
                  </Link>
                </div>
                <ul className="startup-role-list">
                  {hiring.roles.map((r, i) => (
                    <li key={r.url || i}>
                      <a
                        className="startup-role-item"
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="startup-role-name">{r.title}</span>
                        <span className="startup-role-sub">{startup.area || "Hyderabad"}</span>
                        <span className="startup-role-apply">Apply ↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(startup.address || startup.area) && (
              <section className="startup-section">
                <h2 className="startup-section-title">Office</h2>
                <p className="startup-section-body startup-address-text">{startup.address || startup.area}</p>
                {maps && (
                  <a className="startup-text-link" href={maps} target="_blank" rel="noopener noreferrer">
                    Open in Maps ↗
                  </a>
                )}
              </section>
            )}

            {startup.news?.[0] && (
              <section className="startup-section">
                <h2 className="startup-section-title">Latest news</h2>
                <a className="startup-news-link" href={startup.news[0].url} target="_blank" rel="noopener noreferrer">
                  {startup.news[0].title}
                </a>
              </section>
            )}

            {faqs.length > 0 && (
              <section className="startup-section">
                <h2 className="startup-section-title">FAQ</h2>
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
          </div>

          <aside className="startup-aside" aria-label="Company details">
            <dl className="startup-aside-facts">
              <div>
                <dt>Sector</dt>
                <dd>{startup.sector}</dd>
              </div>
              <div>
                <dt>Stage</dt>
                <dd>{stage || "Not disclosed"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{startup.area || "Hyderabad"}</dd>
              </div>
              {startup.founded && (
                <div>
                  <dt>Founded</dt>
                  <dd>{startup.founded}</dd>
                </div>
              )}
            </dl>

            {related.length > 0 && (
              <div className="startup-aside-related">
                <h2 className="startup-aside-title">Similar nearby</h2>
                <ul>
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link href={`/startups/${startupSlug(r)}`}>
                        <span className="startup-related-name">{prettyName(r.name)}</span>
                        <span className="startup-related-sub">{r.sector} · {normalizeArea(r.area)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
