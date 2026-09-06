import Link from "next/link";

/** Shared bottom chrome for content pages (profiles, GCCs, stories, etc.). */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav className="site-footer-nav" aria-label="Footer">
          <Link href="/">Map</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/gccs">GCCs</Link>
          <Link href="/feed">Feed</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/more">More</Link>
          <Link href="/submit">Submit a startup</Link>
        </nav>
        <p className="site-footer-note">
          Mapping HYD · Hyderabad startups, jobs &amp; funding on one map.
        </p>
      </div>
    </footer>
  );
}
