"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import ExploreModes from "./ExploreModes.jsx";
import MobileTabBar from "./MobileTabBar.jsx";

/**
 * Canonical site chrome — same structure as the map home topnav:
 * brand · Startups/Jobs · search · Saved/GCCs/More · Submit
 * Used on every non-map page so navigation stays consistent.
 */
export default function SiteNav({ active = "", mode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  const exploreMode =
    mode ||
    (active === "jobs" || pathname.startsWith("/jobs") || pathname === "/saved"
      ? "jobs"
      : "companies");

  const linkActive = (key) => {
    if (key === "saved") return active === "saved" || pathname.startsWith("/saved");
    if (key === "gccs") return active === "gccs" || pathname.startsWith("/gccs");
    if (key === "more") {
      return (
        active === "more" ||
        pathname.startsWith("/more") ||
        pathname.startsWith("/news") ||
        pathname.startsWith("/stories") ||
        pathname.startsWith("/insights") ||
        pathname.startsWith("/newsletter") ||
        pathname.startsWith("/feed")
      );
    }
    return active === key;
  };

  function onSearch(e) {
    e.preventDefault();
    const query = q.trim();
    if (exploreMode === "jobs") {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const qs = params.toString();
      router.push(qs ? `/jobs?${qs}` : "/jobs");
      return;
    }
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <>
      <header className="topnav site-nav-sticky">
        <div className="topnav-row">
          <Link href="/" className="tn-brand">
            <span className="cmd-mark" aria-hidden="true">
              <svg viewBox="0 0 100 120" width="17" height="20" fill="none">
                <rect x="21" y="18" width="15" height="64" rx="3" fill="currentColor" />
                <rect x="21" y="42" width="58" height="15" rx="3" fill="currentColor" />
                <path
                  d="M64 18 H79 V57 C79 63 77 68 73.5 72.5 L71.5 75 L69 111 L66.3 75.5 L64.3 72.8 C61 68.2 64 63.4 64 57 Z"
                  fill="currentColor"
                />
                <circle cx="71.5" cy="40" r="7" fill="#ff5722" />
              </svg>
            </span>
            <span className="tn-title">
              <span className="tn-title-full">
                Mapping<b> HYD</b>
              </span>
              <span className="tn-title-short">
                Mapping<b> HYD</b>
              </span>
            </span>
          </Link>

          <ExploreModes active={exploreMode} />

          <form className="tn-search" onSubmit={onSearch} role="search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                exploreMode === "jobs"
                  ? "Role, skill, or company"
                  : "Search startups, sectors, areas…"
              }
              aria-label={exploreMode === "jobs" ? "Search jobs" : "Search startups"}
            />
          </form>

          <nav className="tn-links" aria-label="Site">
            <Link href="/saved" className={linkActive("saved") ? "active" : undefined}>
              Saved
            </Link>
            <Link href="/gccs" className={linkActive("gccs") ? "active" : undefined}>
              GCCs
            </Link>
            <Link href="/more" className={linkActive("more") ? "active" : undefined}>
              More
            </Link>
          </nav>

          <Link className="btn cmd-submit tn-cta" href="/submit" aria-label="Submit a startup">
            Submit a startup
          </Link>
        </div>
      </header>
      <MobileTabBar />
    </>
  );
}
