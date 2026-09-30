// Server-side ecosystem aggregates for citable pages (/hyderabad-tech-statistics,
// /about). Mirrors the tallies InsightsClient computes in the browser, so the
// numbers ship in the crawlable HTML.
import fs from "node:fs";
import path from "node:path";
import { getPublicStartups } from "./startups-public.js";
import { TECH_PARKS } from "./parks.js";
import { AREA_LANDINGS } from "./areas.js";

function tally(items, keyFn) {
  const m = new Map();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

function readGccs() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "gccs.json"), "utf-8"));
  } catch {
    return [];
  }
}

// Merge case variants (HealthTech/Healthtech) and fold "GCC · X" into one bucket.
function sectorLabel(raw) {
  const v = String(raw || "").trim();
  if (!v) return null;
  if (/^gcc\b/i.test(v)) return "GCC";
  return v.toLowerCase();
}
const SECTOR_DISPLAY = { saas: "SaaS", ai: "AI", d2c: "D2C", gcc: "GCC" };
function displaySector(key) {
  if (key === "GCC") return "GCC";
  return SECTOR_DISPLAY[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

// Area labels that are just the city, not a neighbourhood.
function areaLabel(raw) {
  const v = String(raw || "").replace(/,\s*(Hyderabad|Telangana|India)\b.*$/i, "").trim();
  if (!v || /^(hyderabad|telangana|india|secunderabad & hyderabad)$/i.test(v)) return null;
  return v;
}

export function pct(n, d) {
  if (!d) return 0;
  return Math.round((1000 * n) / d) / 10;
}

export async function getEcosystemStats() {
  const startups = (await getPublicStartups()).filter((s) => s.active !== false);
  const gccs = readGccs();
  const total = startups.length;
  const hiring = startups.filter((s) => s.hiring).length;
  const hiringSectors = new Map(
    tally(startups.filter((s) => s.hiring), (s) => sectorLabel(s.sector)).map((r) => [r.name, r.count])
  );
  const areaRows = tally(startups, (s) => areaLabel(s.area));
  const withArea = areaRows.reduce((n, r) => n + r.count, 0);

  return {
    asOf: new Date().toISOString().slice(0, 10),
    totalStartups: total,
    hiringStartups: hiring,
    hiringPct: pct(hiring, total),
    bySector: tally(startups, (s) => sectorLabel(s.sector)).map((r) => ({
      ...r,
      name: displaySector(r.name),
      pct: pct(r.count, total),
      hiring: hiringSectors.get(r.name) || 0, // r.name is still the raw key here
    })),
    byStage: tally(startups, (s) => s.fundingStage).map((r) => ({ ...r, pct: pct(r.count, total) })),
    startupsWithArea: withArea,
    byArea: areaRows.slice(0, 12).map((r) => ({ ...r, pct: pct(r.count, withArea) })),
    totalGccs: gccs.length,
    gccsByIndustry: tally(gccs, (g) => g.industry || "Other"),
    techParks: TECH_PARKS.length,
    areaHubs: AREA_LANDINGS.length,
  };
}
