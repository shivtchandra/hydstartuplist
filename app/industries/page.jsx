import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { getIndustriesIndex } from "../../lib/industries.js";
import { getSiteUrl } from "../../lib/site-url.js";

export const revalidate = 86400;

export const metadata = {
  title: "Industries | Hyderabad Startup Map",
  description:
    "Browse Hyderabad startups by industry — SaaS, AI, Fintech, Deeptech, Healthtech, Edtech, and more — with live counts, hiring, and company lists.",
  alternates: { canonical: `${getSiteUrl()}/industries` },
  openGraph: {
    title: "Industries | Hyderabad Startup Map",
    description:
      "Clear industry sub-pages for the Hyderabad startup ecosystem: share of the map, who’s hiring, and top companies in each sector.",
    type: "website",
  },
};

export default async function IndustriesIndexPage() {
  const industries = await getIndustriesIndex();
  const year = new Date().getFullYear();

  return (
    <div className="page-with-nav">
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <header className="industry-head">
          <p className="story-kicker">Hyderabad Startup Map</p>
          <h1>Industries</h1>
          <p className="industry-lead">
            Clear sub-pages for each sector on the map — how large it is in Hyderabad, who’s hiring,
            and which companies lead the list. Updated for {year}.
          </p>
        </header>

        <div className="industry-index-grid">
          {industries.map((ind) => (
            <Link key={ind.slug} href={`/industries/${ind.slug}`} className="industry-index-card">
              <div className="industry-index-top">
                <h2>{ind.sector}</h2>
                <span className="industry-share">{ind.sharePct}%</span>
              </div>
              <p>{ind.description}</p>
              <div className="industry-index-meta">
                <span>
                  {ind.count.toLocaleString()} startup{ind.count === 1 ? "" : "s"}
                </span>
                {ind.hiringCount > 0 && (
                  <span className="industry-hiring-pill">{ind.hiringCount} hiring</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
