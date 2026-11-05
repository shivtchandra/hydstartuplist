#!/usr/bin/env node
/**
 * Enrich job sources with:
 * 1. Under-the-radar & boutique startup ATS boards (Keka, Axelera AI, Careway, Cognition, PlanetScale, Netlify, etc.)
 * 2. Real Hyderabad startups with active careers pages (Pi Datacenters, Gradious Technologies, Pipra Solutions, etc.)
 * 3. Watchlist under-the-radar deeptech & frontier startups (AltiusHub, Grene Robotics/Indrajaal, Startoon Labs, Eon Space, etc.)
 * 4. Align earlyCareerPriority across early-career boards.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cleanScrapedTitle, isInvalidJobListing, NON_JOB_TITLE_RE } from "../lib/job-content.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const BOARDS_FILE = path.join(ROOT, "data", "ats-boards.json");
const PRIORITY_FILE = path.join(ROOT, "data", "priority-careers.json");
const STARTUPS_FILE = path.join(ROOT, "data", "startups.json");
const EARLY_BOARDS_FILE = path.join(ROOT, "data", "early-career-boards.json");
const WATCHLIST_FILE = path.join(ROOT, "data", "under-the-radar-watchlist.json");
const SCRAPED_HITS_FILE = path.join(ROOT, "scratch", "startup-scraped-hits.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

function cleanCompanyName(name) {
  return String(name || "")
    .replace(/\s*(?:private\s+limited|pvt\.?\s*ltd\.?|llp|\(opc\))\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("=== ENRICHING UNDER-THE-RADAR AND LOCAL SOURCES ===");

  // 1. Update ATS Boards
  const boards = readJson(BOARDS_FILE);
  const boardsById = new Map(boards.map((b) => [b.id.toLowerCase(), b]));

  const newAtsBoards = [
    {
      id: "keka:keka",
      name: "Keka HR",
      atsProvider: "keka",
      atsSlug: "keka",
      boardUrl: "https://hr.keka.com/careers",
      website: "https://www.keka.com",
      startupId: "e482154d-3340-4422-9154-cbef089ab82a",
      employerType: "startup",
      allowRemote: true,
      earlyCareerPriority: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "ashby:careway",
      name: "Careway Health",
      atsProvider: "ashby",
      atsSlug: "careway",
      boardUrl: "https://jobs.ashbyhq.com/careway",
      website: "https://www.carewayhealth.com",
      employerType: "startup",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "ashby:axelera",
      name: "Axelera AI",
      atsProvider: "ashby",
      atsSlug: "axelera",
      boardUrl: "https://jobs.ashbyhq.com/axelera",
      website: "https://www.axelera.ai",
      employerType: "startup",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "greenhouse:nextinsurance66",
      name: "Next Insurance",
      atsProvider: "greenhouse",
      atsSlug: "nextinsurance66",
      boardUrl: "https://boards.greenhouse.io/nextinsurance66",
      employerType: "other",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "greenhouse:netlify",
      name: "Netlify",
      atsProvider: "greenhouse",
      atsSlug: "netlify",
      boardUrl: "https://boards.greenhouse.io/netlify",
      employerType: "other",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "greenhouse:planetscale",
      name: "PlanetScale",
      atsProvider: "greenhouse",
      atsSlug: "planetscale",
      boardUrl: "https://boards.greenhouse.io/planetscale",
      employerType: "other",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "ashby:cognition",
      name: "Cognition",
      atsProvider: "ashby",
      atsSlug: "cognition",
      boardUrl: "https://jobs.ashbyhq.com/cognition",
      employerType: "startup",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "greenhouse:testlio",
      name: "Testlio",
      atsProvider: "greenhouse",
      atsSlug: "testlio",
      boardUrl: "https://boards.greenhouse.io/testlio",
      employerType: "other",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "greenhouse:feedzai",
      name: "Feedzai",
      atsProvider: "greenhouse",
      atsSlug: "feedzai",
      boardUrl: "https://boards.greenhouse.io/feedzai",
      employerType: "other",
      allowRemote: true,
      active: true,
      verifiedAt: new Date().toISOString(),
    },
  ];

  for (const b of newAtsBoards) {
    const key = b.id.toLowerCase();
    const prev = boardsById.get(key) || {};
    boardsById.set(key, { ...prev, ...b });
  }

  // Stamp earlyCareerPriority on all early-career boards
  const earlyCareerIds = readJson(EARLY_BOARDS_FILE);
  let earlyCareerUpdated = 0;
  for (const id of earlyCareerIds) {
    const b = boardsById.get(id.toLowerCase());
    if (b) {
      b.earlyCareerPriority = true;
      earlyCareerUpdated++;
    }
  }
  if (!earlyCareerIds.includes("keka:keka")) {
    earlyCareerIds.push("keka:keka");
    writeJson(EARLY_BOARDS_FILE, earlyCareerIds);
  }

  writeJson(BOARDS_FILE, [...boardsById.values()]);
  console.log(`Updated ats-boards.json: ${boardsById.size} total boards, stamped ${earlyCareerUpdated} early-career priority boards.`);

  // 2. Update Startups JSON for Keka
  const startups = readJson(STARTUPS_FILE);
  const kekaStartup = startups.find((s) => s.id === "e482154d-3340-4422-9154-cbef089ab82a");
  if (kekaStartup) {
    kekaStartup.atsProvider = "keka";
    kekaStartup.atsSlug = "keka";
    kekaStartup.atsBoardUrl = "https://hr.keka.com/careers";
    kekaStartup.atsClassifiedAt = new Date().toISOString();
    writeJson(STARTUPS_FILE, startups);
    console.log("Updated Keka HR in startups.json with ATS details.");
  }

  // 3. Update Priority Careers
  const priority = readJson(PRIORITY_FILE);
  const priorityById = new Map(priority.map((p) => [p.id.toLowerCase(), p]));
  const priorityUrls = new Set(priority.map((p) => p.url.toLowerCase().split("?")[0]));

  // Add unboarded under-the-radar startups from watchlist
  const watchlist = readJson(WATCHLIST_FILE);
  let addedWatchlist = 0;
  for (const w of watchlist) {
    if (w.careersUrl && !w.careersUrl.includes("linkedin.com") && !w.careersUrl.includes("ashbyhq.com") && !w.careersUrl.includes("greenhouse.io") && !w.careersUrl.includes("gem.com")) {
      const id = w.id.toLowerCase();
      const normUrl = w.careersUrl.toLowerCase().split("?")[0];
      if (!priorityById.has(id) && !priorityUrls.has(normUrl)) {
        priorityById.set(id, {
          id,
          name: cleanCompanyName(w.name),
          url: w.careersUrl,
          employerType: "startup",
        });
        priorityUrls.add(normUrl);
        addedWatchlist++;
      }
    }
  }

  // Add clean startups discovered from the scrape
  const sMap = new Map(startups.map((s) => [s.id, s]));
  let addedScraped = 0;
  if (fs.existsSync(SCRAPED_HITS_FILE)) {
    const hits = readJson(SCRAPED_HITS_FILE);
    for (const h of hits) {
      const s = sMap.get(h.id);
      const goodRoles = h.roles.filter((r) => {
        const t = cleanScrapedTitle(r.title);
        if (!t || t.length < 4 || t.length > 80) return false;
        if (/^\d+$/.test(t)) return false;
        if (/executive apartments|marriott|ready-to-use|become an intern at bsit|staff survey/i.test(t)) return false;
        if (NON_JOB_TITLE_RE.test(t)) return false;
        if (isInvalidJobListing({ title: t, url: r.url })) return false;
        return true;
      });

      if (goodRoles.length === 0) continue;
      const cleanName = cleanCompanyName(s?.name || h.name);
      if (!cleanName || cleanName.toLowerCase() === "software development") continue;

      const candidateId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
      const normUrl = h.careers.toLowerCase().split("?")[0];
      if (priorityById.has(candidateId) || priorityUrls.has(normUrl)) continue;

      priorityById.set(candidateId, {
        id: candidateId,
        name: cleanName,
        url: h.careers,
        startupId: h.id,
        employerType: "startup",
      });
      priorityUrls.add(normUrl);
      addedScraped++;
    }
  }

  const updatedPriority = [...priorityById.values()].sort((a, b) => a.name.localeCompare(b.name));
  writeJson(PRIORITY_FILE, updatedPriority);
  console.log(`Updated priority-careers.json: added ${addedWatchlist} watchlist startups and ${addedScraped} verified Hyderabad startups (total: ${updatedPriority.length}).`);

  console.log("=== ENRICHMENT SCRIPT COMPLETE ===");
}

main().catch(console.error);
