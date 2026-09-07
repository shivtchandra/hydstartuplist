import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import StartupLogo from "../../components/StartupLogo.jsx";
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
  const title = `${landing.title} — ${count} Companies`;
  const description = `${landing.description} ${count} startups on the Hyderabad map (${data?.sharePct || "0"}% of the ecosystem).`;
  const url = `${getSiteUrl()}/areas/${params.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function AreaDetailPage({ params }) {
  const data = await getAreaPage(params.slug);
  if (!data) notFound();

  const { landing, count, sharePct, hiringCount, jobsCount, topSectors, startups, jobs, totalEcosystem } =
    data;

  const others = AREA_LANDINGS.filter((a) => a.slug !== landing.slug);
  const top3 = startups.slice(0, 3).map((s) => prettyName(s.name));
  const leadLine =
    top3.length >= 3
      ? `${top3[0]}, ${top3[1]}, and ${top3[2]} lead the ${landing.area} list on this map.`
      : top3.length
        ? `${top3.join(" and ")} ${top3.length === 1 ? "leads" : "lead"} ${landing.area} on this map.`
        : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: landing.title,
    description: landing.description,
    url: `${getSiteUrl()}/areas/${landing.slug}`,
    about: {
      "@type": "Place",
      name: `${landing.area}, Hyderabad`,
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How many startups are in ${landing.area}, Hyderabad?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mapping HYD lists ${count.toLocaleString()} startups in ${landing.area} (${sharePct}% of mapped Hyderabad startups). ${hiringCount} are hiring.`,
        },
      },
      {
        "@type": "Question",
        name: `Where can I find startup jobs in ${landing.area}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Browse ${jobsCount.toLocaleString()} tracked roles near ${landing.area} on Mapping HYD Jobs.`,
        },
      },
    ],
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <nav className="industry-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
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
          <p className="industry-lead">{landing.description}</p>
          <p className="industry-lead-soft">{landing.body}</p>
          {leadLine && <p className="industry-lead-soft">{leadLine}</p>}
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

        <section className="industry-section">
          <h2>Companies</h2>
          <div className="feed-list">
            {startups.map((s) => (
              <Link key={s.id} className="feed-row feed-row-link" href={`/startups/${s.slug}`}>
                <StartupLogo name={s.name} website={s.website} size={40} />
                <div className="feed-row-body">
                  <div className="feed-row-name">
                    {prettyName(s.name)}
                    {s.hiring ? <span className="hiring-badge">Hiring</span> : null}
                  </div>
                  <div className="feed-row-sub">
                    {[s.sector, s.fundingStage].filter(Boolean).join(" · ")}
                  </div>
                  {s.description && <div className="feed-row-desc">{s.description}</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {jobs.length > 0 && (
          <section className="industry-section">
            <h2>Open roles nearby</h2>
            <p className="industry-section-sub">
              Sample of tracked openings at mapped {landing.area} companies.{" "}
              <Link href={`/jobs/in/${landing.slug}`}>See all →</Link>
            </p>
            <div className="feed-list">
              {jobs.map((j) => (
                <Link key={j.id} className="feed-row feed-row-link" href={`/jobs/${jobUrlId(j.id)}`}>
                  <div className="feed-row-body">
                    <div className="feed-row-name">{j.title}</div>
                    <div className="feed-row-sub">
                      {j.company} · {j.location}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
      <SiteFooter />
    </div>
  );
}
