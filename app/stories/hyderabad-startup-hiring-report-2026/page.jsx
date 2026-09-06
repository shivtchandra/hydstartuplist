import Link from "next/link";
import { getHiringReportStats } from "../../../lib/jobs.js";
import { getSiteUrl } from "../../../lib/site-url.js";
import {
  JOB_AREA_LANDINGS,
  JOB_ROLE_LANDINGS,
  JOB_SECTOR_LANDINGS,
  articleJsonLd,
} from "../../../lib/jobs-seo.js";
import SiteNav from "../../components/SiteNav.jsx";

export const revalidate = 86400;

const SLUG = "hyderabad-startup-hiring-report-2026";
const TITLE = "Hyderabad startup hiring report — who's hiring in 2026";
const DESCRIPTION =
  "A live snapshot of open startup roles in Hyderabad: total openings, top hiring companies, and the sectors pulling talent in Gachibowli, Madhapur, and HITEC City.";

export async function generateMetadata() {
  const stats = await getHiringReportStats();
  const title = `${TITLE} (${stats.totalRoles} open roles)`;
  const url = `${getSiteUrl()}/stories/${SLUG}`;
  return {
    alternates: { canonical: url },
    title: `${title} | Hyderabad Startup Map`,
    description: DESCRIPTION,
    openGraph: { title, description: DESCRIPTION, url, type: "article" },
    twitter: { card: "summary_large_image", title, description: DESCRIPTION },
  };
}

function sectorHref(sector) {
  const landing = JOB_SECTOR_LANDINGS.find((s) => s.sector === sector);
  return landing ? `/jobs/sector/${landing.slug}` : "/jobs";
}

export default async function HyderabadHiringReportStory() {
  const stats = await getHiringReportStats();
  const pageUrl = `${getSiteUrl()}/stories/${SLUG}`;
  const published = "2026-02-01";
  const jsonLd = articleJsonLd({
    title: TITLE,
    description: DESCRIPTION,
    url: pageUrl,
    datePublished: published,
    dateModified: new Date().toISOString().slice(0, 10),
  });

  return (
    <div className="page-with-nav">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav active="stories" />
      <article className="story-page">
        <p className="story-kicker">
          <Link href="/stories">Stories</Link> · Hiring
        </p>
        <h1>{TITLE}</h1>
        <p className="story-lede">
          Hyderabad&apos;s startup job board currently lists{" "}
          <strong>{stats.totalRoles.toLocaleString()} open roles</strong>, including{" "}
          <strong>{stats.startupRoles.toLocaleString()} pulled directly from startup career pages</strong>.
          This report summarizes who is hiring now — and where to browse next.
        </p>
        <p className="story-meta">Updated {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · Live data from Hyderabad Startup Map</p>

        <div className="story-body">
          <h2>Total open roles</h2>
          <p>
            As of today, the <Link href="/jobs">Hyderabad startup jobs board</Link> tracks{" "}
            <strong>{stats.totalRoles.toLocaleString()} listings</strong> across mapped startups and
            the broader Hyderabad IT market. Of those,{" "}
            <strong>{stats.startupRoles.toLocaleString()}</strong> come straight from startup career
            pages (Greenhouse, Lever, Ashby, and similar) — the signal we weight most heavily when
            mapping who is actually hiring in the ecosystem.
          </p>

          <h2>Top hiring companies</h2>
          {stats.topCompanies.length === 0 ? (
            <p>No mapped startup hiring data is available right now. Check back after the next sync.</p>
          ) : (
            <ol>
              {stats.topCompanies.map((c) => (
                <li key={c.slug}>
                  <Link href={`/jobs/company/${c.slug}`}>{c.name}</Link> — {c.count} open role
                  {c.count === 1 ? "" : "s"}
                </li>
              ))}
            </ol>
          )}

          <h2>Top sectors hiring</h2>
          {stats.topSectors.length === 0 ? (
            <p>Sector breakdown will appear once job listings are matched to mapped startups.</p>
          ) : (
            <ul>
              {stats.topSectors.map(({ sector, count }) => (
                <li key={sector}>
                  <Link href={sectorHref(sector)}>{sector}</Link> — {count} role
                  {count === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
          )}

          <h2>Browse open roles</h2>
          <p>Use these landing pages to drill into live listings:</p>
          <ul>
            <li>
              <Link href="/jobs">All startup jobs in Hyderabad</Link>
            </li>
            <li>
              By sector:{" "}
              {JOB_SECTOR_LANDINGS.map((s, i) => (
                <span key={s.slug}>
                  {i > 0 ? " · " : ""}
                  <Link href={`/jobs/sector/${s.slug}`}>{s.sector}</Link>
                </span>
              ))}
            </li>
            <li>
              By area:{" "}
              {JOB_AREA_LANDINGS.map((a, i) => (
                <span key={a.slug}>
                  {i > 0 ? " · " : ""}
                  <Link href={`/jobs/in/${a.slug}`}>{a.area}</Link>
                </span>
              ))}
            </li>
            <li>
              By role:{" "}
              {JOB_ROLE_LANDINGS.slice(0, 6).map((r, i) => (
                <span key={r.slug}>
                  {i > 0 ? " · " : ""}
                  <Link href={`/jobs/role/${r.slug}`}>{r.role}</Link>
                </span>
              ))}
              {" · "}
              <Link href="/jobs">more roles on the jobs hub</Link>
            </li>
          </ul>

          <div className="story-callout">
            Numbers refresh as career pages and licensed listings sync. For the full interactive map
            of Hyderabad startups, visit the <Link href="/">startup map home page</Link>.
          </div>
        </div>
      </article>
    </div>
  );
}
