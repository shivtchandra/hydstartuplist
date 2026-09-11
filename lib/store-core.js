/**
 * React-free startup store for Node (GitHub Actions crons) and shared data logic.
 * Next.js request dedupe lives in store.js via React.cache wrappers.
 */
import fs from "fs";
import path from "path";
import { startupSlug } from "./slug.js";
import { isNextProductionBuild } from "./build-phase.js";

const APPROVED_FILE = path.join(process.cwd(), "data", "startups.json");
const PENDING_FILE = path.join(process.cwd(), "data", "pending.json");

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Cron writes {hiring, news, ...} to Firestore `startups_dynamic`; readers merge
// that onto static data/startups.json. See lib/dynamic-overlay.js for the 1-doc rollup.
let dynamicOverlayCache = null;
let dynamicOverlayFetchedAt = 0;
const OVERLAY_TTL_MS = 5 * 60_000;

async function getDynamicOverlay() {
  if (dynamicOverlayCache && Date.now() - dynamicOverlayFetchedAt < OVERLAY_TTL_MS) {
    return dynamicOverlayCache;
  }
  if (isNextProductionBuild()) return null;
  try {
    const { fetchOverlayPairsFromFirestore } = await import("./dynamic-overlay.js");
    let pairs = null;
    try {
      const { unstable_cache } = await import("next/cache");
      const cached = unstable_cache(
        fetchOverlayPairsFromFirestore,
        ["startups-dynamic-overlay-v2-rollup"],
        { revalidate: 300, tags: ["startups-dynamic"] }
      );
      pairs = await cached();
    } catch {
      pairs = await fetchOverlayPairsFromFirestore();
    }
    if (!pairs) return dynamicOverlayCache;
    const overlay = new Map(pairs);
    dynamicOverlayCache = overlay;
    dynamicOverlayFetchedAt = Date.now();
    return overlay;
  } catch (err) {
    console.error("dynamic overlay fetch failed:", err);
    return dynamicOverlayCache;
  }
}

export function invalidateDynamicOverlay() {
  dynamicOverlayCache = null;
  dynamicOverlayFetchedAt = 0;
  void import("next/cache")
    .then((m) => m.revalidateTag?.("startups-dynamic"))
    .catch(() => {});
}

export async function refreshDynamicOverlayRollup(db) {
  const { rebuildDynamicOverlayRollupSafe } = await import("./dynamic-overlay.js");
  const result = await rebuildDynamicOverlayRollupSafe(db);
  invalidateDynamicOverlay();
  return result;
}

export async function getApproved() {
  const base = readJson(APPROVED_FILE);
  const overlay = await getDynamicOverlay();
  if (!overlay || overlay.size === 0) return base;

  const baseIds = new Set(base.map((s) => s.id));
  const merged = base.map((s) => {
    const dyn = overlay.get(s.id);
    if (!dyn) return s;
    return { ...s, ...dyn, id: s.id, hiringHidden: dyn.hiringHidden === true };
  });

  for (const [id, dyn] of overlay) {
    if (dyn._full && !baseIds.has(id)) {
      merged.push({ ...dyn, id, hiringHidden: dyn.hiringHidden === true });
    }
  }
  return merged;
}

const HIRING_FRESH_DAYS = 7;

export function isHiringFresh(hiring) {
  if (!hiring?.checkedAt) return true;
  const ageDays = (Date.now() - new Date(hiring.checkedAt).getTime()) / 86_400_000;
  return ageDays <= HIRING_FRESH_DAYS;
}

export function visibleHiring(s) {
  if (!s.hiring?.active || s.hiringHidden) return null;
  if (!isHiringFresh(s.hiring)) return null;
  return s.hiring;
}

export async function getStartupById(id) {
  const all = await getApproved();
  return all.find((s) => s.id === id) || null;
}

export async function getStartupBySlug(slug) {
  const all = await getApproved();
  return all.find((s) => s.active !== false && startupSlug(s) === slug) || null;
}

export async function getAllStartupSlugs() {
  const all = await getApproved();
  return all.filter((s) => s.active !== false).map(startupSlug);
}

export function getPending() {
  return readJson(PENDING_FILE);
}

export function addPending(entry) {
  const pending = readJson(PENDING_FILE);
  pending.push(entry);
  writeJson(PENDING_FILE, pending);
  return entry;
}

export async function filterStartups({ sector, fundingStage, area, q }) {
  let list = await getApproved();
  list = list.filter((s) => s.active !== false);
  if (sector) list = list.filter((s) => s.sector === sector);
  if (fundingStage) list = list.filter((s) => s.fundingStage === fundingStage);
  if (area) list = list.filter((s) => s.area.toLowerCase().includes(area.toLowerCase()));
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.description.toLowerCase().includes(needle)
    );
  }
  return list;
}
