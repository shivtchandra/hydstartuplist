import fs from "fs";
import path from "path";

const APPROVED_FILE = path.join(process.cwd(), "data", "startups.json");
const PENDING_FILE = path.join(process.cwd(), "data", "pending.json");

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Cron routes (check-hiring, fetch-news) run on Vercel where the filesystem
// is read-only at request time — they can't fs.writeFileSync back into
// data/startups.json like the local .mjs scripts do. Instead they write
// {hiring, news, updatedAt} to Firestore's `startups_dynamic` collection
// (admin-only, no public read rule — same pattern as `subscribers`). This
// overlays that live data onto the static JSON base on every read, so cron
// updates show up immediately with no redeploy. If FIREBASE_SERVICE_ACCOUNT
// isn't set, this is a no-op and getApproved() just returns the static file.
let dynamicOverlayCache = null;
let dynamicOverlayFetchedAt = 0;
const OVERLAY_TTL_MS = 60_000;

async function getDynamicOverlay() {
  if (dynamicOverlayCache && Date.now() - dynamicOverlayFetchedAt < OVERLAY_TTL_MS) {
    return dynamicOverlayCache;
  }
  try {
    const { getAdminDb } = await import("./firebaseAdmin.js");
    const db = await getAdminDb();
    if (!db) return null;
    const snap = await db.collection("startups_dynamic").get();
    const overlay = new Map();
    snap.forEach((doc) => overlay.set(doc.id, doc.data()));
    dynamicOverlayCache = overlay;
    dynamicOverlayFetchedAt = Date.now();
    return overlay;
  } catch (err) {
    console.error("dynamic overlay fetch failed:", err);
    return dynamicOverlayCache; // stale cache beats nothing
  }
}

export function invalidateDynamicOverlay() {
  dynamicOverlayCache = null;
  dynamicOverlayFetchedAt = 0;
}

export async function getApproved() {
  const base = readJson(APPROVED_FILE);
  const overlay = await getDynamicOverlay();
  if (!overlay || overlay.size === 0) return base;

  const baseIds = new Set(base.map((s) => s.id));

  // Merge overlay onto matching base entries. Enrichment docs (cron) carry
  // hiring/news/hiringHidden; claim docs (admin approve) carry field overrides
  // like website/sector/lat/lng/verified — spread both, keep the base id.
  const merged = base.map((s) => {
    const dyn = overlay.get(s.id);
    if (!dyn) return s;
    return { ...s, ...dyn, id: s.id, hiringHidden: dyn.hiringHidden === true };
  });

  // Append brand-new approved startups that live only in the overlay (written
  // to startups_dynamic with _full:true because Vercel's FS is read-only).
  for (const [id, dyn] of overlay) {
    if (dyn._full && !baseIds.has(id)) {
      merged.push({ ...dyn, id, hiringHidden: dyn.hiringHidden === true });
    }
  }
  return merged;
}

const HIRING_FRESH_DAYS = 7;

// A hiring result auto-expires from public view 7 days after it was last
// verified — a check-hiring cron cursor can take ~18 days to cycle back to
// a given company, so without this a stale "hiring now" badge could sit
// there for weeks after the roles closed. Entries with no checkedAt (older
// manual data) are left alone rather than guessed-expired.
export function isHiringFresh(hiring) {
  if (!hiring?.checkedAt) return true;
  const ageDays = (Date.now() - new Date(hiring.checkedAt).getTime()) / 86_400_000;
  return ageDays <= HIRING_FRESH_DAYS;
}

// Single gate every public-facing consumer should call before showing a
// company's hiring badge/roles — combines the 7-day freshness rule with an
// admin's manual hide (set via /api/admin/hiring).
export function visibleHiring(s) {
  if (!s.hiring?.active || s.hiringHidden) return null;
  if (!isHiringFresh(s.hiring)) return null;
  return s.hiring;
}

export async function getStartupById(id) {
  const all = await getApproved();
  return all.find((s) => s.id === id) || null;
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
