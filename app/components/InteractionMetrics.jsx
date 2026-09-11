"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent, trackPageView } from "../../lib/engagement-client.js";

export default function InteractionMetrics() {
  const path = usePathname();

  useEffect(() => {
    if (!path) return;

    // Per-page views (sanitized buckets) for Ops.
    trackPageView(path);

    if (/^\/jobs\/[^/]+$/.test(path) && !["/jobs/company", "/jobs/role"].includes(path)) {
      trackEvent("detail");
    }
    if (path.startsWith("/startups/")) trackEvent("company");

    const clicked = (e) => {
      const a = e.target.closest?.("a");
      if (a?.classList.contains("job-apply-btn")) trackEvent("apply");
    };
    document.addEventListener("click", clicked);
    return () => document.removeEventListener("click", clicked);
  }, [path]);

  return null;
}
