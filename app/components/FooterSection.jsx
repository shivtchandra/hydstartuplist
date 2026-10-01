"use client";

import { useEffect, useRef } from "react";

/**
 * Footer link group. Server-rendered open (links always in the HTML for
 * crawlers); collapsed into a tap-to-open section on phones after mount.
 */
export default function FooterSection({ title, label, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 768px)").matches && ref.current) {
      ref.current.open = false;
    }
  }, []);

  return (
    <details ref={ref} className="site-footer-col" open>
      <summary>
        <h2>{title}</h2>
        <svg className="site-footer-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <nav aria-label={label || title}>{children}</nav>
    </details>
  );
}
