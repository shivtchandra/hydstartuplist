import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import { getAreasIndex } from "../../lib/areas.js";
import { getSiteUrl } from "../../lib/site-url.js";

export const revalidate = 86400;

export const metadata = {
  title: "Tech Areas | Hyderabad Startup Map",
  description:
    "Browse Hyderabad startups by tech corridor — HITEC City, Madhapur, Gachibowli, and Financial District — with live company counts and hiring.",
  alternates: { canonical: `${getSiteUrl()}/areas` },
  openGraph: {
    title: "Tech Areas | Hyderabad Startup Map",
    description:
      "Company hubs for Hyderabad’s main startup corridors: who is based where, who’s hiring, and links into open roles.",
    type: "website",
  },
};

export default async function AreasIndexPage() {
  const areas = await getAreasIndex();
  const year = new Date().getFullYear();

  return (
    <div className="page-with-nav">
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <header className="industry-head">
          <p className="story-kicker">Hyderabad Startup Map</p>
          <h1>Tech areas</h1>
          <p className="industry-lead">
            Crawlable hubs for Hyderabad’s main startup corridors — company lists, hiring signals, and
            links into jobs. Updated for {year}.
          </p>
        </header>

        <div className="industry-index-grid">
          {areas.map((area) => (
            <Link key={area.slug} href={`/areas/${area.slug}`} className="industry-index-card">
              <div className="industry-index-top">
                <h2>{area.area}</h2>
                <span className="industry-share">{area.sharePct}%</span>
              </div>
              <p>{area.description}</p>
              <div className="industry-index-meta">
                <span>
                  {area.count.toLocaleString()} startup{area.count === 1 ? "" : "s"}
                </span>
                {area.hiringCount > 0 && (
                  <span className="industry-hiring-pill">{area.hiringCount} hiring</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
</div>
  );
}
