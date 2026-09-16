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

    // Funnel events (non-page): deduplicate per session so we don't spam /api/events with repeat clicks
    if (event !== "page") {
      const key = `hyd-events-${s.id}`;
      const seen = JSON.parse(sessionStorage.getItem(key) || "{}");
      if (seen[event]) {
        // Still fire GA4 if present
        if (typeof window !== "undefined" && typeof window.gtag === "function") {
          const gaParams = {
            engagement_variant: variant,
            engagement_device: device,
            engagement_source: source,
          };
          if (event === "google_login" && extra.loginMethod) gaParams.login_method = extra.loginMethod;
          window.gtag("event", event, gaParams);
        }
        return;
      }
      seen[event] = 1;
      sessionStorage.setItem(key, JSON.stringify(seen));
    }

    const body = {
      event,
      session: s.id,
      started: s.started,
      product: "startups",
      variant,
      device,
      source,
    };
    if (event === "page" && extra.path) body.path = extra.path;
    if (event === "google_login" && extra.loginMethod) body.loginMethod = extra.loginMethod;

    // Page + funnel events → Ops (/shiva/sources). Page is once-per-path/session
    // via trackPageView so we don't flood Firestore on remounts.
    fetch("/api/events", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});

    // GA4 — same anonymous dimensions, no PII
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      const gaParams = {
        engagement_variant: variant,
        engagement_device: device,
        engagement_source: source,
      };
      if (event === "page" && extra.path) gaParams.page_bucket = extra.path;
      if (event === "google_login" && extra.loginMethod) gaParams.login_method = extra.loginMethod;
      window.gtag("event", event, gaParams);
    }
  } catch {}
}

/** Record a sanitized page view for Ops “by page” counts (once per path/session). */
export function trackPageView(pathname, variant = "new") {
  if (!pathname) return;
  try {
    const s = sessionState();
    const key = `hyd-pages-${s.id}`;
    const seen = JSON.parse(sessionStorage.getItem(key) || "{}");
    if (seen[pathname]) return;
    seen[pathname] = 1;
    sessionStorage.setItem(key, JSON.stringify(seen));
  } catch {}
  trackEvent("page", variant, { path: pathname });
}
