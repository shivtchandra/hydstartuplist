import fs from "fs";
import path from "path";
import { getAdminDb } from "./firebaseAdmin.js";
import { getApproved, getStartupBySlug, visibleHiring } from "./store.js";
import { startupSlug } from "./slug.js";
import { getJobBoostsAsync, jobIsBoosted } from "./placements.js";
import { buildCompanyMatcher, jobMatchesStartup } from "./jobs-match.js";

function gccNames() {
  const file = path.join(process.cwd(), "data", "gccs.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")).map((g) => g.name.toLowerCase());
}

function categorize(job, gccs) {
  if (job.source === "careers") return "startup";
  const company = (job.company || "").toLowerCase();
  if (gccs.some((g) => company.includes(g) || g.includes(company))) return "gcc";
  return "other";
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
        postedAt: hiring.checkedAt || null,
        fetchedAt: hiring.checkedAt || null,
        description: role.description || null,
        salary: role.salary || null,
        source: "careers",
      });
    }
  }
  return jobs;
}

async function withBoost(jobs) {
  const boosts = await getJobBoostsAsync();
  return jobs
    .map((j) => ({ ...j, sponsored: jobIsBoosted(j, boosts) }))
    .sort(
      (a, b) =>
        Number(b.sponsored) - Number(a.sponsored) ||
        new Date(b.postedAt || 0) - new Date(a.postedAt || 0)
    );
}

export async function getAllJobs() {
  const picks = await careerPicks();
  const gccs = gccNames();

  const db = await getAdminDb();
  if (!db) {
    return withBoost(picks.map((j) => ({ ...j, category: categorize(j, gccs) })));
  }

  try {
    const snap = await db.collection("job_board").doc("adzuna_latest").get();
    const adzuna = snap.exists ? snap.data() : { jobs: [] };
    return withBoost(
      [...picks, ...(adzuna.jobs || [])].map((j) => ({ ...j, category: categorize(j, gccs) }))
    );
  } catch (err) {
    console.error("jobs read error:", err);
    return withBoost(picks.map((j) => ({ ...j, category: categorize(j, gccs) })));
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
  if (!startup) return { startup: null, jobs: [] };

  const [jobs, startups] = await Promise.all([getAllJobs(), getApproved()]);
  const matcher = buildCompanyMatcher(startups);
  const filtered = jobs.filter((j) => jobMatchesStartup(j, startup, matcher));
  return { startup, jobs: filtered };
}

export async function getCompaniesWithJobs() {
  const [jobs, startups] = await Promise.all([getAllJobs(), getApproved()]);
  const matcher = buildCompanyMatcher(startups);
  const bySlug = new Map();

  for (const j of jobs) {
    if (!j.company) continue;
    const hit = matcher.resolve(j.company);
    if (!hit) continue;

    const existing = bySlug.get(hit.slug);
    if (existing) {
      existing.count += 1;
    } else {
      bySlug.set(hit.slug, {
        slug: hit.slug,
        name: hit.startup.name,
        count: 1,
      });
    }
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
