import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import StartupLogo from "../../components/StartupLogo.jsx";
import AreaDirectoryClient from "../../components/AreaDirectoryClient.jsx";
import VerificationNote from "../../components/VerificationNote.jsx";
import { AREA_LANDINGS, areaLanding, getAreaPage } from "../../../lib/areas.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import { prettyName } from "../../../lib/startupUi.js";
import { jobUrlId } from "../../../lib/jobs-seo.js";

export const revalidate = 86400;

export function generateStaticParams() {
  return AREA_LANDINGS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }) {
  const landing = areaLanding(params.slug);
  if (!landing) return { title: "Area not found" };
  const data = await getAreaPage(params.slug);
  const count = data?.count ?? 0;
  const jobsCount = data?.jobsCount ?? 0;
  const areaLower = landing.area.toLowerCase();
  const title =
    count > 0
      ? `Companies in ${landing.area}, Hyderabad: List of ${count} IT & Software Companies (2026)`
      : `Companies in ${landing.area}, Hyderabad: IT & Software Companies List (2026)`;
  const description = `${landing.description} Browse ${count} mapped tech companies and ${jobsCount > 0 ? `${jobsCount} current open jobs` : "official career links"} in ${landing.area}, Hyderabad.`;
  const url = `${getSiteUrl()}/areas/${params.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    keywords: [
      `list of it companies in ${areaLower} hyderabad`,
      `${areaLower} it companies`,
      `${areaLower} software companies list`,
      `companies in ${areaLower} hyderabad`,
      `${areaLower} companies list`,
      `${areaLower} software companies`,
      `it companies in ${areaLower} hyderabad`,
      `startups in ${areaLower}`,
      `software companies in ${areaLower}`,
      `it company in ${areaLower}`,
      `${areaLower} it jobs`,
      `startup jobs in ${areaLower}`,
      `jobs in ${areaLower} hyderabad`,
      "hyderabad startup map",
      "hyderabad startups map",
    ],
  };
}

export default async function AreaDetailPage({ params }) {
  const data = await getAreaPage(params.slug);
  if (!data) notFound();

  const { landing, count, sharePct, hiringCount, jobsCount, topSectors, buildings = [], startups, jobs, totalEcosystem } =
    data;

  // Answer-first summary built only from live counts (quotable by search + AI engines).
  const topSectorNames = topSectors.slice(0, 3).map((s) => s.sector);
  const answerLine = `${landing.area} has ${count.toLocaleString()} mapped tech companies — ${sharePct}% of the ${totalEcosystem.toLocaleString()} tracked across Hyderabad. ${hiringCount.toLocaleString()} are hiring now${jobsCount > 0 ? `, with ${jobsCount.toLocaleString()} open roles tracked` : ""}${topSectorNames.length ? `; the largest sectors are ${topSectorNames.join(", ")}` : ""}.`;

  const others = AREA_LANDINGS.filter((a) => a.slug !== landing.slug);
  const top3 = startups.slice(0, 3).map((s) => prettyName(s.name));
  const leadLine =
    top3.length >= 3
      ? `${top3[0]}, ${top3[1]}, and ${top3[2]} lead the ${landing.area} list on this map.`
      : top3.length
        ? `${top3.join(" and ")} ${top3.length === 1 ? "leads" : "lead"} ${landing.area} on this map.`
        : null;

  const updatedAt = new Date().toISOString().slice(0, 10);
  const pageUrl = `${getSiteUrl()}/areas/${landing.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#page`,
    name: landing.title,
    description: answerLine,
    url: pageUrl,
    dateModified: updatedAt,
    spatialCoverage: {
      "@type": "Place",
      "@id": `${pageUrl}#place`,
      name: `${landing.area}, Hyderabad`,
      address: { "@type": "PostalAddress", addressLocality: landing.area, addressRegion: "Telangana", addressCountry: "IN" },
    },
    about: { "@id": `${pageUrl}#place` },
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top Startups & IT Companies in ${landing.area}, Hyderabad`,
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
        name: `How many software & IT startups are in ${landing.area}, Hyderabad?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mapping HYD lists ${count.toLocaleString()} mapped tech companies and startups in ${landing.area} (${sharePct}% of the Hyderabad startup ecosystem), with ${hiringCount} actively hiring.`,
        },
      },
      {
        "@type": "Question",
        name: `Which companies are based in ${landing.area}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: top3.length
            ? `Top tech employers and startups in ${landing.area} include ${top3.join(", ")} and ${count - top3.length} others.`
            : `Browse all ${count.toLocaleString()} mapped companies on the ${landing.area} directory.`,
        },
      },
      {
        "@type": "Question",
        name: `Where can I find startup and IT jobs in ${landing.area}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Browse ${jobsCount.toLocaleString()} live tech openings in ${landing.area} across engineering, product, and sales on Mapping HYD Jobs.`,
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
          <Link href="/areas">Areas</Link>
          <span aria-hidden="true">/</span>
          <span>{landing.area}</span>
        </nav>

        <header className="industry-head">
          <p className="story-kicker">{landing.area} · Hyderabad</p>
          <h1>
            {count.toLocaleString()} startups in {landing.area}
          </h1>
          <p className="industry-lead">{answerLine}</p>
          <p className="industry-lead-soft">{landing.description}</p>
          <p className="industry-lead-soft">{landing.body}</p>
          {leadLine && <p className="industry-lead-soft">{leadLine}</p>}
          <VerificationNote updatedAt={updatedAt} />
        </header>

        <section className="industry-stat-strip" aria-label="Area snapshot">
          <div className="industry-stat">
            <div className="industry-stat-value">{sharePct}%</div>
            <div className="industry-stat-label">Share of Hyd startups</div>
          </div>
          <div className="industry-stat">
            <div className="industry-stat-value">{count.toLocaleString()}</div>
            <div className="industry-stat-label">On the map</div>
          </div>
          <div className="industry-stat">
            <div className="industry-stat-value">{hiringCount.toLocaleString()}</div>
            <div className="industry-stat-label">Hiring now</div>
          </div>
          <div className="industry-stat">
            <div className="industry-stat-value">{jobsCount.toLocaleString()}</div>
            <div className="industry-stat-label">Tracked roles</div>
          </div>
        </section>

        <p className="industry-section-sub" style={{ marginTop: 8 }}>
          Of {totalEcosystem.toLocaleString()} mapped Hyderabad startups.{" "}
          <Link href={`/jobs/in/${landing.slug}`}>Startup jobs in {landing.area} →</Link>
        </p>

        {topSectors.length > 0 && (
          <section className="industry-section">
            <h2>Sectors in {landing.area}</h2>
            <ul className="industry-facet-list">
              {topSectors.map((s) => (
                <li key={s.sector}>
                  <Link href={`/industries/${s.slug}`}>{s.sector}</Link>
                  <span className="industry-facet-count">{s.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {buildings.length > 0 && (
          <section className="industry-section">
            <h2>Companies by building in {landing.area}</h2>
            <p className="industry-section-sub">
              Grouped by the tech park or building named in each company&apos;s office address.
            </p>
            {buildings.map((b) => (
              <div key={b.park} style={{ marginTop: 14 }}>
                <h3>
                  <Link href={`/parks/${b.park}`}>{b.name}</Link>{" "}
                  <span className="industry-facet-count">{b.companies.length}</span>
                </h3>
                <ul className="industry-facet-list">
                  {b.companies.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/startups/${c.slug}`}>{prettyName(c.name)}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <AreaDirectoryClient
          areaName={landing.area}
          areaSlug={landing.slug}
          startups={startups}
          jobs={jobs}
        />

        <section className="industry-section" aria-label="FAQ">
          <h2>FAQ</h2>
          <p className="industry-section-sub">
            <strong>How many startups are in {landing.area}?</strong> {count.toLocaleString()} on
            this map ({sharePct}% of Hyderabad), with {hiringCount.toLocaleString()} hiring now.
          </p>
          <p className="industry-section-sub">
            <strong>Jobs nearby?</strong>{" "}
            <Link href={`/jobs/in/${landing.slug}`}>
              See startup jobs in {landing.area} →
            </Link>
          </p>
        </section>

        <section className="industry-section">
          <h2>Other areas</h2>
          <div className="industry-other-links">
            <Link href="/areas">All areas</Link>
            {others.map((o) => (
              <Link key={o.slug} href={`/areas/${o.slug}`}>
                {o.area}
              </Link>
            ))}
          </div>
        </section>
      </div>
</div>
  );
}
