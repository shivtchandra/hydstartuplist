import { isOpenToFreshers, parseYearsRequirement } from "../job-facets.js";
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
  const stated = parseYearsRequirement(typeof job.experience === "string" ? job.experience : "");
  if (stated && stated.lo >= 2) return false;
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

export function foreignOnly(job) {
  const paren = (String(job.title || "").match(/\(([^)]*)\)/) || [])[1] || "";
  // "(US Timezone)" / "English (US)" describe hours or language, not where you must live.
  const where = `${job.location || ""} ${/timezone|english|spanish|language/i.test(job.title || "") ? "" : paren}`;
  return FOREIGN_RE.test(where) && !INDIA_RE.test(where);
}

function recencyScore(job, now) {
  const t = Date.parse(job.postedAt || job.sourcePostedAt || job.firstSeenAt || "");
  if (!Number.isFinite(t)) return 0;
  const days = (now - t) / 86400000;
  if (days <= 3) return 5;
  if (days <= 14) return 3;
  if (days <= 30) return 1;
  return 0;
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

/** Top `limit` jobs for the profile, best first. Jobs whose family clearly mismatches are dropped. */
export function shortlistJobs(jobs, profile, { limit = 60, now = Date.now(), entryOnly = false } = {}) {
  const skillTests = profile.skills.filter((s) => s.strength !== "mentioned").map((s) => skillMatcher(s.name));
  const early = isEarlyCareer(profile);
  return jobs
    .filter((job) => !foreignOnly(job))
    // Senior bands are never realistic for a fresher; entry mode keeps only fresher-open roles.
    .filter((job) => !(early && ["senior", "lead", "manager"].includes(job.level)))
    .filter((job) => !entryOnly || isEntryJob(job))
    .map((job) => ({ job, ...prefilterScore(job, profile, { now, skillTests }) }))
    .filter((r) => r.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
