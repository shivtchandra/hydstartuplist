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

const KNOWN_COMPANY_DOMAINS = {
  'procter & gamble': 'pg.com',
  'procter and gamble': 'pg.com',
  'p&g': 'pg.com',
  'aveva': 'aveva.com',
  'ntt america': 'nttdata.com',
  'ntt america, inc.': 'nttdata.com',
  'ntt data': 'nttdata.com',
  'gap inc.': 'gapinc.com',
  'gap inc': 'gapinc.com',
  'gap': 'gap.com',
  'coforge': 'coforge.com',
  'nagarro': 'nagarro.com',
  'sugar.fit': 'sugarfit.com',
  'sugarfit': 'sugarfit.com',
  'twin health': 'twinhealth.com',
  'apollo hospitals': 'apollohospitals.com',
  'apollo': 'apollohospitals.com',
  'kims hospitals': 'kimshospitals.com',
  'rainbow hospitals': 'rainbowhospitals.in',
  'care hospitals': 'carehospitals.com',
  'yashoda hospitals': 'yashodahospitals.com',
  'swiggy': 'swiggy.com',
  'zomato': 'zomato.com',
  'uber': 'uber.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'oracle': 'oracle.com',
  'salesforce': 'salesforce.com',
  'servicenow': 'servicenow.com',
  'qualcomm': 'qualcomm.com',
  'de shaw': 'deshaw.com',
  'goldman sachs': 'goldmansachs.com',
  'jpmorgan': 'jpmorgan.com',
  'wells fargo': 'wellsfargo.com',
  'deloitte': 'deloitte.com',
  'pwc': 'pwc.com',
  'ey': 'ey.com',
  'kpmg': 'kpmg.com',
  'tcs': 'tcs.com',
  'infosys': 'infosys.com',
  'wipro': 'wipro.com',
  'hcltech': 'hcltech.com',
  'tech mahindra': 'techmahindra.com',
  'ltimindtree': 'ltimindtree.com',
  'ltm': 'ltimindtree.com',
  'cognizant': 'cognizant.com',
  'capgemini': 'capgemini.com',
  'accenture': 'accenture.com',
};

export function inferCompanyDomain(companyName) {
  if (!companyName) return null;
  const clean = companyName.toLowerCase().trim();
  if (KNOWN_COMPANY_DOMAINS[clean]) return KNOWN_COMPANY_DOMAINS[clean];

  const stripped = clean
    .replace(/[\s,]+(private limited|pvt\.?\s*ltd\.?|pvt\.?|ltd\.?|llp|limited|inc\.?|corporation|corp\.?|technologies|solutions|services|group|india|america)\.?$/gi, '')
    .trim();

  if (KNOWN_COMPANY_DOMAINS[stripped]) return KNOWN_COMPANY_DOMAINS[stripped];

  const slug = stripped.replace(/[^a-z0-9]/g, '');
  if (slug && slug.length >= 3 && slug.length <= 25) {
    return `${slug}.com`;
  }
  return null;
}

// Multi-source logo resolver (Clearbit -> Google 128px -> DuckDuckGo -> Fallback)
export function logoSrcs(website, logoUrl, companyName) {
  const srcs = [];
  const submittedLogo = safeImageUrl(logoUrl);
  if (submittedLogo) srcs.push(submittedLogo);

  let host = faviconHosts(website)[0];
  if (!host && companyName) {
    host = inferCompanyDomain(companyName);
  }

  if (host) {
    const cleanHost = host.replace(/^www\./, '');
    srcs.push(`https://logo.clearbit.com/${encodeURIComponent(cleanHost)}`);
    srcs.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`);
    srcs.push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(cleanHost)}.ico`);
  }
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

/** Never invent /careers paths — most company sites 404 there and crawlers
 *  (Ahrefs/GSC) count them as broken outbound links. Only use an explicit
 *  careers URL stored on the startup (ATS board or verified path). */
export function careersUrl(website) {
  return null;
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
