#!/usr/bin/env node
/**
 * Verify curated ATS boards for Hyd/TG openings; merge hits into data/ats-boards.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { boardMeta } from "../lib/ats/providers.js";
import { fetchBoardJobs, boardRegistryId } from "../lib/ats/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PRIORITY = path.join(ROOT, "data", "ats-boards-priority.json");
const BOARDS = path.join(ROOT, "data", "ats-boards.json");

const list = JSON.parse(fs.readFileSync(PRIORITY, "utf-8"));
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
      const r = await fetchBoardJobs(b.atsProvider, b.atsSlug, {
        companyName: b.name,
        geoFilter: true,
        withContent: false,
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
      const id = boardRegistryId(b.atsProvider, b.atsSlug);
      const row = {
        id,
        name: b.name,
        atsProvider: b.atsProvider,
        atsSlug: b.atsSlug,
        boardUrl: meta.boardUrl,
        startupId: byId.get(id)?.startupId || null,
        active: true,
        hydJobs: r.jobs.length,
        totalJobs: r.totalRaw,
        verifiedAt: new Date().toISOString(),
      };
      byId.set(id, { ...byId.get(id), ...row });
      results.hits.push(row);
      console.log(`  ✓ ${b.name} → ${r.jobs.length} Hyd/TG / ${r.totalRaw} total`);
    } catch (err) {
      results.errors.push({ ...b, error: String(err.message || err) });
      console.log(`  ✗ ${b.name}: ${err.message || err}`);
    }
  }
}

console.log(`Verifying ${list.length} priority ATS boards, concurrency=${concurrency}`);
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const out = [...byId.values()].sort((a, b) => (b.hydJobs || 0) - (a.hydJobs || 0) || a.name.localeCompare(b.name));
fs.writeFileSync(BOARDS, JSON.stringify(out, null, 2) + "\n");
fs.writeFileSync(
  path.join(ROOT, "data", "ats-boards-verified.json"),
  JSON.stringify({ verifiedAt: new Date().toISOString(), ...results, hitCount: results.hits.length }, null, 2) + "\n"
);
console.log(JSON.stringify({ hits: results.hits.length, misses: results.misses.length, errors: results.errors.length, boardsFile: out.length }, null, 2));
