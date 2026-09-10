#!/usr/bin/env node
/**
 * Fresher employer gap sweep — diff seeded early-career hirers vs map + boards.
 *
 * Usage:
 *   node scripts/fresher-gap-sweep.mjs
 *   node scripts/fresher-gap-sweep.mjs --miss-only
 *   node scripts/fresher-gap-sweep.mjs --csv
 *
 * Does NOT pin companies or write ATS boards.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const missOnly = process.argv.includes("--miss-only");
const asCsv = process.argv.includes("--csv");

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const seeds = load("data/fresher-employer-seeds.json");
const startups = load("data/startups.json");
const boards = load("data/ats-boards.json");
const priority = load("data/priority-careers.json");

const byNorm = new Map();
for (const st of startups) {
  byNorm.set(norm(st.name), st);
  for (const a of st.aliases || []) byNorm.set(norm(a), st);
}

function findStartup(name) {
  const n = norm(name);
  if (byNorm.has(n)) return byNorm.get(n);
  for (const [k, st] of byNorm) {
    if (k.includes(n) || n.includes(k)) return st;
  }
  return null;
}

function isBoarded(st, seedName) {
  const needles = [norm(seedName), st ? norm(st.name) : "", st ? String(st.id) : ""].filter(Boolean);
  for (const b of boards) {
    const hay = norm(`${b.id || ""} ${b.name || ""} ${b.startupId || ""} ${b.boardUrl || ""}`);
    if (needles.some((n) => n && hay.includes(n))) return { kind: "ats", ref: b.id || b.name };
  }
  for (const p of priority) {
    const hay = norm(`${p.id || ""} ${p.name || ""} ${p.startupId || ""} ${p.url || ""}`);
    if (needles.some((n) => n && hay.includes(n))) return { kind: "priority", ref: p.id || p.name };
    if (st && p.startupId === st.id) return { kind: "priority", ref: p.id || p.name };
  }
  return null;
}

const rows = [];
for (const c of seeds.candidates || []) {
  const st = findStartup(c.name);
  const board = isBoarded(st, c.name);
  let status;
  if (!st) status = "OFF_MAP";
  else if (board) status = "BOARDED";
  else status = "MISS_CAREERS";
  rows.push({
    status,
    name: c.name,
    mapName: st?.name || "",
    startupId: st?.id || "",
    careers: c.careers || st?.careers || "",
    board: board ? `${board.kind}:${board.ref}` : "",
  });
}

const counts = rows.reduce((a, r) => {
  a[r.status] = (a[r.status] || 0) + 1;
  return a;
}, {});

const out = missOnly ? rows.filter((r) => r.status !== "BOARDED") : rows;

if (asCsv) {
  console.log("status,name,mapName,startupId,board,careers");
  for (const r of out) {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    console.log([r.status, r.name, r.mapName, r.startupId, r.board, r.careers].map(esc).join(","));
  }
} else {
  console.log("Fresher gap sweep", seeds.updatedAt || "");
  console.log("counts", counts);
  console.log("");
  for (const r of out) {
    console.log(
      `${r.status.padEnd(13)} ${r.name.padEnd(24)} ${r.board || "-"}  ${r.careers || ""}`.trim()
    );
  }
}
