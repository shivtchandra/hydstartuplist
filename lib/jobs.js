import fs from "fs";
import { cache } from "react";
import { canonicalJobUrl } from "./job-lifecycle.js";
import path from "path";
import { getAdminDb } from "./firebaseAdmin.js";
import { isNextProductionBuild, withTimeout } from "./build-phase.js";
import { getApproved, getStartupBySlug, visibleHiring } from "./store.js";
import { startupSlug, slugify } from "./slug.js";
import { getJobBoostsAsync, jobIsBoosted } from "./placements.js";
import { buildCompanyMatcher, jobMatchesStartup } from "./jobs-match.js";
import { normalizeSector } from "./job-facets.js";

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


async function withSector(jobs) {
  try {
    const startups = await getApproved();
    const matcher = buildCompanyMatcher(startups);
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
let jobsMemCache = null;
let jobsMemFetchedAt = 0;

export const getAllJobs = cache(async () => {
  if (jobsMemCache && Date.now() - jobsMemFetchedAt < JOBS_TTL_MS) {
    return jobsMemCache;
  }
  const jobs = await loadAllJobs();
  jobsMemCache = jobs;
  jobsMemFetchedAt = Date.now();
  return jobs;
});

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
    const enriched = await withSector(jobs);
    const result = await withBoost(applyCategories(enriched.filter(j => j.status !== "closed"), gccs, matcher));
    Object.defineProperty(result, "sourceStale", { value: stale });
    return result;
  };

  // Build-time: filesystem careers only — Firestore + fuzzy matching was
  // blowing past Vercel Hobby static generation timeouts.
  if (isNextProductionBuild()) {
    return finish(picks);
  }

  const db = await getAdminDb();
  if (!db) return finish(picks, !isNextProductionBuild());

  try {
    const [atsSnap, adzunaSnap, prioritySnap] = await Promise.all([
      withTimeout(db.collection("job_board").doc("ats_latest").get(), 8_000, null),
      withTimeout(db.collection("job_board").doc("adzuna_latest").get(), 8_000, null),
      withTimeout(db.collection("job_board").doc("priority_careers_latest").get(), 8_000, null),
    ]);
    const atsJobs = stampAtsBoardMeta(atsSnap?.exists ? atsSnap.data().jobs || [] : []);
    const adzunaJobs = adzunaSnap?.exists ? adzunaSnap.data().jobs || [] : [];
    const priorityJobs = prioritySnap?.exists ? prioritySnap.data().jobs || [] : [];
    const boardNames = [...loadAtsBoardIndex().values()].map((b) => b.name).filter(Boolean);
    const merged = mergeJobFeeds(atsJobs, adzunaJobs, picks, priorityJobs, boardNames);
    return finish(merged, !atsSnap || !adzunaSnap);
  } catch (err) {
    console.error("jobs read error:", err);
    return finish(picks);
  }
}

function matchesCompany(job, needle) {
  const c = (job.company || "").toLowerCase();
  const n = needle.toLowerCase();
  return c === n || c.includes(n) || n.includes(c);
}

export async function getJobsForCompany(companyName) {
  if (!companyName) return [];
  const jobs = await getAllJobs();
  return jobs.filter((j) => matchesCompany(j, companyName));
}

export async function getJobById(id) {
  if (!id) return null;
  const jobs = await getAllJobs();
  return jobs.find((j) => j.id === id) || null;
}

export async function getJobsForStartupSlug(slug) {
  const startup = await getStartupBySlug(slug);
  const jobs = await getAllJobs();

  if (startup) {
    const startups = await getApproved();
    const matcher = buildCompanyMatcher(startups);
    const filtered = jobs.filter((j) => jobMatchesStartup(j, startup, matcher));
    return { startup, jobs: filtered, companyName: startup.name };
  }

  // Orphan employer: no map profile — match by slugified company name on the job feed.
  const needle = String(slug || "").toLowerCase();
  const filtered = jobs.filter((j) => j.company && slugify(j.company) === needle);
  if (!filtered.length) return { startup: null, jobs: [], companyName: null };
  return { startup: null, jobs: filtered, companyName: filtered[0].company };
}

export async function getCompaniesWithJobs() {
  const [jobs, startups] = await Promise.all([getAllJobs(), getApproved()]);
  const matcher = buildCompanyMatcher(startups);
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

export async function getJobsBySector(sector) {
  const startups = await getApproved();
  const names = new Set(
    startups.filter((s) => s.sector === sector && s.active !== false).map((s) => s.name.toLowerCase())
  );
  const jobs = await getAllJobs();
  const matcher = buildCompanyMatcher(startups);
  return jobs.filter((j) => {
    if (names.has((j.company || "").toLowerCase())) return true;
    const hit = matcher.resolve(j.company);
    return hit && hit.startup.sector === sector;
  });
}

export async function getJobsByArea(area) {
  const needle = area.toLowerCase();
  const startups = await getApproved();
  const names = new Set(
    startups
      .filter((s) => s.active !== false && (s.area || "").toLowerCase().includes(needle))
      .map((s) => s.name.toLowerCase())
  );
  const jobs = await getAllJobs();
  const matcher = buildCompanyMatcher(startups);
  return jobs.filter((j) => {
    if ((j.location || "").toLowerCase().includes(needle)) return true;
    if (names.has((j.company || "").toLowerCase())) return true;
    const hit = matcher.resolve(j.company);
    return hit && (hit.startup.area || "").toLowerCase().includes(needle);
  });
}

export async function getJobsByRole(landing) {
  if (!landing?.keywords?.length) return [];
  const needles = landing.keywords.map((k) => k.toLowerCase());
  const jobs = await getAllJobs();
  return jobs.filter((j) => {
    const title = (j.title || "").toLowerCase();
    return needles.some((n) => title.includes(n));
  });
}

export async function getHiringReportStats() {
  const [jobs, companies, startups] = await Promise.all([
    getAllJobs(),
    getCompaniesWithJobs(),
    getApproved(),
  ]);

  const matcher = buildCompanyMatcher(startups);
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
