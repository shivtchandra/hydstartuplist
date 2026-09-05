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
  else if (provider === "phenom") raw = (job.data || job).description || (job.data || job).descriptionTeaser || null;
  else if (provider === "eightfold") raw = job.jobDescription || job.description || null;
  else if (provider === "radancy") raw = job.description || null;
  else if (provider === "workday") raw = job.description || job.jobDescription || null;
  else if (provider === "oraclecloud") raw = job.ExternalDescriptionStr || job.ShortDescriptionStr || null;
  else if (provider === "gr8people") raw = job.description || null;
  else if (provider === "htmlcareers") raw = job.description || null;
  else if (provider === "linkedin") raw = job.description || null;
  else if (provider === "zoho") raw = job.Job_Description || job.description || null;
  else if (provider === "successfactors") raw = job.description || null;
  else if (provider === "accufy") raw = job.description || job.intro || null;
  else if (provider === "keka") raw = job.description || null;
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
  if (provider === "phenom") {
    const j = job.data || job;
    return String(j.req_id || j.slug || j.id || "");
  }
  if (provider === "eightfold") return String(job.id || job.displayJobId || job.atsJobId || "");
  if (provider === "radancy") return String(job.id || job.url || "");
  if (provider === "workday") {
    const path = job.externalPath || "";
    const m = path.match(/_([A-Z0-9-]+)$/i);
    return String(m?.[1] || job.bulletFields?.[0] || path || "");
  }
  if (provider === "oraclecloud") return String(job.Id || "");
  if (provider === "gr8people") return String(job.number || job.id || "");
  if (provider === "htmlcareers") return String(job.id || job.url || "");
  if (provider === "linkedin") return String(job.id || job.url || "");
  if (provider === "zoho") return String(job.id || job.Job_Opening_Id || "");
  if (provider === "successfactors") {
    const resp = job.response || job;
    return String(resp.id || "");
  }
  if (provider === "accufy") return String(job.job_id || job.slug || job.id || "");
  if (provider === "keka") return String(job.id || "");
  return String(job.id || job.url || Math.random());
}

function applyUrlOf(provider, job, boardUrl, { jobUrlBase } = {}) {
  if (provider === "phenom") {
    const j = job.data || job;
    const slug = j.slug || j.req_id;
    const base = jobUrlBase || "https://careers.amd.com/careers-home/jobs";
    return (
      j.apply_url ||
      j.canonicalPositionUrl ||
      j.url ||
      (slug ? `${base.replace(/\/?$/, "")}/${slug}?lang=en-us` : null) ||
      boardUrl
    );
  }
  if (provider === "eightfold") {
    const path = job.positionUrl || (job.id ? `/careers/job/${job.id}` : null);
    if (path) {
      const base = jobUrlBase || "https://careers.qualcomm.com";
      return path.startsWith("http") ? path : `${base}${path}`;
    }
  }
  if (provider === "radancy") return job.url || boardUrl;
  if (provider === "workday") {
    const path = job.externalPath;
    if (path) {
      const base = jobUrlBase || boardUrl || "";
      return path.startsWith("http") ? path : `${base}${path}`;
    }
  }
  if (provider === "oraclecloud") {
    const base = jobUrlBase || "";
    return job.Id ? `${base}${job.Id}` : boardUrl;
  }
  if (provider === "gr8people") return job.url || job.applyUrl || boardUrl;
  if (provider === "htmlcareers") return job.url || boardUrl;
  if (provider === "linkedin") return job.url || boardUrl;
  if (provider === "zoho") return job.$url || job.url || boardUrl;
  if (provider === "successfactors") {
    const resp = job.response || job;
    const slug = resp.unifiedUrlTitle || resp.urlTitle || resp.unifiedStandardTitle || "job";
    const id = resp.id;
    if (id) {
      const base = (jobUrlBase || boardUrl || "https://www.jobs.global.fujitsu.com/job").replace(/\/?$/, "");
      return `${base}/${slug}/${id}-en_US`;
    }
  }
  if (provider === "accufy") {
    const slug = job.slug || job.job_id || job.id;
    if (slug) {
      const base = (jobUrlBase || "https://accufy.in/career").replace(/\/?$/, "");
      return `${base}/${slug}`;
    }
    return job.apply || boardUrl;
  }
  if (provider === "keka") {
    const id = job.id;
    if (id) {
      const base = (jobUrlBase || boardUrl || "").replace(/\/?$/, "");
      return `${base}/${id}`;
    }
  }
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
  if (provider === "eightfold" && job.postedTs) {
    const d = new Date(Number(job.postedTs) * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const src = provider === "phenom" ? (job.data || job) : job;
  const raw =
    src.first_published ||
    src.posted_date ||
    src.create_date ||
    src.updated_at ||
    src.createdAt ||
    src.created_at ||
    src.publishedOn ||
    src.postedOn ||
    src.PostedDate ||
    src.datePosted ||
    null;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Normalize a raw ATS job. Returns null if not Hyd/TG (when geoFilter=true).
 */
export function normalizeAtsJob(provider, job, { boardUrl, slug, companyName, geoFilter = true, jobUrlBase = null, defaultLocation = null } = {}) {
  let location = locationOf(provider, job);
  if (
    defaultLocation &&
    (!location ||
      /^\d+\s+Locations?$/i.test(location.trim()) ||
      !isHydOrTelanganaLocation(location))
  ) {
    location = defaultLocation;
  }
  if (geoFilter && !isHydOrTelanganaLocation(location)) return null;

  const externalId = externalIdOf(provider, job);
  if (!externalId) return null;

  const src = provider === "phenom" ? (job.data || job) : job;
  const sf = provider === "successfactors" ? (job.response || job) : null;
  const title =
    src.title ||
    src.Title ||
    src.Posting_Title ||
    src.text ||
    src.name ||
    sf?.unifiedStandardTitle ||
    job.title ||
    job.Title ||
    job.Posting_Title ||
    job.text ||
    job.name ||
    "Open Role";
  const url = applyUrlOf(provider, job, boardUrl, { jobUrlBase });
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

export function toPublicJob(
  normalized,
  { startupId = null, company, fetchedAt, employerType = null, website = null, boardUrl = null } = {}
) {
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
    employerType: employerType || (startupId ? "startup" : null),
    website: website || null,
    boardUrl: boardUrl || null,
  };
}
