import Link from "next/link";
import SiteNav from "./components/SiteNav.jsx";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="page-with-nav">
      <SiteNav />
      <section className="ui-empty">
        <h1>We couldn&apos;t find that page</h1>
        <p>It may have moved, or the company is no longer listed. These are good places to start:</p>
        <div className="ui-chip-row">
          <Link href="/" className="ui-chip">Startup map</Link>
          <Link href="/jobs" className="ui-chip">Jobs in Hyderabad</Link>
          <Link href="/product-companies" className="ui-chip">Product companies</Link>
          <Link href="/stories" className="ui-chip">Stories</Link>
        </div>
      </section>
    </div>
  );
}
