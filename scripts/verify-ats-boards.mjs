#!/usr/bin/env node
/**
 * Verify curated ATS boards for Hyd/TG openings; merge hits into data/ats-boards.json
 *
 *   node scripts/verify-ats-boards.mjs                        # data/ats-boards-priority.json
 *   node scripts/verify-ats-boards.mjs --input <file.json>    # any [{ name, atsProvider, atsSlug }] list
 *   node scripts/verify-ats-boards.mjs --allow-remote         # also count Remote India / worldwide roles
 *   node scripts/verify-ats-boards.mjs --dry-run              # report only, write nothing
 *
 * Entries may carry `allowRemote: true` themselves. A hit keeps `allowRemote`
 * only when the board actually has remote-eligible roles.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { boardMeta } from "../lib/ats/providers.js";
import { fetchBoardJobs, boardRegistryId } from "../lib/ats/index.js";
import { isHydOrTelanganaLocation } from "../lib/ats/geo.js";
import { inferExperienceLevel } from "../lib/job-facets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BOARDS = path.join(ROOT, "data", "ats-boards.json");

const argv = process.argv.slice(2);
const argValue = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
};
const INPUT = path.resolve(ROOT, argValue("--input") || path.join("data", "ats-boards-priority.json"));
const dryRun = argv.includes("--dry-run");
const allowRemoteAll = argv.includes("--allow-remote");

const inputDoc = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
const list = (Array.isArray(inputDoc) ? inputDoc : Object.values(inputDoc).find(Array.isArray) || []).filter(
  (b) => b?.atsProvider && b?.atsSlug
);
const existing = JSON.parse(fs.readFileSync(BOARDS, "utf-8"));
const byId = new Map(existing.map((b) => [b.id, b]));

const concurrency = 10;
let i = 0;
const results = { hits: [], misses: [], errors: [] };

async function worker() {
  while (true) {
    const idx = i++;
    if (idx >= list.length) return;
    const b = list[idx];
    const meta = boardMeta(b.atsProvider, b.atsSlug);
    if (!meta) {
      results.misses.push({ ...b, reason: "unknown_provider" });
      continue;
    }
    try {
      const allowRemote = allowRemoteAll || b.allowRemote === true;
      const r = await fetchBoardJobs(b.atsProvider, b.atsSlug, {
        companyName: b.name,
        geoFilter: true,
        // Descriptions feed the entry-level count (years requirements live there).
        withContent: true,
        allowRemote,
      });
      if (!r.ok || r.totalRaw === 0) {
        results.misses.push({ ...b, reason: "board_empty_or_404", raw: r.totalRaw });
        console.log(`  · ${b.name} (${b.atsProvider}/${b.atsSlug}) → no board/empty`);
        continue;
      }
      if (r.jobs.length === 0) {
        results.misses.push({ ...b, reason: "no_hyd_tg", raw: r.totalRaw });
        console.log(`  · ${b.name} → ${r.totalRaw} jobs, 0 Hyd/TG`);
        continue;
      }
      const hydJobs = r.jobs.filter((j) => isHydOrTelanganaLocation(j.location)).length;
      const remoteJobs = r.jobs.length - hydJobs;
      const earlyJobs = r.jobs.filter((j) => ["intern", "junior"].includes(inferExperienceLevel(j.title, j.description, j))).length;
      const id = boardRegistryId(b.atsProvider, b.atsSlug);
      const prev = byId.get(id) || {};
      const row = {
        id,
        name: b.name,
        atsProvider: b.atsProvider,
        atsSlug: b.atsSlug,
        boardUrl: meta.boardUrl,
        website: prev.website || b.website || null,
        startupId: prev.startupId || null,
        // Priority list hits are unverified inventory — never default to startup.
        employerType: prev.employerType || b.employerType || (prev.startupId ? "startup" : "other"),
        active: true,
        hydJobs,
        totalJobs: r.totalRaw,
        verifiedAt: new Date().toISOString(),
      };
      if (remoteJobs > 0) {
        row.allowRemote = true;
        row.remoteJobs = remoteJobs;
      }
      byId.set(id, { ...prev, ...row });
      results.hits.push({ ...row, earlyJobs });
      console.log(`  ✓ ${b.name} → ${hydJobs} Hyd/TG, ${remoteJobs} remote, ${earlyJobs} entry / ${r.totalRaw} total`);
    } catch (err) {
      results.errors.push({ ...b, error: String(err.message || err) });
      console.log(`  ✗ ${b.name}: ${err.message || err}`);
    }
  }
}

console.log(`Verifying ${list.length} ATS boards from ${path.relative(ROOT, INPUT)}, concurrency=${concurrency}${dryRun ? " (dry run)" : ""}`);
await Promise.all(Array.from({ length: concurrency }, () => worker()));

if (dryRun) {
  console.log(JSON.stringify({ hits: results.hits, misses: results.misses.length, errors: results.errors.length }, null, 2));
  process.exit(0);
}

const out = [...byId.values()].sort((a, b) => (b.hydJobs || 0) - (a.hydJobs || 0) || a.name.localeCompare(b.name));
fs.writeFileSync(BOARDS, JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(
  path.join(ROOT, "data", "ats-boards-verified.json"),
  JSON.stringify({ verifiedAt: new Date().toISOString(), ...results, hitCount: results.hits.length }, null, 2) + "\n"
);
console.log(JSON.stringify({ hits: results.hits.length, misses: results.misses.length, errors: results.errors.length, boardsFile: out.length }, null, 2));
