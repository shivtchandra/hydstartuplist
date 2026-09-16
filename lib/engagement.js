export const PRODUCTS = ["startups", "eateries", "hub"];

export const EVENTS = [
  "landing",
  "results",
  "detail",
  "save",
  "apply",
  "company",
  "share",
  "alert_confirmed",
  "map_error",
  "page",
  "google_login",
  // eateries (shared allowlist so one API can accept either product)
  "place_open",
  "directions",
  "call",
  "stamp",
  "layer_click",
  "about_view",
  "series_support",
];

/**
 * Bucket dynamic segments so we get per-page counts without storing IDs/queries.
 * Never accepts emails, search queries, or coordinates.
 */
export function sanitizePath(raw) {
  if (!raw || typeof raw !== "string") return null;
  let p = raw.split("?")[0].split("#")[0].trim();
  if (!p.startsWith("/") || p.length > 96) return null;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/$/, "");

  // Drop opaque tokens / emails / coordinates if they somehow appear in the path.
  if (/@|[0-9]{1,3}\.[0-9]{1,3}\.|[&=]/.test(p)) return null;
  if (/[^a-zA-Z0-9/_\-.]/.test(p)) return null;

  p = p
    .replace(/^\/jobs\/[^/]+$/i, "/jobs/:id")
    .replace(/^\/startups\/[^/]+$/i, "/startups/:slug")
    .replace(/^\/areas\/[^/]+$/i, "/areas/:area")
    .replace(/^\/jobs\/in\/[^/]+$/i, "/jobs/in/:area")
    .replace(/^\/jobs\/role\/[^/]+$/i, "/jobs/role/:role")
    .replace(/^\/jobs\/company\/.+$/i, "/jobs/company/:name")
    .replace(/^\/stories\/[^/]+$/i, "/stories/:slug")
    .replace(/^\/news\/[^/]+$/i, "/news/:slug");

  // Keep only known-ish site shapes; unknown long trees collapse to first segment.
  const parts = p.split("/").filter(Boolean);
  if (parts.length > 4) p = `/${parts[0]}/…`;

  return p || "/";
}

export function safeEvent(input) {
  if (!EVENTS.includes(input?.event) || !/^[a-f0-9-]{36}$/.test(input?.session || "")) return null;
  const started =
    typeof input?.started === "number" && Number.isFinite(input.started) && input.started > 0
      ? input.started
      : Date.now();
  const out = {
    event: input.event,
    session: input.session,
    started,
    product: PRODUCTS.includes(input.product) ? input.product : "startups",
    variant: ["new", "control"].includes(input.variant) ? input.variant : "new",
    device: ["phone", "tablet", "desktop"].includes(input.device) ? input.device : "desktop",
    source: ["direct", "search", "social", "other"].includes(input.source) ? input.source : "other",
  };
  if (input.event === "page") {
    const path = sanitizePath(input.path);
    if (!path) return null;
    out.path = path;
  }
  if (input.event === "google_login") {
    const method = String(input.loginMethod || "").toLowerCase();
    if (method === "popup" || method === "onetap") out.loginMethod = method;
  }
  return out;
}
