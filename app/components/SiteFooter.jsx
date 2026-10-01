import Link from "next/link";
import { AREA_LANDINGS } from "../../lib/areas.js";
import { INDUSTRY_LANDINGS } from "../../lib/industries.js";
import FooterSection from "./FooterSection.jsx";

/** Unified site footer — SEO hub links across all areas, industries, and jobs. */
export default function SiteFooter() {
  const topAreas = AREA_LANDINGS.slice(0, 8);
  const topIndustries = INDUSTRY_LANDINGS.slice(0, 8);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
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
                  <circle cx="71.5" cy="40" r="7" fill="var(--accent-primary)" />
                </svg>
              </span>
              <span>
                Mapping<b> HYD</b>
              </span>
            </Link>
            <p>Every startup, GCC and tech job in Hyderabad, on one map.</p>
          </div>
          <div className="site-footer-actions">
            <Link href="/submit" className="ui-btn ui-btn--primary">
              Add your startup
            </Link>
            <Link href="/newsletter" className="ui-btn ui-btn--secondary">
              Weekly newsletter
            </Link>
          </div>
        </div>

        <div className="site-footer-grid">
          <FooterSection title="Directory" label="Explore">
            <Link href="/">Startup map</Link>
            <Link href="/product-companies">Product companies</Link>
            <Link href="/gccs">GCCs &amp; MNCs</Link>
            <Link href="/radar">Radar</Link>
            <Link href="/parks">Tech parks &amp; SEZs</Link>
            <Link href="/colleges">College placements</Link>
            <Link href="/industries">Industries</Link>
            <Link href="/stage">Funding stages</Link>
          </FooterSection>

          <FooterSection title="Tech areas" label="Tech corridors">
            {topAreas.map((a) => (
              <Link key={a.slug} href={`/areas/${a.slug}`}>
                {a.area}
              </Link>
            ))}
            <Link href="/areas" className="site-footer-more">All tech areas →</Link>
          </FooterSection>

          <FooterSection title="Sectors" label="Industries">
            {topIndustries.map((s) => (
              <Link key={s.slug} href={`/industries/${s.slug}`}>
                {s.sector}
              </Link>
            ))}
            <Link href="/industries" className="site-footer-more">All sectors →</Link>
          </FooterSection>

          <FooterSection title="Jobs" label="Jobs by sector">
            <Link href="/jobs">All jobs in Hyderabad</Link>
            <Link href="/jobs/fresher">Fresher jobs</Link>
            <Link href="/jobs/fresher/internships">Tech internships</Link>
            <Link href="/jobs/fresher/software-engineer">SDE-1 roles</Link>
            <Link href="/jobs/sector/saas">SaaS jobs</Link>
            <Link href="/jobs/sector/ai">AI &amp; ML jobs</Link>
            <Link href="/jobs/role/software-engineer">Software engineer jobs</Link>
          </FooterSection>

          <FooterSection title="Guides & data" label="Guides and insights">
            <Link href="/hyderabad-tech-statistics">Hyderabad tech statistics</Link>
            <Link href="/stories/hyderabad-fresher-tech-hiring-guide-2026">Fresher hiring guide 2026</Link>
            <Link href="/stories/top-product-companies-hyderabad">Top 50 product companies</Link>
            <Link href="/stories/hyderabad-tech-parks-guide">Tech parks guide</Link>
            <Link href="/insights">Ecosystem data</Link>
            <Link href="/news">Startup news</Link>
            <Link href="/stories" className="site-footer-more">All stories →</Link>
          </FooterSection>
        </div>

        <div className="site-footer-bottom">
          <p>© {year} Mapping HYD</p>
          <nav aria-label="Company">
            <Link href="/about">About</Link>
            <Link href="/hyderabad-tech-statistics">Statistics</Link>
            <Link href="/submit">Submit</Link>
            <a href="https://mapmyhyd.com/" target="_blank" rel="noopener noreferrer">mapmyhyd.com ↗</a>
            <a href="https://eats.mapmyhyd.com/" target="_blank" rel="noopener noreferrer">Hyderabad Eats ↗</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
