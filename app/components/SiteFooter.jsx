import Link from "next/link";
import { JOB_SECTOR_LANDINGS, JOB_AREA_LANDINGS } from "../../lib/jobs-seo.js";

/** Unified site footer — one chrome for every page. SEO hub links stay crawlable. */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link href="/" className="site-footer-logo">
            <span className="site-footer-mark" aria-hidden="true">
              <svg viewBox="0 0 100 120" width="18" height="22" fill="none">
                <rect x="21" y="18" width="15" height="64" rx="3" fill="currentColor" />
                <rect x="21" y="42" width="58" height="15" rx="3" fill="currentColor" />
                <path
                  d="M64 18 H79 V57 C79 63 77 68 73.5 72.5 L71.5 75 L69 111 L66.3 75.5 L64.3 72.8 C61 68.2 64 63.4 64 57 Z"
                  fill="currentColor"
                />
                <circle cx="71.5" cy="40" r="7" fill="#ff5722" />
              </svg>
            </span>
            <span>
              Mapping<b> HYD</b>
            </span>
          </Link>
          <p>
            The Hyderabad Startup Map — startups, jobs, and GCCs on one map. Free to browse, built for people who work here.
          </p>
        </div>

        <div className="site-footer-grid">
          <nav className="site-footer-col" aria-label="Explore">
            <h2>Explore</h2>
            <Link href="/">Hyderabad Startup Map</Link>
            <Link href="/jobs">Jobs</Link>
            <Link href="/product-companies">Companies</Link>
            <Link href="/gccs">GCCs</Link>
            <Link href="/more">More</Link>
            <Link href="/radar">Radar</Link>
            <Link href="/submit">Submit a startup</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Jobs by sector">
            <h2>Jobs by sector</h2>
            {JOB_SECTOR_LANDINGS.map((s) => (
              <Link key={s.slug} href={`/jobs/sector/${s.slug}`}>
                {s.sector}
              </Link>
            ))}
            <Link href="/jobs/fresher">Fresher &amp; early-career</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Jobs by area">
            <h2>Jobs by area</h2>
            {JOB_AREA_LANDINGS.map((a) => (
              <Link key={a.slug} href={`/jobs/in/${a.slug}`}>
                {a.area}
              </Link>
            ))}
          </nav>

          <nav className="site-footer-col" aria-label="Mapping HYD series">
            <h2>Series</h2>
            <a href="https://mapmyhyd.com/">Mapping HYD</a>
            <a href="https://eats.mapmyhyd.com/">Hyderabad Eats</a>
            <a href="https://mapmyhyd.com/about">About</a>
            <Link href="/stories">Stories</Link>
            <Link href="/insights">Insights</Link>
            <Link href="/newsletter">Newsletter</Link>
          </nav>
        </div>

        <div className="site-footer-bottom">
          <p>
            Part of <a href="https://mapmyhyd.com/">Mapping HYD</a> — Hyderabad startups, jobs &amp; funding on one map.
          </p>
        </div>
      </div>
    </footer>
  );
}
