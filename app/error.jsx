"use client";

import { useEffect } from "react";
import Link from "next/link";
import SiteNav from "./components/SiteNav.jsx";

/** Route-level error boundary: friendly message + retry instead of a blank page. */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[route error]", error?.digest || "", error?.message || error);
  }, [error]);

  return (
    <div className="page-with-nav">
      <SiteNav />
      <section className="ui-empty" role="alert">
        <h1>Something went wrong</h1>
        <p>This page hit a snag while loading. Try again, or head back to the map.</p>
        <div className="ui-chip-row">
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="ui-btn ui-btn--secondary">
            Open the map
          </Link>
        </div>
      </section>
    </div>
  );
}
