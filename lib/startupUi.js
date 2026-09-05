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

// Hostname as stored on the entry (keeps www). Google's favicon index is
// keyed by exact host — optum.com 404s while www.optum.com resolves.
export function hostnameOf(website) {
  if (!website) return null;
  try {
    return new URL(website).hostname;
  } catch {
    return null;
  }
}

// Ordered unique hosts to try for logo lookups.
export function faviconHosts(website) {
  const host = hostnameOf(website);
  const bare = domainOf(website);
  if (!bare) return [];
  const out = [];
  for (const h of [host, bare, `www.${bare}`]) {
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}

export function faviconUrl(website) {
  const host = faviconHosts(website)[0];
  return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : null;
}

function safeImageUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// Submitted HTTPS logos or Google's HTTPS index only. Hitting company
// /apple-touch-icon from the browser caused mixed content, third-party
// cookies, and a request storm that delayed map LCP.
export function logoSrcs(website, logoUrl) {
  const srcs = [];
  const submittedLogo = safeImageUrl(logoUrl);
  if (submittedLogo) srcs.push(submittedLogo);
  const host = faviconHosts(website)[0];
  if (host) srcs.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`);
  return srcs;
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

// Pick up to `n` other startups to cross-link from a detail page: same sector
// first (most relevant), then same locality, then anything — so the block is
// always full. Excludes the current startup and anything without a name.
export function relatedStartups(startup, all, n = 6) {
  const others = all.filter(
    (s) => s && s.name && s.id !== startup.id && s.active !== false
  );
  const area = normalizeArea(startup.area);
  const sameSector = others.filter((s) => s.sector === startup.sector);
  const sameArea = others.filter(
    (s) => s.sector !== startup.sector && normalizeArea(s.area) === area
  );
  const rest = others.filter(
    (s) => !sameSector.includes(s) && !sameArea.includes(s)
  );
  return [...sameSector, ...sameArea, ...rest].slice(0, n);
}
