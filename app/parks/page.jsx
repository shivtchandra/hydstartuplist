import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import { getTechParksIndex } from "../../lib/parks.js";
import { getSiteUrl } from "../../lib/site-url.js";

export const revalidate = 86400;

export const metadata = {
  title: "Hyderabad Tech Parks & IT Campuses Directory | Mapping HYD",
  description:
    "Explore major IT parks, SEZs, and technology campuses in Hyderabad — Mindspace, Sattva Knowledge City, WaveRock SEZ, DLF Cyber City, and Cyber Towers with tenant directories and live jobs.",
  alternates: { canonical: `${getSiteUrl()}/parks` },
  openGraph: {
    title: "Hyderabad Tech Parks & IT Campuses Directory | Mapping HYD",
    description:
      "Directory of startups, software companies, and GCCs in Hyderabad's premier IT parks with commute tips and office pins.",
    type: "website",
  },
};

export default async function TechParksIndexPage() {
  const parks = await getTechParksIndex();
  const year = new Date().getFullYear();

  return (
    <div className="page-with-nav">
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <header className="industry-head">
          <p className="story-kicker">Hyderabad Tech Parks &amp; Campuses</p>
          <h1>IT Parks &amp; SEZ Directory</h1>
          <p className="industry-lead">
            Detailed directories of companies, startups, and global technology teams operating inside
            Hyderabad&apos;s landmark tech corridors and SEZ campuses. Updated for {year}.
          </p>
        </header>

        <div className="industry-index-grid">
          {parks.map((park) => (
            <Link key={park.slug} href={`/parks/${park.slug}`} className="industry-index-card">
              <div className="industry-index-top">
                <h2>{park.name}</h2>
                <span className="industry-share">{park.area}</span>
              </div>
              <p style={{ fontWeight: 600, color: "var(--accent-text, #c2410c)", marginBottom: 6 }}>
                {park.tagline}
              </p>
              <p>{park.description}</p>
              <div className="industry-index-meta" style={{ marginTop: 12 }}>
                <span>
                  {park.count.toLocaleString()} mapped compan{park.count === 1 ? "y" : "ies"}
                </span>
                {park.hiringCount > 0 && (
                  <span className="industry-hiring-pill">{park.hiringCount} hiring</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
