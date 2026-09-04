import { stripHtml, normalizeSalary } from "../job-content.js";
import { isHydOrTelanganaLocation } from "./geo.js";
import { locationOf } from "./providers.js";

const DESC_MAX = 5000; // plain text; keep job_board/ats_latest under Firestore 1MB

function decodeHtmlEntities(str) {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function descriptionOf(provider, job) {
  let raw = null;
  if (provider === "greenhouse") raw = job.content || null;
  else if (provider === "lever") raw = job.descriptionPlain || job.description || null;
  else if (provider === "ashby") raw = job.descriptionPlain || job.descriptionHtml || job.description || null;
  else if (provider === "recruitee") raw = job.description || job.requirements || null;
  else if (provider === "workable") raw = job.description || job.full_description || null;
  else if (provider === "breezy") raw = job.description || null;
  else if (provider === "smartrecruiters") raw = job.jobAd?.sections?.jobDescription?.text || null;
  if (!raw) return null;
  const asString = decodeHtmlEntities(typeof raw === "string" ? raw : String(raw));
  // Store plain text (smaller + Firestore-safe); UI/schema already handle non-HTML
  const text = stripHtml(asString);
  if (!text) return null;
  return text.length > DESC_MAX ? text.slice(0, DESC_MAX) : text;
}

function salaryOf(provider, job) {
  if (provider === "lever" && job.salaryRange) {
    return normalizeSalary(job.salaryRange.min, job.salaryRange.max);
  }
  if (provider === "ashby" && job.compensation) {
    const c = job.compensation;
    const min = c.minValue ?? c.min ?? c.salaryMin ?? null;
    const max = c.maxValue ?? c.max ?? c.salaryMax ?? null;
    const sal = normalizeSalary(min, max);
    if (sal) return sal;
  }
  if (job.salary_min || job.salary_max || job.salaryMin || job.salaryMax) {
    return normalizeSalary(job.salary_min ?? job.salaryMin, job.salary_max ?? job.salaryMax);
  }
  return null;
}

function externalIdOf(provider, job) {
  if (provider === "greenhouse") return String(job.id ?? "");
  if (provider === "lever") return String(job.id ?? job.uid ?? "");
  if (provider === "ashby") return String(job.id ?? job.jobId ?? "");
  if (provider === "recruitee") return String(job.id ?? job.slug ?? "");
  if (provider === "workable") return String(job.shortcode || job.id || "");
  if (provider === "breezy") return String(job._id || job.id || "");
  if (provider === "smartrecruiters") return String(job.id || job.uuid || "");
  return String(job.id || job.url || Math.random());
}

function applyUrlOf(provider, job, boardUrl) {
  return (
    job.absolute_url ||
    job.hostedUrl ||
    job.applyUrl ||
    job.jobUrl ||
    job.url ||
    job.ref ||
    boardUrl
  );
}

function postedAtOf(provider, job) {
  const raw =
    job.first_published ||
    job.updated_at ||
    job.createdAt ||
    job.created_at ||
    job.publishedOn ||
    job.datePosted ||
    null;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Normalize a raw ATS job. Returns null if not Hyd/TG (when geoFilter=true).
 */
export function normalizeAtsJob(provider, job, { boardUrl, slug, companyName, geoFilter = true } = {}) {
  const location = locationOf(provider, job);
  if (geoFilter && !isHydOrTelanganaLocation(location)) return null;

  const externalId = externalIdOf(provider, job);
  if (!externalId) return null;

  const title = job.title || job.text || job.name || "Open Role";
  const url = applyUrlOf(provider, job, boardUrl);
  const description = descriptionOf(provider, job);
  const salary = salaryOf(provider, job);
  const postedAt = postedAtOf(provider, job);

  return {
    externalId,
    title: String(title).replace(/<[^>]+>/g, "").trim(),
    url,
    location: location.trim() || "Hyderabad",
    descriptionText: description,
    salary,
    postedAt,
    companyName: companyName || job.company?.name || null,
    atsProvider: provider,
    atsSlug: slug,
  };
}

export function toPublicJob(normalized, { startupId = null, company, fetchedAt } = {}) {
  const id = `ats-${normalized.atsProvider}-${normalized.atsSlug}-${normalized.externalId}`;
  return {
    id,
    title: normalized.title,
    company: company || normalized.companyName || normalized.atsSlug,
    location: normalized.location,
    url: normalized.url,
    postedAt: normalized.postedAt || fetchedAt || null,
    fetchedAt: fetchedAt || new Date().toISOString(),
    description: normalized.descriptionText || null,
    salary: normalized.salary || null,
    source: "ats",
    atsProvider: normalized.atsProvider,
    atsSlug: normalized.atsSlug,
    startupId: startupId || null,
  };
}
