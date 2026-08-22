// Daily hiring check: for each startup, detect a known ATS (Greenhouse, Lever,
// Ashby, Recruitee, Freshteam) from its careers/website page, then pull the LIVE
// open-role count from that ATS's public API. Writes a `hiring` field.
// Manual "we're hiring" flags (hiring.source === "manual") are preserved.
//
// Run: node scripts/check-hiring.mjs   (optional LIMIT=50 to sample)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");
const LIMIT = parseInt(process.env.LIMIT || "0", 10); // 0 = all
const UA = { "User-Agent": "Mozilla/5.0 (hiring-check)" };

async function getText(url) {
  const resp = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(9000) });
  if (!resp.ok) return "";
  return resp.text();
}
async function getJson(url) {
  const resp = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4000) });
  if (!resp.ok) return null;
  return resp.json();
}

// ATS slug from the company's OWN domain only (e.g. zenoti.com -> zenoti).
// Name-based slugs were dropped: generic names ("knock", "meta") matched
// unrelated companies' job boards and produced false hiring flags.
function slugCandidates(entry) {
  try {
    const host = new URL(entry.website).hostname.replace(/^www\./, "");
    const label = host.split(".")[0];
    if (label && label.length > 2) return [label.toLowerCase()];
  } catch {}
  return [];
}

// Detect a live ATS board directly via public APIs (bypasses JS-rendered pages).
function atsProbes(slug) {
  return [
    { source: "greenhouse", url: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, boardUrl: `https://boards.greenhouse.io/${slug}` },
    { source: "lever", url: `https://api.lever.co/v0/postings/${slug}?mode=json`, boardUrl: `https://jobs.lever.co/${slug}` },
    { source: "ashby", url: `https://api.ashbyhq.com/posting-api/job-board/${slug}`, boardUrl: `https://jobs.ashbyhq.com/${slug}` },
    { source: "recruitee", url: `https://${slug}.recruitee.com/api/offers/`, boardUrl: `https://${slug}.recruitee.com/` },
  ];
}

function extractJobs(source, d) {
  if (!d) return null;
  if (source === "greenhouse") return d.jobs || null;
  if (source === "lever") return Array.isArray(d) ? d : null;
  if (source === "ashby") return d.jobs || null;
  if (source === "recruitee") return d.offers || null;
  return null;
}
function locOf(source, j) {
  if (source === "greenhouse") return j.location?.name || "";
  if (source === "lever") return j.categories?.location || "";
  if (source === "ashby") return j.location || "";
  if (source === "recruitee") return `${j.city || ""} ${j.country || ""}`;
  return "";
}

const SRC_ORDER = { greenhouse: 0, lever: 1, ashby: 2, recruitee: 3 };

async function checkOne(entry) {
  if (!entry.website) return null;
  const tasks = [];
  for (const slug of slugCandidates(entry)) {
    for (const probe of atsProbes(slug)) {
      tasks.push((async () => {
        let d = null;
        try { d = await getJson(probe.url); } catch { return null; }
        const jobs = extractJobs(probe.source, d);
        if (!Array.isArray(jobs) || jobs.length === 0) return null;
        // Count ONLY India/Hyderabad/Telangana roles. "remote" was dropped —
        // US boards (domain-slug collisions like coherehealth) list US-"Remote"
        // roles that otherwise leaked through as false "hiring" signals.
        const count = jobs.filter((j) => /hyderabad|telangana|\bindia\b/i.test(locOf(probe.source, j))).length;
        return count > 0
          ? { active: true, count, source: probe.source, slug, url: probe.boardUrl, checkedAt: new Date().toISOString() }
          : null;
      })());
    }
  }
  const results = (await Promise.all(tasks)).filter(Boolean);
  if (!results.length) return null;
  results.sort((a, b) => SRC_ORDER[a.source] - SRC_ORDER[b.source]);
  return results[0];
}

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
const targets = LIMIT ? data.slice(0, LIMIT) : data;
let hits = 0, checked = 0;

for (const entry of targets) {
  // preserve manual flags
  if (entry.hiring?.source === "manual") { continue; }
  checked++;
  let h = null;
  try { h = await checkOne(entry); } catch { h = null; }
  if (h) {
    entry.hiring = h;
    hits++;
    console.log(`  HIRING ${entry.name}: ${h.count} role(s) via ${h.source}`);
  } else if (entry.hiring && entry.hiring.source !== "manual") {
    delete entry.hiring; // no longer hiring
  }
  if (checked % 100 === 0) console.log(`…checked ${checked}, hiring ${hits}`);
}

fs.writeFileSync(DB, JSON.stringify(data, null, 2));
console.log(`\nDone. checked ${checked}, currently hiring ${hits}.`);
