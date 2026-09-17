import fs from "fs";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { encodeFreshJobsSnapshot, decodeJobsSnapshot, companyResolutions } from "./jobs-cache-codec.js";
import { canonicalJobUrl, collapseDuplicatePostings } from "./job-lifecycle.js";
import path from "path";
import { getAdminDb } from "./firebaseAdmin.js";
import { isNextProductionBuild, withTimeout } from "./build-phase.js";
import { getApproved, getStartupBySlug, visibleHiring } from "./store.js";
import { startupSlug, slugify } from "./slug.js";
import { getJobBoostsAsync, jobIsBoosted } from "./placements.js";
import { buildCompanyMatcher, jobMatchesStartup } from "./jobs-match.js";
import { normalizeSector, inferExperienceLevel } from "./job-facets.js";
import { cleanScrapedTitle, isSpamOrConsultancyJob } from "./job-content.js";

function gccNames() {
  const file = path.join(process.cwd(), "data", "gccs.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")).map((g) => g.name.toLowerCase());
}

/** Known enterprise / non-startup employers that appear on ATS boards or Adzuna. */
const ENTERPRISE_DENYLIST = [
  "ncr voyix",
  "ncr corporation",
  "kantar",
  "amd",
  "honeywell",
  "warner bros",
  "warner brothers",
  "l'oréal",
  "l'oreal",
  "loreal",
  "fujitsu",
  "doordash",
  "coinbase",
  "tjx",
  "teradata",
  "diebold",
  "blue yonder",
  "synchrony",
  "elevance",
  "carelon",
  "brillio",
  "capco",
  "zscaler",
  "anaplan",
  "roche",
  "f. hoffmann-la roche",
  "hoffmann-la roche",
  "crunchyroll",
  "coupang",
  "new relic",
  "inovalon",
  "telnyx",
  "worley",
  "viasat",
  "ghx",
  "global healthcare exchange",
  "schrodinger",
  "schrödinger",
  "centific",
  "truveta",
  "khan academy",
  "accordion",
  "indium software",
  "cigna",
  "sutherland",
  "evernorth",
  "ibm",
  "invesco",
  "kyndryl",
  "flutter",
  "jade global",
  "state street",
  "desri",
  "deloitte",
  "zoetis",
  "wells fargo",
  "wellsfargo",
  "msd",
  "merck",
  "hsbc",
  "mcdonald's",
  "hartford",
  "statestreet",
  "jadeglobal",
  "flutter entertainment",
];

function companyNeedle(job) {
  return String(job.company || "").toLowerCase().trim();
}

function matchesNameList(company, names) {
  if (!company) return false;
  return names.some((n) => {
    if (!n) return false;
    if (company === n) return true;
    // Short tokens (amd, ibm) require word-boundary style matches to avoid "amanda".
    if (n.length <= 3) {
      return new RegExp(`(?:^|[^a-z0-9])${n}(?:[^a-z0-9]|$)`).test(company);
    }
    return company.includes(n) || (n.length >= 5 && n.includes(company));
  });
}

/**
 * Classify a job for Jobs tabs/badges.
 * startup — linked to an approved map startup (startupId or name match), careers feed, or board tagged startup
 * gcc — gccs.json / board employerType gcc
 * enterprise — known corps / board employerType enterprise
 * other — everything else (untyped ATS, Adzuna orphans)
 */
export function categorize(job, { gccs = [], matcher = null } = {}) {
  const et = job.employerType || null;
  const company = companyNeedle(job);

  // Approved map linkage always wins over board tags / denylist.
  if (job.source === "careers" || job.startupId) return "startup";
  if (matcher && job.company) {
    const hit = matcher.resolve(job.company);
    if (hit) return "startup";
  }
  if (et === "startup") return "startup";

  if (et === "gcc" || matchesNameList(company, gccs)) return "gcc";

  if (et === "enterprise" || matchesNameList(company, ENTERPRISE_DENYLIST)) return "enterprise";

  if (et === "other") return "other";
  return "other";
}


function loadAtsBoardIndex() {
  const file = path.join(process.cwd(), "data", "ats-boards.json");
  try {
    const boards = JSON.parse(fs.readFileSync(file, "utf-8"));
    const byKey = new Map();
    for (const b of boards) {
      if (!b?.atsProvider || !b?.atsSlug) continue;
      byKey.set(`${b.atsProvider}:${String(b.atsSlug).toLowerCase()}`, b);
    }
    return byKey;
  } catch {
    return new Map();
  }
}

/** Fill employerType / website / startupId from local board registry for older synced jobs. */
function stampAtsBoardMeta(jobs) {
  const boards = loadAtsBoardIndex();
  if (!boards.size) return jobs;
  return jobs.map((j) => {
    if (j.source !== "ats" || !j.atsProvider || !j.atsSlug) return j;
    const b = boards.get(`${j.atsProvider}:${String(j.atsSlug).toLowerCase()}`);
    if (!b) return j;
    return {
      ...j,
      startupId: j.startupId || b.startupId || null,
      employerType: j.employerType || b.employerType || null,
      website: j.website || b.website || null,
      boardUrl: j.boardUrl || b.boardUrl || null,
    };
  });
}

export function categoryLabel(category) {
  switch (category) {
    case "startup":
      return "Startup";
    case "gcc":
      return "GCC";
    case "enterprise":
      return "Enterprise";
    default:
      return "Other";
  }
}

async function careerPicks() {
  const all = await getApproved();
  const jobs = [];
  for (const s of all.filter((startup) => startup.active !== false)) {
    const hiring = visibleHiring(s);
    if (!hiring || !Array.isArray(hiring.roles)) continue;
    for (const role of hiring.roles) {
      jobs.push({
        id: `careers-${s.id}-${role.url}`,
        title: role.title,
        company: s.name,
        location: s.area || "Hyderabad",
        url: role.url,
        postedAt: role.postedAt || null,
        sourcePostedAt: role.postedAt || null,
        firstSeenAt: role.firstSeenAt || null,
        lastCheckedAt: hiring.checkedAt || null,
        fetchedAt: hiring.checkedAt || null,
        description: role.description || null,
        salary: role.salary || null,
        source: "careers",
        sector: normalizeSector(s.sector) || null,
      });
    }
  }
  return jobs;
}

async function withBoost(jobs) {
  const boosts = await getJobBoostsAsync();
  return jobs
    .map((j) => ({ ...j, sponsored: jobIsBoosted(j, boosts) }))
    .sort((a, b) => {
      const score = (j) => {
        const posted = Date.parse(j.sourcePostedAt || j.postedAt || "") || 0;
        if (posted) return posted + 1e15;
        return Date.parse(j.firstSeenAt || "") || 0;
      };
      return score(b) - score(a);
    });
}

function normalizeCompanyKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function companyCoveredByBoards(company, boardKeys) {
  const c = normalizeCompanyKey(company);
  if (!c || !boardKeys?.length) return false;
  return boardKeys.some((b) => c === b || c.includes(b) || b.includes(c));
}

/** Drop Adzuna rows for employers we already sync via ATS boards (avoids duplicate Roche/etc.). */
function filterAdzunaAgainstBoards(adzunaJobs, atsJobs, boardNames = []) {
  const keys = [
    ...boardNames.map(normalizeCompanyKey).filter(Boolean),
    ...atsJobs.map((j) => normalizeCompanyKey(j.company)).filter(Boolean),
  ];
  const uniq = [...new Set(keys)].filter((k) => k.length >= 3);
  if (!uniq.length) return adzunaJobs;
  return adzunaJobs.filter((j) => !companyCoveredByBoards(j.company, uniq));
}

function mergeJobFeeds(atsJobs, adzunaJobs, careerJobs, priorityJobs = [], boardNames = []) {
  // Prefer ATS over Adzuna when apply URLs collide; also drop Adzuna for boarded employers.
  const byUrl = new Map();
  const out = [];
  const adzunaFiltered = filterAdzunaAgainstBoards(adzunaJobs, atsJobs, boardNames);

  const push = (job, rank) => {
    const key = canonicalJobUrl(job.url);
    if (key && byUrl.has(key)) {
      const prev = byUrl.get(key);
      if (rank >= prev.rank) return;
      const idx = out.indexOf(prev.job);
      if (idx >= 0) out.splice(idx, 1);
    }
    if (key) byUrl.set(key, { job, rank });
    out.push(job);
  };

  for (const j of atsJobs) push(j, 0);
  for (const j of priorityJobs) push(j, 1);
  for (const j of careerJobs) push(j, 2);
  for (const j of adzunaFiltered) push(j, 3);
  return out;
}


async function withSector(jobs, matcher) {
  try {
    const startups = await getApproved();
    const byId = new Map(startups.map((s) => [s.id, s]));
    return jobs.map((j) => {
      const fromId = j.startupId ? byId.get(j.startupId) : null;
      const hit = fromId ? { startup: fromId } : j.company ? matcher.resolve(j.company) : null;
      const s = hit?.startup;
      return {
        ...j,
        sector: normalizeSector(j.sector || s?.sector || null) || null,
        fundingStage: j.fundingStage || s?.fundingStage || null,
        area: j.area || s?.area || null,
        website: j.website || s?.website || null,
        logoUrl: j.logoUrl || s?.logoUrl || null,
      };
    });
  } catch (err) {
    console.error("jobs sector enrich error:", err);
    return jobs.map((j) => ({ ...j, sector: normalizeSector(j.sector) || null }));
  }
}

function applyCategories(jobs, gccs, matcher) {
  return jobs.map((j) => ({ ...j, category: categorize(j, { gccs, matcher }) }));
}

const JOBS_TTL_MS = 60_000;
const JOBS_DATA_CACHE_SECONDS = 300;
let jobsMemCache = null;
let jobsMemFetchedAt = 0;
let lastEncoded = null;

const getPersistedRuntimeJobs = unstable_cache(
  async () => {
    const jobs = await loadAllJobs();
    return encodeFreshJobsSnapshot({ jobs, sourceStale: jobs.sourceStale === true, resolutions: jobs.companyResolutions });
  },
  ["public-jobs-compressed-v4"],
  { revalidate: JOBS_DATA_CACHE_SECONDS, tags: ["public-jobs"] }
);

export const getAllJobs = cache(async () => {
  if (isNextProductionBuild() && jobsMemCache && Date.now() - jobsMemFetchedAt < JOBS_TTL_MS) {
    return jobsMemCache;
  }
  // Build workers intentionally use the small filesystem-only feed. Runtime
  // requests share the expensive Firestore merge through Vercel's Data Cache,
  // so a crawler fan-out does not rebuild it once per function instance/page.
  let jobs;
  if (isNextProductionBuild()) {
    jobs = await loadAllJobs();
  } else {
    let snapshot;
    try {
      const encoded = await getPersistedRuntimeJobs();
      // Always consult the shared cache so tag invalidation reaches warm instances.
      if (encoded === lastEncoded && jobsMemCache) return jobsMemCache;
      snapshot = decodeJobsSnapshot(encoded);
      lastEncoded = encoded;
    } catch (error) {
      // An unusually large future feed must still serve all jobs without truncation.
      // Emit a clear capacity signal rather than silently failing cache writes.
      if (!error.snapshot) throw error;
      console.error(error.code === "JOBS_SOURCE_STALE" ? error.message : "jobs cache capacity exceeded; serving uncached snapshot");
      snapshot = error.snapshot;
      lastEncoded = null;
    }
    jobs = snapshot.jobs;
    Object.defineProperty(jobs, "sourceStale", { value: snapshot.sourceStale === true });
    Object.defineProperty(jobs, "companyResolutions", { value: snapshot.resolutions || [] });
  }
  healJobTitles(jobs);
  dropOtherMetroRows(jobs);
  jobsMemCache = jobs;
  jobsMemFetchedAt = Date.now();
  return jobs;
});

/**
 * Strip ATS job ids that older snapshots captured into titles.
 *
 * Mutates in place so the array keeps the sourceStale / companyResolutions
 * properties defined on it above, and so already-cached feeds heal without a resync.
 */
function healJobTitles(jobs) {
  if (!Array.isArray(jobs)) return jobs;
  for (const job of jobs) {
    if (!job || typeof job.title !== "string" || !job.title.includes("/")) continue;
    const cleaned = cleanScrapedTitle(job.title, job.url);
    if (cleaned && cleaned !== job.title) job.title = cleaned;
  }
  return jobs;
}

/**
 * Drop rows whose own title names a different metro. A board for Hyderabad should never
 * surface "… Associate Bengaluru", on any view, so this runs for every reader rather than
 * only the fresher feed. Mutates in place for the same reason as healJobTitles.
 */
function dropOtherMetroRows(jobs) {
  if (!Array.isArray(jobs)) return jobs;
  for (let i = jobs.length - 1; i >= 0; i -= 1) {
    if (OTHER_METRO_RE.test(jobs[i]?.title || "")) jobs.splice(i, 1);
  }
  return jobs;
}

async function loadAllJobs() {
  const picks = await careerPicks();
  const gccs = gccNames();
  let matcher = null;
  try {
    matcher = buildCompanyMatcher(await getApproved());
  } catch (err) {
    console.error("jobs matcher error:", err);
  }

  const finish = async (jobs, stale = false) => {
    const enriched = await withSector(jobs, matcher);
    const result = await withBoost(applyCategories(enriched.filter(j => j.status !== "closed"), gccs, matcher));
    Object.defineProperty(result, "sourceStale", { value: stale });
    Object.defineProperty(result, "companyResolutions", { value: companyResolutions(result, matcher) });
    return result;
  };

  // Build-time: filesystem careers only — Firestore + fuzzy matching was
  // blowing past Vercel Hobby static generation timeouts.
  if (isNextProductionBuild()) {
    return finish(picks);
  }

  const db = await getAdminDb();
  if (!db) {
    console.error("jobs source unavailable: runtime database is not configured");
    return finish(picks, true);
  }

  const readFeed = async (id) => {
    const snap = await withTimeout(db.collection("job_board").doc(id).get().catch(error => {
      console.error("jobs source read failed:", id, error.code || "unknown");
      return null;
    }), 8_000, null);
    if (!snap) console.error("jobs source unavailable or timed out:", id);
    return snap;
  };
  try {
    const [atsSnap, adzunaSnap, prioritySnap] = await Promise.all([
      readFeed("ats_latest"),
      readFeed("adzuna_latest"),
      readFeed("priority_careers_latest"),
    ]);
    const atsJobs = stampAtsBoardMeta(atsSnap?.exists ? atsSnap.data().jobs || [] : []);
    const rawAdzunaJobs = adzunaSnap?.exists ? adzunaSnap.data().jobs || [] : [];
    const adzunaJobs = rawAdzunaJobs.filter((j) => !isSpamOrConsultancyJob(j));
    const priorityJobs = prioritySnap?.exists ? prioritySnap.data().jobs || [] : [];
    const boardNames = [...loadAtsBoardIndex().values()].map((b) => b.name).filter(Boolean);
    const merged = mergeJobFeeds(atsJobs, adzunaJobs, picks, priorityJobs, boardNames);
    return finish(merged, !atsSnap?.exists || !adzunaSnap?.exists || !prioritySnap);
  } catch (err) {
    console.error("jobs read error:", err);
    return finish(picks, true);
  }
}

const jobIndexes = new WeakMap();
const getJobsMatcher = cache(async () => {
  const jobs = await getAllJobs();
  if (jobIndexes.has(jobs)) return jobIndexes.get(jobs);
  const resolutions = new Map(jobs.companyResolutions);
  const byId = new Map();
  // Preserve the original first-match behavior if a source repeats an ID.
  for (const job of jobs) if (!byId.has(job.id)) byId.set(job.id, job);
  const index = { byId, resolve: name => resolutions.get(name) || null };
  jobIndexes.set(jobs, index);
  return index;
});

function matchesCompany(job, needle) {
  const c = (job.company || "").toLowerCase();
  const n = needle.toLowerCase();
  return c === n || c.includes(n) || n.includes(c);
}

export const getJobsForCompany = cache(async (companyName) => {
  if (!companyName) return [];
  const jobs = await getAllJobs();
  return jobs.filter((j) => matchesCompany(j, companyName));
});

export const getJobById = cache(async (id) => {
  if (!id) return null;
  return (await getJobsMatcher()).byId.get(id) || null;
});

export const getJobsForStartupSlug = cache(async (slug) => {
  const startup = await getStartupBySlug(slug);
  const jobs = await getAllJobs();

  if (startup) {
    const matcher = await getJobsMatcher();
    const filtered = jobs.filter((j) => jobMatchesStartup(j, startup, matcher));
    return { startup, jobs: filtered, companyName: startup.name };
  }

  // Orphan employer: no map profile — match by slugified company name on the job feed.
  const needle = String(slug || "").toLowerCase();
  const filtered = jobs.filter((j) => j.company && slugify(j.company) === needle);
  if (!filtered.length) return { startup: null, jobs: [], companyName: null };
  return { startup: null, jobs: filtered, companyName: filtered[0].company };
});

export async function getCompaniesWithJobs() {
  const jobs = await getAllJobs();
  const matcher = await getJobsMatcher();
  const bySlug = new Map();

  for (const j of jobs) {
    if (!j.company) continue;
    const hit = matcher.resolve(j.company);
    if (hit) {
      const existing = bySlug.get(hit.slug);
      if (existing) existing.count += 1;
      else bySlug.set(hit.slug, { slug: hit.slug, name: hit.startup.name, count: 1, startupId: hit.startup.id });
      continue;
    }
    // Orphan employer (ATS/Adzuna without map profile)
    const slug = slugify(j.company);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (existing) existing.count += 1;
    else bySlug.set(slug, { slug, name: j.company, count: 1, startupId: j.startupId || null });
  }

  return [...bySlug.values()].sort((a, b) => b.count - a.count);
}

export const getJobsBySector = cache(async (sector) => {
  const startups = await getApproved();
  const names = new Set(
    startups.filter((s) => s.sector === sector && s.active !== false).map((s) => s.name.toLowerCase())
  );
  const jobs = await getAllJobs();
  const matcher = await getJobsMatcher();
  return jobs.filter((j) => {
    if (names.has((j.company || "").toLowerCase())) return true;
    const hit = matcher.resolve(j.company);
    return hit && hit.startup.sector === sector;
  });
});

export const getJobsByArea = cache(async (area) => {
  const needle = area.toLowerCase();
  const startups = await getApproved();
  const names = new Set(
    startups
      .filter((s) => s.active !== false && (s.area || "").toLowerCase().includes(needle))
      .map((s) => s.name.toLowerCase())
  );
  const jobs = await getAllJobs();
  const matcher = await getJobsMatcher();
  return jobs.filter((j) => {
    if ((j.location || "").toLowerCase().includes(needle)) return true;
    if (names.has((j.company || "").toLowerCase())) return true;
    const hit = matcher.resolve(j.company);
    return hit && (hit.startup.area || "").toLowerCase().includes(needle);
  });
});

const getJobsByRoleKeywords = cache(async (keywordsKey) => {
  const needles = keywordsKey.split("\u0000");
  const jobs = await getAllJobs();
  return jobs.filter((j) => {
    const title = (j.title || "").toLowerCase();
    return needles.some((n) => title.includes(n));
  });
});

export async function getJobsByRole(landing) {
  if (!landing?.keywords?.length) return [];
  return getJobsByRoleKeywords(landing.keywords.map((k) => k.toLowerCase()).join("\u0000"));
}

/** Early-career / fresher / intern band using title+description heuristics. */
export async function getJobsByExperience(levels) {
  const want = new Set(Array.isArray(levels) ? levels : [levels]);
  const jobs = await getAllJobs();
  return jobs.filter((j) => {
    const level = inferExperienceLevel(j.title, j.description);
    return level && want.has(level);
  });
}

/**
 * Training-institute and body-shop feeds. Their "fresher" ads are paid-training or
 * bench funnels rather than direct hires, so they stay off /jobs/fresher while
 * remaining browsable on the main board.
 */
const FRESHER_EMPLOYER_DENYLIST = [
  "vaakruthi",
  "artech infosystems",
  "waterleaf consultants",
];

/** Metros other than Hyderabad, used to catch rows whose title contradicts their location. */
const OTHER_METRO_RE =
  /\b(bengaluru|bangalore|chennai|pune|mumbai|gurgaon|gurugram|noida|new delhi|kolkata|ahmedabad|coimbatore|kochi|jaipur|indore|nagpur|visakhapatnam|vijayawada)\b/i;

/**
 * The /jobs/fresher feed: entry-level rows only, one row per distinct opening.
 *
 * Duplicate collapsing and the other-metro drop are shared with the main board now;
 * the staffing denylist stays local, because those employers are still legitimate
 * listings on /jobs and are only unhelpful as a fresher's first impression.
 *
 * Each row carries `openings` — how many identical postings collapsed into it.
 */
export async function getFresherJobs(levels) {
  const jobs = await getJobsByExperience(levels);
  const eligible = jobs.filter((job) => !matchesNameList(companyNeedle(job), FRESHER_EMPLOYER_DENYLIST));

  return collapseDuplicatePostings(eligible)
    .map((job) => ({ ...job, level: inferExperienceLevel(job.title, job.description) }))
    .sort((a, b) => {
      const at = Date.parse(a.postedAt || a.firstSeenAt || "") || 0;
      const bt = Date.parse(b.postedAt || b.firstSeenAt || "") || 0;
      return bt - at;
    });
}

export async function getHiringReportStats() {
  const [jobs, companies] = await Promise.all([
    getAllJobs(),
    getCompaniesWithJobs(),
  ]);

  const matcher = await getJobsMatcher();
  const sectorCounts = new Map();
  for (const j of jobs) {
    const hit = matcher.resolve(j.company);
    if (!hit?.startup.sector) continue;
    sectorCounts.set(hit.startup.sector, (sectorCounts.get(hit.startup.sector) || 0) + 1);
  }

  const topSectors = [...sectorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([sector, count]) => ({ sector, count }));

  return {
    totalRoles: jobs.length,
    startupRoles: jobs.filter((j) => j.category === "startup").length,
    topCompanies: companies.slice(0, 10),
    topSectors,
  };
}
