/** Shared helpers for job descriptions, salary display, and schema parity. */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h2", "h3", "h4",
  "a", "span", "div",
]);

/**
 * Light HTML sanitizer for job descriptions (Adzuna / ATS).
 * Strips scripts, event handlers, and disallowed tags.
 */
export function sanitizeJobHtml(input) {
  if (!input || typeof input !== "string") return "";
  let html = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag, attrs = "") => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (match.startsWith("</")) return `</${name}>`;
    if (name === "br") return "<br/>";
    if (name === "a") {
      const href = (attrs.match(/href\s*=\s*(['"])(.*?)\1/i) || [])[2] || "";
      if (!/^https?:\/\//i.test(href)) return "<span>";
      return `<a href="${href.replace(/"/g, "&quot;")}" rel="noopener noreferrer" target="_blank">`;
    }
    return `<${name}>`;
  });

  return html.trim();
}

export function stripHtml(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Lowercase alphanumerics only, so "Bb71O VqO 6G" and "bb71O_VqO_6G" compare equal. */
function titleSegmentKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function urlPathSegments(url) {
  const raw = String(url || "");
  if (!raw) return [];
  try {
    return new URL(raw).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Drop ATS job-id path segments that leak into titles scraped from URL slugs,
 * e.g. "PqqFrapezemf/Business Development Associate" → "Business Development Associate".
 *
 * Matched against the job URL rather than guessed from the text: a heuristic on casing
 * cannot separate an id like "PqqFrapezemf" from a real product name like "SailPoint",
 * so a leading part is only removed when it is literally a path segment of the URL.
 */
export function cleanScrapedTitle(title, url) {
  const raw = String(title || "").trim();
  if (!raw.includes("/")) return raw;
  const parts = raw.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return raw;

  const segments = new Set(urlPathSegments(url).map(titleSegmentKey));
  if (!segments.size) return raw;

  let start = 0;
  while (start < parts.length - 1 && segments.has(titleSegmentKey(parts[start]))) start += 1;
  return start ? parts.slice(start).join(" / ") : raw;
}

/** Visible + schema description — same string for both. */
export function jobDescriptionForPage(job) {
  const raw = job?.description;
  if (raw && String(raw).trim()) {
    // Prefer stored plain text; only sanitize when the payload is HTML
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      const sanitized = sanitizeJobHtml(raw);
      if (sanitized) return sanitized;
      const plain = stripHtml(raw);
      if (plain) return plain;
    } else {
      return String(raw).trim();
    }
  }
  const loc = job?.location || "Hyderabad";
  return `${job?.title || "Role"} at ${job?.company || "a Hyderabad company"} in ${loc}. Apply via the employer's official listing.`;
}

export function jobDescriptionIsHtml(desc) {
  return /<[a-z][\s\S]*>/i.test(desc || "");
}

export function formatSalaryInr(salary) {
  if (!salary) return null;
  const min = salary.min != null ? Number(salary.min) : null;
  const max = salary.max != null ? Number(salary.max) : null;
  if (!Number.isFinite(min) && !Number.isFinite(max)) return null;

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  if (Number.isFinite(min) && Number.isFinite(max)) return `${fmt(min)} – ${fmt(max)} / year`;
  if (Number.isFinite(min)) return `From ${fmt(min)} / year`;
  return `Up to ${fmt(max)} / year`;
}

/** Normalize Adzuna/ATS salary into { min?, max? } or null. */
export function normalizeSalary(min, max) {
  const lo = min != null && Number(min) > 0 ? Number(min) : null;
  const hi = max != null && Number(max) > 0 ? Number(max) : null;
  if (lo == null && hi == null) return null;
  return { min: lo, max: hi };
}

export const ADZUNA_FRESH_DAYS = 3;
export const CAREERS_FRESH_DAYS = 7;
export const ATS_FRESH_DAYS = 3;

/**
 * Staffing agencies, recruitment consultancies, body shops, and placement agencies.
 * These post third-party, contract-to-hire, or bench jobs rather than direct employer roles.
 */
export const STAFFING_CONSULTANCY_DENYLIST = [
  "adecco",
  "randstad",
  "michael page",
  "page personnel",
  "teamlease",
  "quess corp",
  "quesscorp",
  "kelly services",
  "turing",
  "manpower",
  "manpowergroup",
  "allegis",
  "allegis group",
  "robert half",
  "abc consultants",
  "waterleaf consultants",
  "vaakruthi",
  "artech infosystems",
  "artech information systems",
  "talent corner",
  "talent bridge",
  "talent recruit",
  "talent acquisition group",
  "placement consultancy",
  "staffing solutions",
  "hr solutions",
  "global resourcing",
  "resource management",
  "synergy resource",
  "synergy consultants",
  "hirecraft",
  "peoplestrong",
  "careernet",
  "anzy global",
  "genius consultants",
  "ikya human capital",
  "alecalon staffing",
  "v-soft consulting",
  "collabera",
  "experis",
  "apex systems",
  "teksystems",
  "aerotek",
  "disys",
  "compucom",
  "diverselynx",
  "e-monies",
  "future focus infotech",
  "growel sophistec",
  "idexcel",
  "ktekresourcing",
  "mindlance",
  "nlb services",
  "pyramid consulting",
  "rangam consultants",
  "ustech solutions",
  "vaisesika consulting",
  "vlink india",
  "zensar staffing",
];

const CONSULTANCY_PHRASES = [
  /\bour client (?:is|in|a|has)\b/i,
  /\bhiring (?:for|on behalf of) (?:our |a |top |leading |reputed )?client\b/i,
  /\bclient of (?:placement|consultancy|staffing|hr|recruitment)\b/i,
  /\bthird[- ]party payroll\b/i,
  /\bcontract to hire\b/i,
  /\bplacement consultancy\b/i,
  /\bstaffing solutions?\b/i,
  /\bconfidential client\b/i,
  /\breputed client\b/i,
  /\bleading (?:mnc|it company|client) (?:is hiring|looking for)\b/i,
  /\bimmediate joiners? for our client\b/i,
  /\bpayroll of\b.*\bconsulting\b/i,
  /\bconsultancy fee\b/i,
  /\bplacement assistance\b/i,
];

const GENERIC_ORPHAN_COMPANIES = [
  "confidential",
  "unknown",
  "undisclosed",
  "leading mnc",
  "reputed company",
  "top it company",
  "it client",
  "client of",
  "placement agency",
];

/**
 * Filter out third-party staffing consultancies, body-shop listings,
 * and vague ghost-employer posts from aggregators.
 */
export function isSpamOrConsultancyJob(job) {
  if (!job) return true;
  const company = String(job.company || "").toLowerCase().trim();
  if (!company || company.length < 2) return true;

  if (GENERIC_ORPHAN_COMPANIES.some((g) => company === g || company.startsWith(g))) {
    return true;
  }

  // Exact or word-boundary check against staffing denylist
  const isDenylisted = STAFFING_CONSULTANCY_DENYLIST.some((d) => {
    if (company === d) return true;
    if (d.length <= 4) return new RegExp(`(?:^|[^a-z0-9])${d}(?:[^a-z0-9]|$)`, "i").test(company);
    return company.includes(d);
  });
  if (isDenylisted) return true;

  // Check title & description for agency tropes
  const text = `${job.title || ""} ${job.description || ""}`;
  if (CONSULTANCY_PHRASES.some((rx) => rx.test(text))) {
    return true;
  }

  return false;
}

export function jobValidThroughDate(job) {
  const posted = job?.postedAt ? new Date(job.postedAt) : new Date();
  const base = job?.fetchedAt ? new Date(job.fetchedAt) : posted;
  let days = 30;
  if (job?.source === "adzuna") days = ADZUNA_FRESH_DAYS;
  else if (job?.source === "ats") days = ATS_FRESH_DAYS;
  else if (job?.source === "careers") days = CAREERS_FRESH_DAYS;
  if (job?.validThrough) {
    const explicit = new Date(job.validThrough);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  const vt = new Date(base);
  vt.setUTCDate(vt.getUTCDate() + days);
  return vt;
}

