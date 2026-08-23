// Shared display helpers for startup data — used by the map page, /feed, and
// /insights so formatting stays consistent without duplicating logic.

export const TAG_COLORS = {
  AI: "#7c3aed", Fintech: "#0891b2", Edtech: "#ea580c", Healthtech: "#dc2626",
  SaaS: "#2f5bea", Gaming: "#db2777", Logistics: "#65a30d", D2C: "#c026d3",
  Deeptech: "#0d9488", Consumer: "#d97706", Other: "#64748b",
};

// Areas are free-text ("Gachibowli, Hyderabad", "Hyderabad") — collapse to the
// first segment so filters/groupings use real localities, not near-unique
// full strings.
export function normalizeArea(area) {
  if (!area) return "Hyderabad";
  const first = area.split(",")[0].trim();
  return first || "Hyderabad";
}

export function domainOf(website) {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function faviconUrl(website) {
  const domain = domainOf(website);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
}

export function colorFor(sector) {
  return TAG_COLORS[sector] || TAG_COLORS.Other;
}

// Registry names are legal ALL-CAPS ("X PRIVATE LIMITED"). Clean for display;
// leave already-branded names (Zenoti, RED.Health) untouched.
export function prettyName(name) {
  let n = name
    .replace(/\(opc\)/gi, "")
    .replace(/[\s,]+(private limited|pvt\.?\s*ltd\.?|pvt\.?|ltd\.?|llp|limited)\.?$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const letters = name.replace(/[^A-Za-z]/g, "");
  const upper = name.replace(/[^A-Z]/g, "");
  if (letters && upper.length / letters.length > 0.7) {
    n = n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  n = n.replace(/\b(it|ai|erp|hr|bpo|kpo|api|iot|ev|ml|crm|ui|ux|ar|vr|saas|b2b|b2c|hvac|led|ivf)\b/gi,
    (m) => m.toUpperCase());
  return n;
}

export function careersUrl(website) {
  const domain = domainOf(website);
  if (!domain) return null;
  return `https://${domain}/careers`;
}
