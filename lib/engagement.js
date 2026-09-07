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
  // eateries (shared allowlist so one API can accept either product)
  "place_open",
  "directions",
  "call",
  "stamp",
  "layer_click",
  "about_view",
  "series_support",
];

export function safeEvent(input) {
  if (!EVENTS.includes(input?.event) || !/^[a-f0-9-]{36}$/.test(input?.session || "")) return null;
  return {
    event: input.event,
    session: input.session,
    product: PRODUCTS.includes(input.product) ? input.product : "startups",
    variant: ["new", "control"].includes(input.variant) ? input.variant : "new",
    device: ["phone", "tablet", "desktop"].includes(input.device) ? input.device : "desktop",
    source: ["direct", "search", "social", "other"].includes(input.source) ? input.source : "other",
  };
}
