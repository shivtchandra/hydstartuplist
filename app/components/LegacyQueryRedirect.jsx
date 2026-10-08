"use client";

import { useEffect } from "react";

// Same encoding as jobUrlId() in lib/jobs-seo.js, kept here so the browser
// bundle doesn't pull in that module's server-side dependencies.
function jobUrlId(id) {
  const bytes = new TextEncoder().encode(String(id));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The static (Cloudflare Pages) build has no middleware, so old `?job=` links
// and `/?view=jobs` are redirected in the browser. On Vercel, middleware.js
// handles them first and this never fires.
export default function LegacyQueryRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const job = params.get("job");
    if (job) {
      window.location.replace(`/jobs/${jobUrlId(job)}`);
      return;
    }
    if (window.location.pathname === "/" && params.get("view") === "jobs") {
      params.delete("view");
      const query = params.toString();
      window.location.replace(`/jobs${query ? `?${query}` : ""}`);
    }
  }, []);
  return null;
}
