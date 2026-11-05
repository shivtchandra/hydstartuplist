import { isOpenToFreshers, parseYearsRequirement } from "../job-facets.js";
import { canonicalJobUrl, validDate } from "../job-lifecycle.js";
// Stage A of career matching: cheap, instant ranking of every job in the
// static index against the candidate profile. The index only carries title,
// company, role family, level and work mode (no description), so this narrows
// ~6k jobs to a shortlist; Stage B (AI, full descriptions) does the real scoring.

const LEVEL_ORDER = ["intern", "junior", "mid", "senior", "lead", "manager"];
const STOP = new Set(["and", "the", "for", "with", "ii", "iii", "iv", "i", "of", "in", "at", "to", "a", "an", "&", "-", "–", "sr", "jr"]);

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#./ ]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[./]+|[./]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-term matcher for a skill name. Short names (<= 3 chars, e.g. "Go", "R",
 * "AI", "JS") must match as standalone tokens so "JSON", "Django", "maintain" or
 * "next steps" don't count.
 */
export function skillMatcher(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return () => false;
  const body = escapeRe(n).replace(/\\ /g, "[\\s-]?");
  const re = new RegExp(`(^|[^a-z0-9+#])${body}(?=$|[^a-z0-9+#])`, "i");
  return (text) => re.test(text);
}

function levelScore(jobLevel, candidateLevel, inferred) {
  const j = LEVEL_ORDER.indexOf(jobLevel);
  const c = LEVEL_ORDER.indexOf(candidateLevel);
  if (j < 0 || c < 0) return 8; // unknown: neutral
  const gap = j - c; // positive = job more senior than candidate
  const soft = inferred ? 2 : 0; // inferred levels are guesses; penalise less
  if (gap === 0) return 15;
  if (gap === -1) return 11;
  if (gap === 1) return 7 + soft;
  if (gap < -1) return 5;
  return Math.max(0, 1 + soft - (gap - 2) * 3); // 2+ levels above: near-zero
}

export const EARLY_LEVELS = new Set(["intern", "junior"]);
const ENTRY_TITLE_RE = /\b(intern(ship)?|trainee|apprentice|fresher|graduate|new grad|entry[\s-]?level|campus|junior|jr\.?|associate)\b/i;

/** Student / fresher / <2y candidate: projects and internships are their experience. */
export function isEarlyCareer(profile) {
  return EARLY_LEVELS.has(profile?.level);
}

/** Job open to freshers: early level band or an entry word in the title. */
export function isEntryJob(job, now = Date.now()) {
  if (!isOpenToFreshers(job, now)) return false;
  // "Associate Software Engineer · 2-5 years" was tagged Fresher-open on its title alone.
  const stated = parseYearsRequirement(typeof job.experience === "string" ? job.experience : "") || parseYearsRequirement(String(job.description || ""));
  if (stated && stated.lo > 0) return false;
  if (EARLY_LEVELS.has(job.level)) return true;
  const title = job.title || "";
  // "Senior Associate", "Lead Trainee Program Manager" etc. are not entry roles.
  return ENTRY_TITLE_RE.test(title) && !/\b(senior|sr\.?|lead|principal|staff|manager|director|head)\b/i.test(title);
}

function titleScore(title, targetTitles, skillTests) {
  const tt = new Set(tokenize(title));
  if (!tt.size) return 0;
  let best = 0;
  for (const target of targetTitles) {
    const tk = tokenize(target);
    if (!tk.length) continue;
    const hit = tk.filter((t) => tt.has(t)).length;
    best = Math.max(best, hit / tk.length);
  }
  const skillHits = skillTests.filter((test) => test(title)).length;
  return Math.round(best * 30) + Math.min(10, skillHits * 5);
}

// Remote roles restricted to another country are not open to Hyderabad candidates.
const FOREIGN_RE = /\b(usa?|united states|canada|uk|united kingdom|europe|emea|latam|americas|germany|france|spain|portugal|poland|netherlands|ireland|brazil|mexico|argentina|colombia|venezuela|chile|t(?:u|ü)rk(?:ey|iye)|philippines|singapore|australia|japan|vietnam|indonesia|malaysia|egypt|nigeria|kenya|south africa|pakistan|ukraine|romania|israel|uae)\b/i;
const INDIA_RE = /\b(india|ind|hyderabad|telangana|worldwide|global|anywhere|apac)\b/i;
// Country suffixes are not limited to the small set named by common feeds.
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const foreignNames = Array.from({ length: 676 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26), 65 + i % 26))
  .filter((code) => code !== "IN").map((code) => [code, regionNames.of(code)])
  .filter(([code, name]) => name !== code).map(([, name]) => escapeRe(name));
const FOREIGN_COUNTRY_RE = new RegExp("\\b(?:" + foreignNames.join("|") + ")\\b", "i");

export function foreignOnly(job) {
  const title = String(job.title || "");
  const paren = (title.match(/\(([^)]*)\)/) || [])[1] || "";
  const suffix = (title.match(/(?:\s[-–—]\s|,)\s*([^,]+(?:,\s*[^,]+)?)$/) || [])[1] || "";
  // Read a role's explicit location header, not country lists in company boilerplate.
  const header = (String(job.description || "").slice(0, 1500).match(/\blocation\s*:\s*([^:\n]{1,120})/i) || [])[1] || "";
  const isRestricted = (where) => (FOREIGN_RE.test(where) || FOREIGN_COUNTRY_RE.test(where)) && !INDIA_RE.test(where);
  const isLanguageOrHours = /timezone|english|spanish|language/i.test(title);
  return isRestricted(job.location || "") || isRestricted(header) ||
    (!isLanguageOrHours && (isRestricted(paren) || isRestricted(suffix)));
}

function recencyScore(job, now) {
  const t = Date.parse(job.postedAt || job.sourcePostedAt || job.firstSeenAt || "");
  if (!Number.isFinite(t)) return 0;
  const days = (now - t) / 86400000;
  if (days <= 1) return 15;
  if (days <= 3) return 10;
  if (days <= 7) return 5;
  if (days <= 14) return 0;
  if (days <= 30) return -10;
  if (days <= 60) return -25;
  return -45; // Stale jobs (> 60 days) heavily penalized
}

/**
 * Score one index job 0..100 against a profile from /api/career/profile.
 * Returns { score, reasons[] } so the UI can explain shortlisted jobs before AI runs.
 */
export function prefilterScore(job, profile, { now = Date.now(), skillTests } = {}) {
  const tests = skillTests || profile.skills.filter((s) => s.strength !== "mentioned").map((s) => skillMatcher(s.name));
  const reasons = [];
  let score = 0;

  const families = profile.roleFamilies || [];
  const fi = families.indexOf(job.role);
  if (fi === 0) { score += 30; reasons.push(`${job.role} role`); }
  else if (fi > 0) { score += 22; reasons.push(`${job.role} role`); }
  else if (!job.role || job.role === "Other") score += 6;

  const ts = titleScore(job.title, profile.targetTitles || [], tests);
  score += ts;
  if (ts >= 15) reasons.push("title fits your target roles");

  const ls = levelScore(job.level, profile.level, job.levelInferred);
  score += ls;
  if (ls >= 11) reasons.push("right seniority");

  if (isEarlyCareer(profile) && isEntryJob(job)) { score += 12; reasons.push("open to freshers"); }

  if (job.work === "remote" && profile.openToRemote) score += 3;
  if (job.isDirect) score += 2;
  score += recencyScore(job, now);

  return { score: Math.min(100, score), reasons };
}

/** Collapse reposts before counting or spending a matching request. Keep distinct locations. */
export function curateJobs(jobs) {
  const groups = new Map(), ids = new Set(), urls = new Set();
  const clean = (s) => String(s || "").toLowerCase().replace(/^job opening\s*[:\-]?\s*/i, "").replace(/\band\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  for (const job of jobs) {
    if (!job?.id || ["closed", "expired", "removed"].includes(job.status) || foreignOnly(job)) continue;
    const url = canonicalJobUrl(job.applyUrl || job.url);
    if (ids.has(job.id) || (url && urls.has(url))) continue;
    ids.add(job.id); if (url) urls.add(url);
    // Some remote boards advertise the same India role under many city titles.
    const title = job.work === "remote"
      ? String(job.title || "").replace(/\s*[-–—]\s*[^,]+,\s*India\s*$/i, "")
      : job.title;
    const key = job.company
      ? [clean(job.company), clean(title), clean(job.location || job.area), job.work || ""].join("|")
      : job.id;
    const existing = groups.get(key);
    if (!existing || String(job.description || "").length > String(existing.description || "").length) groups.set(key, job);
  }
  return [...groups.values()];
}

/** Experience is one eligibility check, not a claim that every requirement is met. */
export function experienceEligibility(job, profile) {
  const required = parseYearsRequirement(String(job.experience || "")) || parseYearsRequirement(String(job.description || ""));
  if (!required) return { status: "unknown", label: "Experience not stated", reason: "Confirm the experience requirement in the full job post." };
  const years = Number(profile?.yearsExperience);
  if (!Number.isFinite(years)) return { status: "check", label: "Confirm experience", reason: `Role asks for ${required.lo}+ years; confirm your professional experience.` };
  if (required.lo > years) return {
    status: required.lo >= 3 && required.lo > Math.max(years + 2, years * 2) ? "outside" : "check",
    label: required.lo >= 3 && required.lo > Math.max(years + 2, years * 2) ? "Experience mismatch" : "Confirm experience",
    reason: `Role asks for ${required.lo}+ years; your resume profile shows ${years}. Confirm whether your experience qualifies.`,
  };
  return { status: "met", label: "Experience fits", reason: "" };
}

/** Preserve late qualifications; explicitly mark excerpts that still omit source text. */
export function matchingDescription(value) {
  const text = String(value || "");
  const max = 6000;
  if (text.length <= max) return text;
  const notice = "\n[The source continues beyond this excerpt. Do not assume omitted requirements are met.]";
  return text.slice(0, max - notice.length) + notice;
}

export function assessmentConfidence(description, match) {
  const caveats = [match?.why, ...(match?.gaps || [])].join(" ");
  const limited = String(description || "").trim().length < 300 || match?.confidence === "limited" ||
    /truncat|abbreviat|incomplete|(?:requirements?|description|posting).{0,45}(?:not (?:shown|available|provided)|unclear|does not (?:show|reveal)|missing)|(?:does not|doesn't).{0,20}(?:show|reveal).{0,30}requirements/i.test(caveats);
  return limited ? "limited" : "sufficient";
}

/** Only actual sightings count as availability evidence, never a generic fetch time. */
export function availabilityInfo(job, now = Date.now()) {
  const seen = validDate(job.lastSeenAt, now);
  if (!seen) return { recent: false, label: "Availability not verified" };
  const days = Math.floor((now - Date.parse(seen)) / 86400000);
  return { recent: days <= 7 && (!job.status || job.status === "active"), label: `Seen on source ${days === 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`}` };
}

export function isRecommendedRow(row, now = Date.now()) {
  const t = Date.parse(row.job?.postedAt || row.job?.sourcePostedAt || row.job?.firstSeenAt || "");
  const days = Number.isFinite(t) ? Math.floor((now - t) / 86400000) : 0;
  const isFresh = days <= 14;
  return Boolean(row.match && row.match.score >= 65 && row.confidence === "sufficient" &&
    !["check", "outside"].includes(row.eligibility.status) && row.availability.recent && isFresh && !foreignOnly(row.job || {}));
}

/** Top `limit` jobs for the profile, best first. Jobs whose family clearly mismatches are dropped. */
export function shortlistJobs(jobs, profile, { limit = 60, now = Date.now(), entryOnly = false, maxDays } = {}) {
  const skillTests = profile.skills.filter((s) => s.strength !== "mentioned").map((s) => skillMatcher(s.name));
  const early = isEarlyCareer(profile);
  const curated = curateJobs(jobs)
    .filter((job) => !foreignOnly(job))
    .filter((job) => experienceEligibility(job, profile).status !== "outside")
    // Senior bands are never realistic for a fresher; entry mode keeps only fresher-open roles.
    .filter((job) => !(early && ["senior", "lead", "manager"].includes(job.level)))
    .filter((job) => !entryOnly || isEntryJob(job));

  const filterByDays = (list, daysLimit) => {
    if (!daysLimit) return list;
    return list.filter((job) => {
      const t = Date.parse(job.postedAt || job.sourcePostedAt || job.firstSeenAt || "");
      if (!Number.isFinite(t)) return true;
      const days = Math.floor((now - t) / 86400000);
      return days <= daysLimit;
    });
  };

  let candidatePool = filterByDays(curated, maxDays);
  if (maxDays && candidatePool.length < 15 && curated.length >= 15) {
    candidatePool = filterByDays(curated, Math.max(maxDays * 2, 30));
  }

  return candidatePool
    .map((job) => ({ job, ...prefilterScore(job, profile, { now, skillTests }) }))
    .filter((r) => r.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
