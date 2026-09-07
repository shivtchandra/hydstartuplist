import Link from "next/link";
import {
  JOB_AREA_LANDINGS,
  JOB_SECTOR_LANDINGS,
  JOB_ROLE_LANDINGS,
} from "../../lib/jobs-seo.js";

/** Crawlable jobs intro below the client explorer shell. */
export default function JobsSeoIndex({ jobCount = 0 }) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where can I find jobs in Hyderabad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mapping HYD lists ${jobCount || "1,000+"} startup and tech openings across the city — filter by area, role, and experience. Free, no signup.`,
        },
      },
      {
        "@type": "Question",
        name: "Are there fresher jobs in Hyderabad on this board?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Open the fresher jobs in Hyderabad landing for entry-level, intern, and early-career roles.",
        },
      },
      {
        "@type": "Question",
        name: "Is the Hyderabad jobs board free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Browse the board on Mapping HYD without creating an account.",
        },
      },
    ],
  };

  return (
    <section className="home-seo" aria-label="Jobs in Hyderabad directory">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="home-seo-inner">
        <header className="home-seo-head">
          <h1>Jobs in Hyderabad</h1>
          <p className="home-seo-sub">
            Browse <strong>jobs in Hyderabad</strong> at mapped startups and product companies —
            openings across Gachibowli, Madhapur, HITEC City, and the Financial District.
            {jobCount ? <> {jobCount.toLocaleString()}+ roles tracked right now.</> : null}
          </p>
          <p className="home-seo-sub">
            Looking for entry-level work? See the{" "}
            <Link href="/jobs/fresher">fresher & early-career board</Link>. Use the map above to
            filter live openings by commute area and role.
          </p>
          <nav className="home-seo-actions" aria-label="Job landings">
            <Link href="/jobs/fresher">Fresher & early-career</Link>
            <Link href="/product-companies">Companies in Hyderabad</Link>
            <Link href="/gccs">GCC Hyderabad</Link>
            <Link href="/">Startup map</Link>
          </nav>
        </header>

        <div className="home-seo-sectors-section">
          <h2 className="home-seo-section-title">Jobs by sector</h2>
          <p className="home-seo-sub">
            Narrow jobs in Hyderabad by industry — SaaS, fintech, healthtech, and more.
          </p>
          <div className="home-seo-areas-grid">
            {JOB_SECTOR_LANDINGS.map((s) => (
              <Link key={s.slug} href={`/jobs/sector/${s.slug}`} className="home-seo-area-chip">
                <span className="home-seo-area-name">{s.sector || s.title.replace(/ Jobs in Hyderabad$/i, "")}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="home-seo-areas-section">
          <h2 className="home-seo-section-title">Jobs by area</h2>
          <div className="home-seo-areas-grid">
            {JOB_AREA_LANDINGS.map((a) => (
              <Link key={a.slug} href={`/jobs/in/${a.slug}`} className="home-seo-area-chip">
                <span className="home-seo-area-name">{a.area}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="home-seo-areas-section">
          <h2 className="home-seo-section-title">Popular roles</h2>
          <div className="home-seo-areas-grid">
            {JOB_ROLE_LANDINGS.slice(0, 6).map((r) => (
              <Link key={r.slug} href={`/jobs/role/${r.slug}`} className="home-seo-area-chip">
                <span className="home-seo-area-name">{r.role}</span>
              </Link>
            ))}
          </div>
        </div>

        <section className="home-seo-faq" aria-label="FAQ">
          <h2 className="home-seo-section-title">FAQ</h2>
          <p>
            <strong>Where can I find jobs in Hyderabad?</strong> Use this board for startup and tech
            openings, or jump to area and sector landings above.
          </p>
          <p>
            <strong>Fresher roles?</strong>{" "}
            <Link href="/jobs/fresher">Entry-level and intern openings</Link> are listed on a
            dedicated page.
          </p>
          <p>
            <strong>Is it free?</strong> Yes — browse without signup.
          </p>
        </section>
      </div>
    </section>
  );
}
