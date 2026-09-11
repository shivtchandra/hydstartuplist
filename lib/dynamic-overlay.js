/**
 * Public startup overlay without collection scans.
 *
 * Crons/admin still write per-startup docs to `startups_dynamic`.
 * Readers use a single rollup doc (`startups_meta/overlay_v1`) so each
 * cache miss costs 1 Firestore read + small egress instead of N.
 */

import { withTimeout } from "./build-phase.js";

export const OVERLAY_ROLLUP_COLLECTION = "startups_meta";
export const OVERLAY_ROLLUP_DOC = "overlay_v1";

/** Fields safe/useful to merge onto static startups.json. */
const OVERLAY_KEYS = [
  "_full",
  "hiring",
  "news",
  "hiringHidden",
  "updatedAt",
  "atsProvider",
  "atsSlug",
  "atsBoardUrl",
  "verified",
  "website",
  "logoUrl",
  "sector",
  "fundingStage",
  "area",
  "description",
  "careers",
  "address",
  "lat",
  "lng",
  "locSource",
  "status",
  "addedAt",
  "name",
  "sponsored",
  "active",
  "founded",
  "services",
];

function slimHiring(hiring) {
  if (!hiring || typeof hiring !== "object") return hiring ?? null;
  const roles = Array.isArray(hiring.roles)
    ? hiring.roles.slice(0, 12).map((r) => ({
        title: r?.title || "",
        url: r?.url || null,
        firstSeenAt: r?.firstSeenAt || null,
        postedAt: r?.postedAt || null,
        salary: r?.salary || undefined,
      }))
    : undefined;
  return {
    active: !!hiring.active,
    count: hiring.count ?? roles?.length ?? null,
    source: hiring.source || null,
    slug: hiring.slug || null,
    url: hiring.url || null,
    checkedAt: hiring.checkedAt || null,
    ...(roles ? { roles } : {}),
  };
}

/** Shrink per-doc payload before packing into the rollup (egress + 1MB cap). */
export function slimOverlayDoc(data) {
  if (!data || typeof data !== "object") return null;
  if (data._full) {
    const out = { _full: true };
    for (const k of OVERLAY_KEYS) {
      if (data[k] !== undefined) out[k] = k === "hiring" ? slimHiring(data[k]) : data[k];
    }
    return out;
  }
  const out = {};
  for (const k of OVERLAY_KEYS) {
    if (data[k] === undefined) continue;
    out[k] = k === "hiring" ? slimHiring(data[k]) : data[k];
  }
  return Object.keys(out).length ? out : null;
}

function rollupRef(db) {
  return db.collection(OVERLAY_ROLLUP_COLLECTION).doc(OVERLAY_ROLLUP_DOC);
}

/**
 * Scan `startups_dynamic` once and write the public rollup.
 * Call from crons/admin after batch writes — not on the public read path
 * except as a cold-start fallback.
 */
export async function rebuildDynamicOverlayRollup(db) {
  if (!db) return { ok: false, reason: "no-db" };
  const snap = await withTimeout(db.collection("startups_dynamic").get(), 20_000, null);
  if (!snap) return { ok: false, reason: "timeout" };

  const pairs = [];
  snap.forEach((doc) => {
    const slim = slimOverlayDoc(doc.data());
    if (slim) pairs.push([doc.id, slim]);
  });

  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    count: pairs.length,
    pairs,
  };

  const approx = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (approx > 900_000) {
    console.error(`[dynamic-overlay] rollup too large (${approx} bytes) — refusing write`);
    return { ok: false, reason: "too-large", bytes: approx, count: pairs.length };
  }

  await rollupRef(db).set(payload);
  return { ok: true, count: pairs.length, bytes: approx };
}

/** Best-effort rebuild that never throws into cron responses. */
export async function rebuildDynamicOverlayRollupSafe(db) {
  try {
    return await rebuildDynamicOverlayRollup(db);
  } catch (err) {
    console.error("[dynamic-overlay] rebuild failed:", err?.message || err);
    return { ok: false, reason: String(err?.message || err) };
  }
}

/**
 * Public read: 1 rollup doc. Falls back to collection scan + rebuild if missing.
 * @returns {Promise<[string, object][] | null>}
 */
export async function fetchOverlayPairsFromFirestore() {
  const { getAdminDb } = await import("./firebaseAdmin.js");
  const db = await getAdminDb();
  if (!db) return null;

  const rollupSnap = await withTimeout(rollupRef(db).get(), 6_000, null);
  if (rollupSnap?.exists) {
    const data = rollupSnap.data();
    if (Array.isArray(data?.pairs)) return data.pairs;
  }

  // Cold start / first deploy: one expensive scan, then rollup for everyone else.
  const snap = await withTimeout(db.collection("startups_dynamic").get(), 12_000, null);
  if (!snap) return null;
  const pairs = [];
  snap.forEach((doc) => {
    const slim = slimOverlayDoc(doc.data());
    if (slim) pairs.push([doc.id, slim]);
  });
  void rebuildDynamicOverlayRollupSafe(db);
  return pairs;
}
