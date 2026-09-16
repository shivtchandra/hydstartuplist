import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import { getStagesIndex } from "../../lib/stages.js";
import { getSiteUrl } from "../../lib/site-url.js";

export const revalidate = 86400;

export const metadata = {
  title: "Hyderabad Startups by Funding Stage | Mapping HYD",
  description:
    "Browse Hyderabad startups by investment and maturity tier — Unicorns, Series A, Seed, and Bootstrapped companies with verified funding data and open roles.",
  alternates: { canonical: `${getSiteUrl()}/stage` },
  openGraph: {
    title: "Hyderabad Startups by Funding Stage | Mapping HYD",
    description:
      "Explore venture-funded, early-stage, and bootstrapped technology companies in Hyderabad.",
    type: "website",
  },
};

export default async function StagesIndexPage() {
  const stages = await getStagesIndex();
  const year = new Date().getFullYear();

  return (
    <div className="page-with-nav">
      <SiteNav active="insights" />
      <div className="feed-page industry-page">
        <header className="industry-head">
          <p className="story-kicker">Investment &amp; Maturity Tiers</p>
          <h1>Startups by Funding Stage</h1>
          <p className="industry-lead">
            Explore Hyderabad tech startups categorized by growth stage, from early Seed teams and
            profitable Bootstrapped builders to fast-scaling Series A and Unicorn champions. Updated for {year}.
          </p>
        </header>

        <div className="industry-index-grid">
          {stages.map((stage) => (
            <Link key={stage.slug} href={`/stage/${stage.slug}`} className="industry-index-card">
              <div className="industry-index-top">
                <h2>{stage.stageName}</h2>
                <span className="industry-share">{stage.sharePct}%</span>
              </div>
              <p>{stage.description}</p>
              <div className="industry-index-meta" style={{ marginTop: 12 }}>
                <span>
                  {stage.count.toLocaleString()} startup{stage.count === 1 ? "" : "s"}
                </span>
                {stage.hiringCount > 0 && (
                  <span className="industry-hiring-pill">{stage.hiringCount} hiring</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
