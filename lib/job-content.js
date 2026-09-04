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

/** Visible + schema description — same string for both. */
export function jobDescriptionForPage(job) {
  const raw = job?.description;
  if (raw && String(raw).trim()) {
    const sanitized = sanitizeJobHtml(raw);
    if (sanitized) return sanitized;
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

export function jobValidThroughDate(job) {
  const posted = job?.postedAt ? new Date(job.postedAt) : new Date();
  const base = job?.fetchedAt ? new Date(job.fetchedAt) : posted;
  let days = 30;
  if (job?.source === "adzuna") days = ADZUNA_FRESH_DAYS;
  else if (job?.source === "careers") days = CAREERS_FRESH_DAYS;
  if (job?.validThrough) {
    const explicit = new Date(job.validThrough);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  const vt = new Date(base);
  vt.setUTCDate(vt.getUTCDate() + days);
  return vt;
}
