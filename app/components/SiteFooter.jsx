import Link from "next/link";

/** Shared bottom chrome for content pages (profiles, GCCs, stories, etc.). */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav className="site-footer-nav" aria-label="Footer">
          <Link href="/">Map</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/jobs/fresher">Fresher jobs</Link>
          <Link href="/gccs">GCCs</Link>
          <Link href="/feed">Feed</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/more">More</Link>
          <Link href="/submit">Submit a startup</Link>
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
