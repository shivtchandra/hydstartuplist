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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const startup = await getStartupBySlug(params.slug);
  if (!startup) return { title: "Startup not found" };

  const name = prettyName(startup.name);
  const title = `${name} – ${startup.sector} Startup in ${startup.area || "Hyderabad"}`;
  const description =
    startup.descriptionLong ||
    startup.description ||
    `${name} is a ${startup.fundingStage} ${startup.sector} startup based in ${startup.area || "Hyderabad"}.`;
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
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}/startups/${slug}#organization`,
    name: prettyName(startup.name),
    url: startup.website || `${site}/startups/${slug}`,
    description: startup.descriptionLong || startup.description,
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

// Q&A built entirely from fields already on the entry — used both for the
// visible FAQ block and the FAQPage structured data. Questions with no real
// answer (e.g. unknown founding year) are dropped.
function faqItems(startup) {
  const name = prettyName(startup.name);
  const place = startup.area || "Hyderabad";
  const hiring = visibleHiring(startup);
  const about = startup.descriptionLong || startup.description;
  const items = [];

  if (about) {
    items.push({ q: `What does ${name} do?`, a: about });
  }
  items.push({
    q: `Where is ${name} located?`,
    a: startup.address
      ? `${name} is based at ${startup.address}.`
      : `${name} is based in ${place}.`,
  });
  if (startup.founded) {
    items.push({ q: `When was ${name} founded?`, a: `${name} was founded in ${startup.founded}.` });
  }
  items.push({
    q: `What sector is ${name} in?`,
    a: `${name} operates in ${startup.sector}${
      startup.fundingStage ? ` and is at the ${startup.fundingStage} stage` : ""
    }.`,
  });
  items.push({
    q: `Is ${name} hiring?`,
    a: hiring?.roles?.length
      ? `Yes — ${name} has ${hiring.count || hiring.roles.length} open role${
          (hiring.count || hiring.roles.length) === 1 ? "" : "s"
        } listed. See the current openings on this page.`
      : `There are no open roles listed for ${name} right now. Check the careers page for the latest.`,
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
  const about = startup.descriptionLong || startup.description;
  const services = Array.isArray(startup.services) ? startup.services.slice(0, 6) : [];

  const related = relatedStartups(startup, await getApproved(), 6);

  return (
    <div className="page-with-nav">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <SiteNav />
      <div className="feed-page startup-detail">
        <div className="startup-detail-nav">
          <Link href="/" className="startup-back">← Back to map</Link>
          <Link href={`/jobs/company/${slug}`} className="startup-jobs-link">
            {hiring?.count || hiring?.roles?.length ? `${hiring.count || hiring.roles.length} open role${(hiring.count || hiring.roles.length) === 1 ? "" : "s"}` : "Browse jobs"}
          </Link>
        </div>

        <header className="startup-detail-head">
          <StartupLogo
            name={startup.name}
            website={startup.website}
            logoUrl={startup.logoUrl}
            sector={startup.sector}
            size={72}
          />
          <div>
            <h1 className="startup-detail-title">
              {prettyName(startup.name)}
              {sponsored && <span className="sponsored-badge">Sponsored</span>}
            </h1>
            <p className="startup-detail-sub">{startup.area}</p>
            {startup.oneLiner && (
              <p className="startup-detail-oneliner">{startup.oneLiner}</p>
            )}
            <div className="tags">
              <span className="tag" style={{ background: "#eef2ff", color: colorFor(startup.sector) }}>
                {startup.sector}
              </span>
              <span className="tag tag-stage">{startup.fundingStage}</span>
              {hiring && (
                <span className="tag tag-hiring">
                  <span className="hiring-dot" />
                  Hiring now
                </span>
              )}
            </div>
            {services.length > 0 && (
              <div className="tags startup-services">
                {services.map((s) => (
                  <span key={s} className="tag tag-service">{s}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {about && (
          <section className="startup-section">
            <h2>About</h2>
            <p className="startup-desc">{about}</p>
          </section>
        )}

        <section className="startup-meta-grid">
          {startup.founded && (
            <div className="startup-meta-card">
              <span className="meta-label">Founded</span>
              <strong>{startup.founded}</strong>
            </div>
          )}
          <div className="startup-meta-card">
            <span className="meta-label">Funding stage</span>
            <strong>{startup.fundingStage}</strong>
          </div>
          <div className="startup-meta-card">
            <span className="meta-label">Sector</span>
            <strong>{startup.sector}</strong>
          </div>
          {startup.area && (
            <div className="startup-meta-card">
              <span className="meta-label">Area</span>
              <strong>{startup.area}</strong>
            </div>
          )}
        </section>

        {hiring?.roles?.length > 0 && (
          <section className="startup-section">
            <div className="startup-section-head">
              <h2>Open roles</h2>
              <Link href={`/jobs/company/${slug}`}>View all →</Link>
            </div>
            <div className="feed-list">
              {hiring.roles.map((r, i) => (
                <a
                  key={r.url || i}
                  className="feed-row"
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="feed-row-body">
                    <div className="feed-row-name">{r.title}</div>
                    <div className="feed-row-sub">{startup.area || "Hyderabad"}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {startup.news?.[0] && (
          <section className="startup-section">
            <h2>Latest news</h2>
            <a className="modal-news" href={startup.news[0].url} target="_blank" rel="noreferrer">
              {startup.news[0].title}
            </a>
          </section>
        )}

        {(startup.address || startup.area) && (
          <section className="startup-section">
            <h2>Office</h2>
            <p>{startup.address || startup.area}</p>
            {maps && (
              <a className="btn btn-ghost" href={maps} target="_blank" rel="noreferrer">
                Get directions ↗
              </a>
            )}
          </section>
        )}

        {faqs.length > 0 && (
          <section className="startup-section">
            <h2>Frequently asked</h2>
            <dl className="startup-faq">
              {faqs.map((it) => (
                <div key={it.q} className="startup-faq-item">
                  <dt>{it.q}</dt>
                  <dd>{it.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {related.length > 0 && (
          <section className="startup-section">
            <h2>Related startups in Hyderabad</h2>
            <div className="feed-list">
              {related.map((r) => (
                <Link key={r.id} className="feed-row" href={`/startups/${startupSlug(r)}`}>
                  <div className="feed-row-body">
                    <div className="feed-row-name">{prettyName(r.name)}</div>
                    <div className="feed-row-sub">
                      {r.sector} · {normalizeArea(r.area)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="startup-actions">
          {startup.website && (
            <a className="btn" href={startup.website} target="_blank" rel="noreferrer">
              Visit website ↗
            </a>
          )}
          {careers && (
            <a className="btn btn-ghost" href={careers} target="_blank" rel="noreferrer">
              Careers page ↗
            </a>
          )}
          <Link className="btn btn-ghost" href="/insights">
            Ecosystem insights
          </Link>
        </div>

        <Link
          className="modal-claim"
          href={`/submit?claim=${startup.id}&name=${encodeURIComponent(startup.name)}`}
        >
          Is this you? Claim this listing
        </Link>
      </div>
    </div>
  );
}
