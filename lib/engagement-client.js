"use client";

/**
 * Anonymous session funnel → Firestore (/api/events) + GA4 (gtag) when present.
 * Never send emails, queries, or coordinates.
 */

function sessionState() {
  let s = JSON.parse(sessionStorage.getItem("hyd-session") || "null");
  if (!s || Date.now() - s.started > 1_800_000) {
    s = { id: crypto.randomUUID(), started: Date.now() };
    sessionStorage.setItem("hyd-session", JSON.stringify(s));
  }
  return s;
}

function trafficDims() {
  const ref = document.referrer;
  const source = !ref
    ? "direct"
    : /google|bing|duckduckgo/i.test(ref)
      ? "search"
      : /linkedin|instagram|facebook|t\.co|twitter|x\.com/i.test(ref)
        ? "social"
        : "other";
  const device = innerWidth < 768 ? "phone" : innerWidth < 1024 ? "tablet" : "desktop";
  return { source, device };
}

export function trackEvent(event, variant = "new", extra = {}) {
  try {
    const s = sessionState();
    const { source, device } = trafficDims();
    const body = {
      event,
      session: s.id,
      product: "startups",
      variant,
      device,
      source,
    };
    if (event === "page" && extra.path) body.path = extra.path;

    // Firestore only for funnel milestones — page views are GA4-only
    // (were the bulk of Firestore read+write + egress).
    let sendFirestore = event !== "page";

    if (sendFirestore) {
      fetch("/api/events", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }

    // GA4 — same anonymous dimensions, no PII
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      const gaParams = {
        engagement_variant: variant,
        engagement_device: device,
        engagement_source: source,
      };
      if (event === "page" && extra.path) gaParams.page_bucket = extra.path;
      window.gtag("event", event, gaParams);
    }
  } catch {}
}

/** Record a sanitized page view for Ops “by page” counts. */
export function trackPageView(pathname, variant = "new") {
  if (!pathname) return;
  trackEvent("page", variant, { path: pathname });
}
