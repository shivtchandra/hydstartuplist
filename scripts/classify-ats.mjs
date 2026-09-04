#!/usr/bin/env node
/**
 * One-time (or incremental) ATS board classification for map startups.
 *
 * Writes:
 *   - atsProvider / atsSlug / atsBoardUrl / atsClassifiedAt onto data/startups.json
 *   - data/ats-boards.json registry (boards can later exist without a startup)
 *
 * Usage:
 *   node scripts/classify-ats.mjs              # all missing classification
 *   node scripts/classify-ats.mjs --limit=100  # first N needing classify
 *   node scripts/classify-ats.mjs --force      # reclassify all
 *   node scripts/classify-ats.mjs --concurrency=8
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  classifyCompany,
  boardRegistryId,
} from "../lib/ats/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STARTUPS_FILE = path.join(ROOT, "data", "startups.json");
const BOARDS_FILE = path.join(ROOT, "data", "ats-boards.json");

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3);
}

const limit = parseInt(arg("limit", "0"), 10) || 0;
const concurrency = Math.max(1, parseInt(arg("concurrency", "6"), 10) || 6);
const force = process.argv.includes("--force");

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

const startups = readJson(STARTUPS_FILE, []);
const boardsById = new Map(
  (readJson(BOARDS_FILE, []) || []).map((b) => [b.id, b])
);

const targets = startups.filter((s) => {
  if (s.active === false) return false;
  if (!force && s.atsProvider && s.atsSlug) return false;
  if (!force && s.atsClassifiedAt && s.atsProvider === null) return false; // already tried
  return !!(s.website || s.careers);
});

const slice = limit > 0 ? targets.slice(0, limit) : targets;
console.log(`Classifying ${slice.length} / ${targets.length} needing work (of ${startups.length} startups), concurrency=${concurrency}`);

let next = 0;
let hits = 0;
let misses = 0;

async function worker() {
  while (true) {
    const i = next++;
    if (i >= slice.length) return;
    const entry = slice[i];
    try {
      const result = await classifyCompany(entry);
      entry.atsProvider = result.atsProvider;
      entry.atsSlug = result.atsSlug;
      entry.atsBoardUrl = result.atsBoardUrl;
      entry.atsClassifiedAt = result.atsClassifiedAt;

      if (result.atsProvider && result.atsSlug) {
        hits++;
        const id = boardRegistryId(result.atsProvider, result.atsSlug);
        boardsById.set(id, {
          id,
          name: entry.name,
          atsProvider: result.atsProvider,
          atsSlug: result.atsSlug,
          boardUrl: result.atsBoardUrl,
          startupId: entry.id,
          active: true,
        });
        console.log(`  ✓ ${entry.name} → ${result.atsProvider}/${result.atsSlug}`);
      } else {
        misses++;
        console.log(`  · ${entry.name} → none`);
      }
    } catch (err) {
      misses++;
      console.error(`  ✗ ${entry.name}:`, err.message || err);
      entry.atsClassifiedAt = new Date().toISOString();
      entry.atsProvider = entry.atsProvider ?? null;
      entry.atsSlug = entry.atsSlug ?? null;
    }

    // Periodic save so long runs aren't lost
    if ((i + 1) % 25 === 0) {
      writeJson(STARTUPS_FILE, startups);
      writeJson(BOARDS_FILE, [...boardsById.values()]);
      console.log(`  … checkpoint ${i + 1}/${slice.length}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, slice.length || 1) }, () => worker()));

writeJson(STARTUPS_FILE, startups);
writeJson(BOARDS_FILE, [...boardsById.values()]);
console.log(JSON.stringify({ done: true, classified: slice.length, hits, misses, boards: boardsById.size }, null, 2));
