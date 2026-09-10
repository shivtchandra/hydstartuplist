import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "../../components/SiteNav.jsx";
import StartupLogo from "../../components/StartupLogo.jsx";
import {
  INDUSTRY_LANDINGS,
  getIndustryPage,
  industryLanding,
} from "../../../lib/industries.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import { prettyName } from "../../../lib/startupUi.js";
import { jobUrlId } from "../../../lib/jobs-seo.js";
import { areaSlugForName } from "../../../lib/areas.js";

export const revalidate = 86400;

export function generateStaticParams() {
  return INDUSTRY_LANDINGS.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }) {
  const landing = industryLanding(params.slug);
  if (!landing) return { title: "Industry not found" };
  const data = await getIndustryPage(params.slug);
  const count = data?.count ?? 0;
  const title = `${landing.title} — ${count} Companies`;
  const description = `${landing.description} ${count} startups on the Hyderabad map (${data?.sharePct || "0"}% of the ecosystem).`;
  const url = `${getSiteUrl()}/industries/${params.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function IndustryDetailPage({ params }) {
  const data = await getIndustryPage(params.slug);
  if (!data) notFound();

  const { landing, count, sharePct, hiringCount, jobsCount, topAreas, stages, startups, jobs, totalEcosystem } =
    data;

  const others = INDUSTRY_LANDINGS.filter((i) => i.slug !== landing.slug).slice(0, 8);
  const top3 = startups.slice(0, 3).map((s) => prettyName(s.name));
  const leadLine =
    top3.length >= 3
      ? `${top3[0]}, ${top3[1]}, and ${top3[2]} lead the ${landing.sector} ranking on this map.`
      : top3.length
        ? `${top3.join(" and ")} ${top3.length === 1 ? "leads" : "lead"} ${landing.sector} on this map.`
        : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: landing.title,
    description: landing.description,
    url: `${getSiteUrl()}/industries/${landing.slug}`,
    about: {
      "@type": "Thing",
      name: `${landing.sector} startups in Hyderabad`,
    },
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <nav className="industry-crumbs" aria-label="Breadcrumb">
          <Link href="/">Hyderabad Startup Map</Link>
          <span aria-hidden="true">/</span>
          <Link href="/industries">Industries</Link>
          <span aria-hidden="true">/</span>
          <span>{landing.sector}</span>
        </nav>

        <header className="industry-head">
          <p className="story-kicker">{landing.sector} · Hyderabad</p>
          <h1>
            {count.toLocaleString()} {landing.sector} startups in Hyderabad
          </h1>
          <p className="industry-lead">{landing.description}</p>
          {leadLine && <p className="industry-lead-soft">{leadLine}</p>}
        </header>

        <section className="industry-stat-strip" aria-label="Industry snapshot">
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
            <div className="industry-stat-label">Open roles tracked</div>
          </div>
        </section>

        <p className="industry-context">
          {landing.sector} makes up <strong>{sharePct}%</strong> of {totalEcosystem.toLocaleString()}{" "}
          startups on Mapping HYD
          {hiringCount > 0 ? (
            <>
              , with <strong>{hiringCount}</strong> currently showing open roles
            </>
          ) : null}
          .
        </p>

        <div className="industry-actions">
          <Link className="btn" href={`/?sector=${encodeURIComponent(landing.sector)}`}>
            View on map
          </Link>
          <Link className="btn btn-ghost" href={`/jobs?sector=${encodeURIComponent(landing.sector)}`}>
            Browse {landing.sector} jobs
          </Link>
          {["saas", "fintech", "healthtech", "deeptech", "edtech"].includes(landing.slug) && (
            <Link className="btn btn-ghost" href={`/jobs/sector/${landing.slug}`}>
              Sector jobs landing
            </Link>
          )}
        </div>

        <section className="industry-section">
          <h2>Top {landing.sector} startups</h2>
          <p className="industry-section-sub">
            Ranked by hiring signal and spotlight — then alphabetically. Not a funding leaderboard.
          </p>
          <ol className="industry-rank-list">
            {startups.map((s) => (
              <li key={s.id} className="industry-rank-item">
                <span className="industry-rank-num">{s.rank}</span>
                <StartupLogo name={s.name} website={s.website} sector={landing.sector} size={40} />
                <div className="industry-rank-body">
                  <Link href={`/startups/${s.slug}`} className="industry-rank-name">
                    {prettyName(s.name)}
                    {s.hiring && <span className="industry-hiring-pill">hiring</span>}
                  </Link>
                  <div className="industry-rank-meta">
                    {[s.area, s.fundingStage].filter(Boolean).join(" · ")}
                  </div>
                  {s.description && <p className="industry-rank-desc">{s.description}</p>}
                </div>
                {s.website && (
                  <a
                    className="industry-rank-site"
                    href={s.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Website
                  </a>
                )}
              </li>
            ))}
          </ol>
          {startups.length === 0 && (
            <p className="form-sub">No startups tagged {landing.sector} yet.</p>
          )}
        </section>

        {(topAreas.length > 0 || stages.length > 0) && (
          <section className="industry-split">
            {topAreas.length > 0 && (
              <div>
                <h2>Where they cluster</h2>
                <ul className="industry-facet-list">
                  {topAreas.map((a) => {
                    const hub = areaSlugForName(a.area);
                    return (
                    <li key={a.area}>
                      {hub ? <Link href={`/areas/${hub}`}>{a.area}</Link> : <span>{a.area}</span>}
                      <span className="industry-facet-count">{a.count}</span>
                    </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {stages.length > 0 && (
              <div>
                <h2>Funding stage mix</h2>
                <ul className="industry-facet-list">
                  {stages.map((st) => (
                    <li key={st.stage}>
                      <span>{st.stage}</span>
                      <span className="industry-facet-count">{st.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {jobs.length > 0 && (
          <section className="industry-section">
            <h2>Open {landing.sector} roles</h2>
            <p className="industry-section-sub">
              Sample of tracked openings at mapped {landing.sector} companies.{" "}
              <Link href={`/jobs?sector=${encodeURIComponent(landing.sector)}`}>See all →</Link>
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

        <section className="industry-section">
          <h2>Other industries</h2>
          <div className="industry-other-links">
            <Link href="/industries">All industries</Link>
            {others.map((o) => (
              <Link key={o.slug} href={`/industries/${o.slug}`}>
                {o.sector}
              </Link>
            ))}
          </div>
        </section>
      </div>
</div>
  );
}
