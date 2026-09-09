#!/usr/bin/env node
/**
 * Radar job-feed reconciler — data-first discovery.
 *
 * Pulls Firestore job feeds, diffs against startups.json + radar.json, writes:
 *   data/radar-candidates.json → sources.job-feed-orphans
 *   data/radar-candidates.json → sources.hiring-not-on-radar
 *
 * Usage:
 *   node scripts/radar-job-reconcile.mjs
 *   node scripts/radar-job-reconcile.mjs --dry-run
 *   node scripts/radar-job-reconcile.mjs --miss-only
 *
 * Does NOT pin map entries or mutate radar.json entries.
 * Needs FIREBASE_SERVICE_ACCOUNT in .env.local (same as runtime jobs).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
config({ path: path.join(ROOT, ".env.local") });

const STARTUPS = path.join(ROOT, "data", "startups.json");
const RADAR = path.join(ROOT, "data", "radar.json");
const CANDIDATES = path.join(ROOT, "data", "radar-candidates.json");
const GCCS = path.join(ROOT, "data", "gccs.json");
const BOARDS = path.join(ROOT, "data", "ats-boards.json");

const FEEDS = ["ats_latest", "adzuna_latest", "priority_careers_latest"];

const ENTERPRISE_SKIP = [
  "deloitte", "state street", "wells fargo", "teradata", "tjx", "cigna", "fujitsu",
  "roche", "ibm", "hsbc", "mcdonald", "amd", "honeywell", "doordash", "coinbase",
  "zscaler", "anaplan", "kyndryl", "sutherland", "brillio", "capco", "synchrony",
  "elevance", "carelon", "diebold", "blue yonder", "warner", "l'oréal", "loreal",
  "coupang", "crunchyroll", "new relic", "inovalon", "telnyx", "worley", "viasat",
  "ghx", "schrodinger", "schrödinger", "centific", "truveta", "khan academy",
  "accordion", "indium", "zoetis", "msd", "merck", "hartford", "flutter", "jade global",
  "desri", "ncr", "kantar", "tata consultancy", "tcs", "wipro", "infosys", "cognizant",
  "accenture", "capgemini", "hcl", "tech mahindra", "persistent", "valuelabs", "zensar",
  "amgen", "unitedhealth", "reckitt", "experian", "servicenow", "aveva", "carrier",
  "cibc", "ntt ", "people prime", "artech", "talent500", "talent formula", "the gaudium",
  "keystone international", "leo marcom", "bristol myers", "qualcomm", "invesco",
  "gbit", "global bridge", "sentient",
];

const FAMOUS_SKIP = [
  "skyroot", "zenoti", "darwinbox", "highradius", "dhruva", "bharat biotech",
];

function parseArgs(argv) {
  const out = { dryRun: false, missOnly: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") out.dryRun = true;
    if (a === "--miss-only") out.missOnly = true;
  }
  return out;
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[''.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shouldSkipName(name, lists) {
  const low = String(name || "").toLowerCase();
  return lists.some((s) => low.includes(s));
}

function classifyAts(provider, url) {
  const p = String(provider || "").toLowerCase();
  const u = String(url || "").toLowerCase();
  if (p.includes("gem") || u.includes("jobs.gem.com")) return "gem";
  if (p.includes("zoho") || u.includes("zohorecruit")) return "zoho";
  if (p.includes("keka") || u.includes("keka.com")) return "keka";
  if (p.includes("rippling") || u.includes("rippling.com")) return "rippling";
  if (p.includes("greenhouse") || u.includes("greenhouse")) return "greenhouse";
  if (p.includes("lever") || u.includes("lever.co")) return "lever";
  if (p.includes("ashby") || u.includes("ashbyhq")) return "ashby";
  return p || "other";
}

function missReasonsForOrphan(o) {
  const reasons = [];
  const ats = classifyAts(o.atsProvider, o.sampleUrl);
  const sources = o.sources instanceof Set ? [...o.sources] : (o.sources || []);
  if (["gem", "zoho", "keka", "rippling"].includes(ats)) reasons.push(ats);
  else if (["greenhouse", "lever", "ashby"].includes(ats) && sources.includes("ats")) {
    reasons.push("us-hq-hyd-office");
  }
  if (!reasons.length) reasons.push("marketing-careers");
  return reasons;
}

async function loadJobs() {
  const { getAdminDb } = await import(path.join(ROOT, "lib", "firebaseAdmin.js"));
  const db = await getAdminDb();
  if (!db) throw new Error("Firebase admin unavailable — set FIREBASE_SERVICE_ACCOUNT in .env.local");
  let all = [];
  for (const id of FEEDS) {
    const snap = await db.collection("job_board").doc(id).get();
    if (snap.exists) all = all.concat(snap.data().jobs || []);
    else console.warn("missing feed:", id);
  }
  return all;
}

function resolveStartup(job, byId, matcher) {
  if (job.startupId && byId.has(job.startupId)) return byId.get(job.startupId);
  if (!job.company) return null;
  const hit = matcher.resolve(job.company);
  if (!hit) return null;
  if (hit.id) return hit;
  if (hit.startup?.id) return hit.startup;
  return null;
}

async function main() {
  const opts = parseArgs(process.argv);
  const startups = JSON.parse(fs.readFileSync(STARTUPS, "utf8"));
  const radar = JSON.parse(fs.readFileSync(RADAR, "utf8"));
  const gccs = JSON.parse(fs.readFileSync(GCCS, "utf8"));
  const boards = JSON.parse(fs.readFileSync(BOARDS, "utf8"));
  const candFile = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));

  const { buildCompanyMatcher } = await import(path.join(ROOT, "lib", "jobs-match.js"));
  const matcher = buildCompanyMatcher(startups);
  const byId = new Map(startups.map((s) => [s.id, s]));
  const radarIds = new Set((radar.entries || []).map((e) => e.startupId).filter(Boolean));
  const gccNames = new Set(gccs.map((g) => norm(g.name)));

  const jobs = await loadJobs();
  console.log(`Radar job reconcile — ${jobs.length} jobs from ${FEEDS.join(", ")}`);

  const byStartup = new Map();
  const unresolved = new Map();

  for (const j of jobs) {
    const resolved = resolveStartup(j, byId, matcher);
    if (resolved?.id) {
      const row = byStartup.get(resolved.id) || {
        startup: resolved,
        jobCount: 0,
        sources: new Set(),
      };
      row.jobCount++;
      if (j.source) row.sources.add(j.source);
      byStartup.set(resolved.id, row);
      continue;
    }
    const c = String(j.company || "").trim();
    if (!c) continue;
    const row = unresolved.get(c) || {
      name: c,
      jobCount: 0,
      sources: new Set(),
      atsProvider: null,
      sampleUrl: null,
      employerType: j.employerType || null,
    };
    row.jobCount++;
    if (j.source) row.sources.add(j.source);
    if (j.atsProvider) row.atsProvider = j.atsProvider;
    if (!row.sampleUrl) row.sampleUrl = j.url || j.applyUrl || null;
    if (j.employerType) row.employerType = j.employerType;
    unresolved.set(c, row);
  }

  const gccSector = (s) => String(s.sector || "").startsWith("GCC");

  const hiringNotRadar = [...byStartup.values()]
    .filter((r) => !radarIds.has(r.startup.id))
    .filter((r) => !gccSector(r.startup))
    .filter((r) => !shouldSkipName(r.startup.name, FAMOUS_SKIP))
    .filter((r) => !shouldSkipName(r.startup.name, ENTERPRISE_SKIP))
    .sort((a, b) => b.jobCount - a.jobCount);

  function orphanInteresting(u) {
    if (u.employerType === "enterprise" || u.employerType === "gcc") return false;
    if (shouldSkipName(u.name, ENTERPRISE_SKIP)) return false;
    if (shouldSkipName(u.name, FAMOUS_SKIP)) return false;
    if (gccNames.has(norm(u.name))) return false;
    const src = [...u.sources];
    const ats = classifyAts(u.atsProvider, u.sampleUrl);
    if (["gem", "zoho", "keka", "rippling"].includes(ats)) return true;
    if (src.includes("ats") || src.includes("careers")) {
      if (src.every((s) => s === "adzuna")) return false;
      return u.jobCount >= 2;
    }
    return false;
  }

  const orphans = [...unresolved.values()]
    .filter(orphanInteresting)
    .sort((a, b) => b.jobCount - a.jobCount);

  const boardOrphans = boards.filter(
    (b) =>
      b.active !== false &&
      b.employerType === "startup" &&
      !b.startupId &&
      b.mapPin !== true &&
      !shouldSkipName(b.name, ENTERPRISE_SKIP)
  );

  console.log(`\n=== HIRING ON MAP, NOT ON RADAR (${hiringNotRadar.length}) ===`);
  for (const r of hiringNotRadar.slice(0, 40)) {
    console.log(
      `- ${r.jobCount}  ${r.startup.name}  [${r.startup.sector || "?"}]  ${[...r.sources].join(",")}`
    );
  }

  console.log(`\n=== OFF-MAP ORPHANS (filtered) (${orphans.length}) ===`);
  for (const o of orphans.slice(0, 40)) {
    const ats = classifyAts(o.atsProvider, o.sampleUrl);
    console.log(
      `- ${o.jobCount}  ${o.name}  ats=${ats}  src=${[...o.sources].join(",")}`
    );
  }

  if (boardOrphans.length) {
    console.log(`\n=== STARTUP ATS BOARDS WITHOUT PIN (${boardOrphans.length}) ===`);
    for (const b of boardOrphans) {
      console.log(`- ${b.name}  ${b.atsProvider}  ${b.boardUrl || ""}`);
    }
  }

  if (opts.missOnly || opts.dryRun) {
    console.log(opts.dryRun ? "\n(dry-run — not writing)" : "");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  candFile.updatedAt = today;
  candFile.sources = candFile.sources || {};

  candFile.sources["hiring-not-on-radar"] = {
    label: "On map + live jobs, not yet on Radar — promote/enrich candidates",
    generatedBy: "scripts/radar-job-reconcile.mjs",
    generatedAt: today,
    candidates: hiringNotRadar.slice(0, 60).map((r) => ({
      name: r.startup.name,
      startupId: r.startup.id,
      website: r.startup.website || null,
      careers: r.startup.careers || null,
      sector: r.startup.sector || null,
      address: r.startup.address || null,
      jobCount: r.jobCount,
      sources: [...r.sources],
      suggestedMissReasons: ["marketing-careers"],
      note: "Already pinned — candidate for Radar depth if hard-to-find + real problem",
      status: "enrich-radar",
    })),
  };

  candFile.sources["job-feed-orphans"] = {
    label: "Hiring in Hyd feeds but not matched to startups.json (enterprise filtered)",
    generatedBy: "scripts/radar-job-reconcile.mjs",
    generatedAt: today,
    candidates: orphans.slice(0, 40).map((o) => {
      const ats = classifyAts(o.atsProvider, o.sampleUrl);
      return {
        name: o.name,
        careers: o.sampleUrl || null,
        atsProvider: o.atsProvider || null,
        atsClass: ats,
        jobCount: o.jobCount,
        sources: [...o.sources],
        employerType: o.employerType || null,
        suggestedMissReasons: missReasonsForOrphan(o),
        note: "Verify Hyd office + problem class before Radar/map",
        status: "verify-address",
      };
    }),
  };

  if (boardOrphans.length) {
    candFile.sources["ats-startup-boards-unpinned"] = {
      label: "ats-boards.json employerType=startup without startupId/mapPin",
      generatedBy: "scripts/radar-job-reconcile.mjs",
      generatedAt: today,
      candidates: boardOrphans.map((b) => ({
        name: b.name,
        careers: b.boardUrl || null,
        website: b.website || null,
        atsProvider: b.atsProvider || null,
        suggestedMissReasons: (() => {
          const c = classifyAts(b.atsProvider, b.boardUrl);
          return c !== "other" ? [c] : ["marketing-careers"];
        })(),
        status: "verify-address",
      })),
    };
  }

  fs.writeFileSync(CANDIDATES, JSON.stringify(candFile, null, 2) + "\n");
  console.log(`\nWrote sources → ${path.relative(ROOT, CANDIDATES)}`);
  console.log(
    `  hiring-not-on-radar: ${candFile.sources["hiring-not-on-radar"].candidates.length}`
  );
  console.log(
    `  job-feed-orphans: ${candFile.sources["job-feed-orphans"].candidates.length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
