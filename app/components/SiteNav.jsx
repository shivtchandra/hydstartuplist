"use client";

import Link from "next/link";

const LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/jobs", label: "Jobs" },
  { href: "/gccs", label: "GCCs" },
  { href: "/news", label: "News" },
  { href: "/insights", label: "Insights" },
  { href: "/newsletter", label: "Newsletter" },
];

export default function SiteNav({ active }) {
  return (
    <header className="topnav site-nav-sticky">
      <div className="topnav-row">
        <Link href="/" className="tn-brand">
          <span className="cmd-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" fill="currentColor" />
              <circle cx="12" cy="10" r="2.6" fill="#fff" />
            </svg>
          </span>
          <span className="tn-title">
            <span className="tn-title-full">Hyderabad<b>StartupMap</b></span>
            <span className="tn-title-short">Hyd<b>Map</b></span>
          </span>
        </Link>

        <nav className="tn-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={active === l.href.slice(1) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>

        <Link className="btn cmd-submit tn-cta" href="/submit">Submit</Link>
      </div>
    </header>
  );
}
