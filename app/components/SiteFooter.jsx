import Link from "next/link";
import { AREA_LANDINGS } from "../../lib/areas.js";
import { INDUSTRY_LANDINGS } from "../../lib/industries.js";

/** Unified site footer — SEO hub links across all areas, industries, and jobs. */
export default function SiteFooter() {
  const topAreas = AREA_LANDINGS.slice(0, 8);
  const topIndustries = INDUSTRY_LANDINGS.slice(0, 8);

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
            The Hyderabad Startup Map — 1,200+ software companies, product startups, GCCs, and jobs on one interactive map.
          </p>
        </div>

        <div className="site-footer-grid">
          <nav className="site-footer-col" aria-label="Explore">
            <h2>Directory</h2>
            <Link href="/">Startup Map</Link>
            <Link href="/product-companies">Product Companies</Link>
            <Link href="/parks">Tech Parks &amp; SEZs</Link>
            <Link href="/colleges">College Placements</Link>
            <Link href="/areas">Tech Corridors</Link>
            <Link href="/industries">Industries</Link>
            <Link href="/stage">Funding Stages</Link>
            <Link href="/gccs">GCCs &amp; MNCs</Link>
            <Link href="/radar">Radar (New Startups)</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Tech Corridors">
            <h2>Tech Areas</h2>
            {topAreas.map((a) => (
              <Link key={a.slug} href={`/areas/${a.slug}`}>
                {a.area}
              </Link>
            ))}
            <Link href="/areas" style={{ opacity: 0.8 }}>All Tech Areas →</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Industries">
            <h2>Sectors</h2>
            {topIndustries.map((s) => (
              <Link key={s.slug} href={`/industries/${s.slug}`}>
                {s.sector}
              </Link>
            ))}
            <Link href="/industries" style={{ opacity: 0.8 }}>All Sectors →</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Jobs by sector">
            <h2>Careers &amp; Jobs</h2>
            <Link href="/jobs">All Startup Jobs</Link>
            <Link href="/jobs/fresher">Fresher Jobs Hub</Link>
            <Link href="/jobs/fresher/internships">Tech Internships</Link>
            <Link href="/jobs/fresher/software-engineer">SDE-1 &amp; Fresher Roles</Link>
            <Link href="/jobs/sector/saas">SaaS Jobs</Link>
            <Link href="/jobs/sector/ai">AI &amp; ML Jobs</Link>
            <Link href="/jobs/role/software-engineer">Software Engineer</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Mapping HYD series">
            <h2>Guides &amp; Insights</h2>
            <Link href="/stories/hyderabad-fresher-tech-hiring-guide-2026">2026 Fresher Hiring Guide</Link>
            <Link href="/stories/top-product-companies-hyderabad">Top 50 Product Cos</Link>
            <Link href="/stories/hyderabad-tech-parks-guide">Tech Parks Guide</Link>
            <Link href="/stories">All Stories &amp; Reports</Link>
            <Link href="/insights">Ecosystem Data</Link>
            <Link href="/news">Startup News</Link>
            <a href="https://mapmyhyd.com/" target="_blank" rel="noopener noreferrer">Mapping HYD ↗</a>
            <a href="https://eats.mapmyhyd.com/" target="_blank" rel="noopener noreferrer">Hyderabad Eats ↗</a>
          </nav>
        </div>

        <div className="site-footer-bottom">
          <p>
            Part of <a href="https://mapmyhyd.com/">Mapping HYD</a> — Hyderabad startups, IT companies, jobs &amp; funding on one map.
          </p>
        </div>
      </div>
    </footer>
  );
}
