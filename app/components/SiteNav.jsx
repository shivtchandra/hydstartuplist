"use client";

import Link from "next/link";
import MobileTabBar from "./MobileTabBar.jsx";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/jobs", label: "Jobs" },
  { href: "/saved", label: "Saved" },
  { href: "/?view=companies", label: "Companies" },
  { href: "/more", label: "More" },
];

export default function SiteNav({ active }) {
  return (
    <>
    <header className="topnav site-nav-sticky">
      <div className="topnav-row">
        <Link href="/" className="tn-brand">
          <span className="cmd-mark" aria-hidden="true">
            <svg viewBox="0 0 100 120" width="17" height="20" fill="none">
              <rect x="21" y="18" width="15" height="64" rx="3" fill="currentColor" />
              <rect x="21" y="42" width="58" height="15" rx="3" fill="currentColor" />
              <path d="M64 18 H79 V57 C79 63 77 68 73.5 72.5 L71.5 75 L69 111 L66.3 75.5 L64.3 72.8 C61 68.2 64 63.4 64 57 Z" fill="currentColor" />
              <circle cx="71.5" cy="40" r="7" fill="#ff5722" />
            </svg>
          </span>
          <span className="tn-title">
            <span className="tn-title-full">Mapping<b> HYD</b></span>
            <span className="tn-title-short">Mapping<b> HYD</b></span>
          </span>
        </Link>

        <nav className="tn-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={active === l.href.slice(1) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>

        <Link className="btn cmd-submit tn-cta" href="/submit" aria-label="Submit a startup">Submit a startup</Link>
      </div>
    </header>
    <MobileTabBar />
    </>
  );
}
