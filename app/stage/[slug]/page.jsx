import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import StartupLogo from "../../components/StartupLogo.jsx";
import { STAGE_LANDINGS, stageLanding, getStagePage } from "../../../lib/stages.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import { prettyName } from "../../../lib/startupUi.js";
import { jobUrlId } from "../../../lib/jobs-seo.js";

export const revalidate = 86400;

export function generateStaticParams() {
  return STAGE_LANDINGS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }) {
  const landing = stageLanding(params.slug);
  if (!landing) return { title: "Stage not found" };
  const data = await getStagePage(params.slug);
  const count = data?.count ?? 0;
  const title = `${landing.title} (${count} Startups)`;
  const url = `${getSiteUrl()}/stage/${params.slug}`;
  return {
    title,
    description: landing.description,
    alternates: { canonical: url },
    openGraph: { title, description: landing.description, url, type: "website" },
  };
}

export default async function StageDetailPage({ params }) {
  const data = await getStagePage(params.slug);
  if (!data) notFound();

  const { landing, count, sharePct, hiringCount, jobsCount, topSectors, startups, jobs } = data;
  const others = STAGE_LANDINGS.filter((s) => s.slug !== landing.slug);
  const top3 = startups.slice(0, 3).map((s) => prettyName(s.name));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: landing.title,
    description: landing.description,
    url: `${getSiteUrl()}/stage/${landing.slug}`,
    about: {
      "@type": "Thing",
      name: `${landing.stageName} in Hyderabad`,
    },
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${landing.stageName} in Hyderabad`,
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
        name: `How many ${landing.stageName.toLowerCase()} are in Hyderabad?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mapping HYD lists ${count.toLocaleString()} ${landing.stageName.toLowerCase()} based in Hyderabad (${sharePct}% of the ecosystem), with ${hiringCount} actively hiring.`,
        },
      },
      {
        "@type": "Question",
        name: `What is it like working at a ${landing.stageName.toLowerCase()} company in Hyderabad?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: landing.careerAdvice,
        },
      },
      {
        "@type": "Question",
        name: `Which ${landing.stageName.toLowerCase()} are currently hiring in Hyderabad?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: top3.length
            ? `Top teams hiring include ${top3.join(", ")} and others across HITEC City and Gachibowli.`
            : `Explore all live roles on the Hyderabad Startup Map Jobs board.`,
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
          <Link href="/stage">Funding Stage</Link>
          <span aria-hidden="true">/</span>
          <span>{landing.stageName}</span>
        </nav>

        <header className="industry-head">
          <p className="story-kicker">Hyderabad Startup Ecosystem</p>
          <h1>{landing.stageName} in Hyderabad</h1>
          <p className="industry-lead">{landing.description}</p>
          <p className="industry-lead-soft">{landing.body}</p>
        </header>

        {/* Career & Culture Guidance Banner */}
        <section
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            color: "#1e40af",
          }}
          aria-label="Career & Culture Advice"
        >
          <h2 style={{ fontSize: "14px", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
            Career, Equity &amp; Hiring Insights
          </h2>
          <p style={{ fontSize: "13.5px", margin: 0, lineHeight: 1.55 }}>
            {landing.careerAdvice}
          </p>
        </section>

        <section className="industry-stat-strip" aria-label="Stage snapshot">
          <div className="industry-stat">
            <div className="industry-stat-value">{count.toLocaleString()}</div>
            <div className="industry-stat-label">Mapped startups</div>
          </div>
          <div className="industry-stat">
            <div className="industry-stat-value">{sharePct}%</div>
            <div className="industry-stat-label">Ecosystem share</div>
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

        {topSectors.length > 0 && (
          <section className="industry-sectors-strip" aria-label="Top sectors">
            <h2>Dominant Sectors</h2>
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

        <section className="industry-list-section" aria-label="Startups list">
          <div className="industry-list-head">
            <h2>
              Mapped {landing.stageName} in Hyderabad ({startups.length})
            </h2>
            <p className="industry-list-sub">
              Browse companies with office locations, funding stages, and careers.
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
                    View on Map →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {jobs.length > 0 && (
          <section className="industry-jobs-section" aria-label="Live roles">
            <div className="industry-list-head">
              <h2>Open Roles at {landing.stageName}</h2>
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

        <nav className="industry-others-nav" aria-label="Other Stages">
          <h2>Explore Other Startup Stages</h2>
          <div className="industry-others-grid">
            {others.map((other) => (
              <Link key={other.slug} href={`/stage/${other.slug}`} className="industry-other-card">
                <span className="industry-other-name">{other.stageName}</span>
                <span className="industry-other-desc">{other.sharePct}% of ecosystem</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
