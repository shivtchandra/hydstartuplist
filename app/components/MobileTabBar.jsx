"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadingScreen from "./LoadingScreen.jsx";

/* App-style bottom tab bar — mobile only (CSS hides it >768px). Five core
   destinations in the thumb zone. On the map page ("/"), the Map tab doesn't
   navigate — it closes the list overlay via onMapTab so tapping Map always
   returns you to the map. */

const ICONS = {
  map: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  feed: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="11" width="18" height="4" rx="1" />
      <rect x="3" y="18" width="18" height="3" rx="1" />
    </svg>
  ),
  jobs: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  ),
  news: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h13v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Z" />
      <path d="M17 8h3v10a2 2 0 0 1-2 2" />
      <path d="M7 9h7M7 13h7M7 17h4" />
    </svg>
  ),
  insights: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
};

const TABS = [
  { href: "/", label: "Explore", icon: ICONS.map },
  { href: "/jobs", label: "Jobs", icon: ICONS.jobs },
  { href: "/saved", label: "Saved", icon: ICONS.feed },
  { href: "/more", label: "More", icon: ICONS.insights },
];

function pendingLabel(href) {
  if (href === "/jobs") return "Loading jobs…";
  if (href === "/") return "Loading map…";
  if (href === "/saved") return "Loading saved…";
  return "Loading…";
}

function MobileTabBarInner({ onMapTab }) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const homeJobs = path === "/" && searchParams.get("view") === "jobs";
  const [navPending, setNavPending] = useState(null);

  useEffect(() => {
    setNavPending(null);
  }, [path, homeJobs]);

  useEffect(() => {
    if (!navPending) return undefined;
    const t = setTimeout(() => setNavPending(null), 15000);
    return () => clearTimeout(t);
  }, [navPending]);

  function tabIsActive(href) {
    if (href === "/") return path === "/" && !homeJobs;
    if (href === "/jobs") return path.startsWith("/jobs") || homeJobs;
    return path.startsWith(href);
  }

  return (
    <>
      {navPending ? (
        <div className="nav-loading-overlay" role="status" aria-live="polite">
          <LoadingScreen label={pendingLabel(navPending)} />
        </div>
      ) : null}
      <nav className="mobile-tabbar" aria-label="Primary">
        {TABS.map((t) => {
          const active = tabIsActive(t.href);
          const cls = `mtb-tab${active ? " active" : ""}`;

          if (t.href === "/" && onMapTab) {
            return (
              <button key={t.href} type="button" className={cls} onClick={onMapTab} aria-current={active ? "page" : undefined}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={t.href}
              href={t.href}
              className={cls}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (!active) setNavPending(t.href);
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default function MobileTabBar(props) {
  return (
    <Suspense fallback={<nav className="mobile-tabbar" aria-label="Primary" />}>
      <MobileTabBarInner {...props} />
    </Suspense>
  );
}
