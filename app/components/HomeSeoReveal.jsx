"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Homepage directory chapter: one-shot scroll reveal on desktop, and a
 * collapsed-by-default section on mobile (the map is the product there).
 * Collapsed content stays in the server HTML, so crawlers still see every link.
 */
export default function HomeSeoReveal({ children }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-inview");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-inview");
        io.disconnect();
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function toggle() {
    setOpen((v) => !v);
    ref.current?.classList.add("is-inview");
  }

  return (
    <>
      <div className="home-seo-bridge">
        <button
          type="button"
          className={`home-seo-bridge-label${open ? " is-open" : ""}`}
          aria-expanded={open}
          aria-controls="home-seo-directory"
          onClick={toggle}
        >
          Browse the directory
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
      <div ref={ref} id="home-seo-directory" className={`home-seo-reveal${open ? " is-open" : ""}`}>
        {children}
      </div>
    </>
  );
}
