import Link from "next/link";
import { JOB_SECTOR_LANDINGS, JOB_AREA_LANDINGS } from "../../lib/jobs-seo.js";

/** Shared bottom chrome — hard-coded hub links for crawl topology (not JS-only). */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav className="site-footer-nav" aria-label="Footer">
          <Link href="/">Map</Link>
          <Link href="/jobs">Jobs in Hyderabad</Link>
          <Link href="/jobs/fresher">Fresher jobs</Link>
          <Link href="/product-companies">Companies</Link>
          <Link href="/gccs">GCC Hyderabad</Link>
          <Link href="/stories/t-hub-hyderabad">T-Hub Hyderabad</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/submit">Submit a startup</Link>
        </nav>
        <nav className="site-footer-nav" aria-label="Jobs by sector">
          {JOB_SECTOR_LANDINGS.map((s) => (
            <Link key={s.slug} href={`/jobs/sector/${s.slug}`}>
              {s.sector} jobs
            </Link>
          ))}
        </nav>
        <nav className="site-footer-nav" aria-label="Jobs by area">
          {JOB_AREA_LANDINGS.map((a) => (
            <Link key={a.slug} href={`/jobs/in/${a.slug}`}>
              Jobs in {a.area}
            </Link>
          ))}
        </nav>
        <nav className="site-footer-nav site-footer-series" aria-label="Mapping HYD series">
          <a href="https://mapmyhyd.com/">Mapping HYD</a>
          <a href="https://eats.mapmyhyd.com/">Hyderabad Eats</a>
          <a href="https://mapmyhyd.com/about">About the series</a>
        </nav>
        <p className="site-footer-note">
          Part of <a href="https://mapmyhyd.com/">Mapping HYD</a> — Hyderabad startups, jobs &amp; funding on one map.
        </p>
      </div>
    </footer>
  );
}
