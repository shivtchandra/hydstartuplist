// Manual ad-spot / monetization placements (see data/placements.json).
// Freemium: every approved startup stays on the map for free. This file only
// resolves scarce paid inventory — featured pins, GCC spotlight, job boosts.

import fs from "fs";
import path from "path";
import { getAdminDb } from "./firebaseAdmin.js";

const FILE = path.join(process.cwd(), "data", "placements.json");

// ── Live overlay ──────────────────────────────────────────────────────────
// Slots an admin activates from /admin (after verifying a UPI payment) are
// stored in the Firestore `granted_placements` collection so they go live
// without a redeploy. data/placements.json stays the code-editable base; these
// merge on top. Each doc: { type: "featured"|"gcc"|"jobBoost", startupId?,
// gccId?, match?, label?, startsAt?, endsAt?, requestId?, createdAt }.
async function getGrantedSlots(now = Date.now()) {
  const db = await getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection("granted_placements").get();
    const slots = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.active !== false && inWindow(s, now));

    const requestIds = [...new Set(slots.map((s) => s.requestId).filter(Boolean))];
    if (!requestIds.length) return slots;

    const requestStates = new Map();
    for (const requestId of requestIds) {
      const req = await db.collection("featured_requests").doc(requestId).get();
      requestStates.set(requestId, req.exists ? req.data() : null);
    }

    return slots.filter((slot) => {
      if (!slot.requestId) return true;
      const req = requestStates.get(slot.requestId);
      if (!req) return true;
      if (req.status === "rejected") return false;
      if (req.placementVisible === false) return false;
      return true;
    });
  } catch {
    return [];
  }
}

function readPlacements() {
  if (!fs.existsSync(FILE)) {
    return {
      featuredPins: { maxActive: 5, slots: [] },
      gccHiringSpotlight: { maxActive: 3, slots: [] },
      sponsoredJobBoosts: { maxActive: 8, slots: [] },
      chromeSlots: { homepageBanner: null, mapSidebar: null },
      newsletterSponsor: null,
    };
  }
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function inWindow(slot, now = Date.now()) {
  if (!slot) return false;
  if (slot.startsAt && now < new Date(slot.startsAt).getTime()) return false;
  if (slot.endsAt && now > new Date(slot.endsAt).getTime()) return false;
  return true;
}

function activeSlots(group, now = Date.now()) {
  if (!group?.slots?.length) return [];
  const max = group.maxActive ?? group.slots.length;
  return group.slots.filter((s) => inWindow(s, now)).slice(0, max);
}

/** @returns {{ startupId: string, label: string }[]} */
export function getFeaturedPins(now = Date.now()) {
  const cfg = readPlacements();
  return activeSlots(cfg.featuredPins, now).map((s) => ({
    startupId: s.startupId,
    label: s.label || "Sponsored",
  }));
}

/** Set of startup IDs with an active featured-pin placement. */
export function featuredPinIdSet(now = Date.now()) {
  return new Set(getFeaturedPins(now).map((p) => p.startupId));
}

/** @returns {{ gccId: string, label: string }[]} */
export function getGccSpotlights(now = Date.now()) {
  const cfg = readPlacements();
  return activeSlots(cfg.gccHiringSpotlight, now).map((s) => ({
    gccId: s.gccId,
    label: s.label || "Hiring spotlight",
  }));
}

export function gccSpotlightIdSet(now = Date.now()) {
  return new Set(getGccSpotlights(now).map((p) => p.gccId));
}

/** @returns {{ match: object, label: string }[]} */
export function getJobBoosts(now = Date.now()) {
  const cfg = readPlacements();
  return activeSlots(cfg.sponsoredJobBoosts, now).map((s) => ({
    match: s.match || {},
    label: s.label || "Sponsored",
  }));
}

/** True if a job row matches any active boost rule. */
export function jobIsBoosted(job, boosts = getJobBoosts()) {
  if (!boosts.length || !job) return false;
  const company = (job.company || "").toLowerCase();
  const title = (job.title || "").toLowerCase();
  return boosts.some(({ match }) => {
    if (match.companyIncludes && company.includes(String(match.companyIncludes).toLowerCase())) {
      return true;
    }
    if (match.titleIncludes && title.includes(String(match.titleIncludes).toLowerCase())) {
      return true;
    }
    if (match.jobId && job.id === match.jobId) return true;
    return false;
  });
}

/** Future chrome / newsletter — exposed for admin tooling; UI may ignore nulls. */
export function getChromeSlots() {
  const cfg = readPlacements();
  return {
    homepageBanner: cfg.chromeSlots?.homepageBanner ?? null,
    mapSidebar: cfg.chromeSlots?.mapSidebar ?? null,
    newsletterSponsor: cfg.newsletterSponsor ?? null,
  };
}


/** CTA defaults for empty inventory / chrome (overridable in placements.json). */
const DEFAULT_FEATURE_CTA = {
  headline: "Feature this pin",
  body: "Limited featured pins on the map — basic listings stay free.",
  ctaLabel: "Get featured",
  ctaHref: "/feature",
};

function resolveCta(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FEATURE_CTA };
  return {
    headline: raw.headline || DEFAULT_FEATURE_CTA.headline,
    body: raw.body || DEFAULT_FEATURE_CTA.body,
    ctaLabel: raw.ctaLabel || DEFAULT_FEATURE_CTA.ctaLabel,
    ctaHref: raw.ctaHref || raw.href || DEFAULT_FEATURE_CTA.ctaHref,
  };
}

/**
 * Featured-pin inventory for UI: filled IDs + how many Available slots to show.
 * Prefer honest empty placeholders over fake sponsored brands.
 */
export function getFeaturedInventory(now = Date.now()) {
  const cfg = readPlacements();
  const group = cfg.featuredPins || { maxActive: 5, slots: [] };
  const maxActive = group.maxActive ?? 5;
  const filled = activeSlots(group, now);
  const available = Math.max(0, maxActive - filled.length);
  const sales = cfg.sales && typeof cfg.sales === "object" ? cfg.sales : {};
  const cta = resolveCta({ ...DEFAULT_FEATURE_CTA, ...sales });
  return {
    maxActive,
    filled: filled.map((s) => ({
      startupId: s.startupId,
      label: s.label || "Sponsored",
    })),
    available,
    cta,
  };
}

// ── Async merged getters (file base + live Firestore overlay) ───────────────
// API routes call these so admin-activated slots appear immediately.

export async function featuredPinIdSetAsync(now = Date.now()) {
  const set = featuredPinIdSet(now);
  for (const g of await getGrantedSlots(now)) {
    if (g.type === "featured" && g.startupId) set.add(g.startupId);
  }
  return set;
}

export async function gccSpotlightIdSetAsync(now = Date.now()) {
  const set = gccSpotlightIdSet(now);
  for (const g of await getGrantedSlots(now)) {
    if (g.type === "gcc" && g.gccId) set.add(g.gccId);
  }
  return set;
}

export async function getJobBoostsAsync(now = Date.now()) {
  const base = getJobBoosts(now);
  const extra = (await getGrantedSlots(now))
    .filter((g) => g.type === "jobBoost")
    .map((g) => ({ match: g.match || {}, label: g.label || "Sponsored" }));
  return [...base, ...extra];
}

export async function getFeaturedInventoryAsync(now = Date.now()) {
  const inv = getFeaturedInventory(now);
  const granted = (await getGrantedSlots(now))
    .filter((g) => g.type === "featured" && g.startupId)
    .map((g) => ({ startupId: g.startupId, label: g.label || "Sponsored" }));
  const seen = new Set(inv.filled.map((f) => f.startupId));
  const merged = [...inv.filled];
  for (const g of granted) {
    if (!seen.has(g.startupId)) {
      seen.add(g.startupId);
      merged.push(g);
    }
  }
  const filled = merged.slice(0, inv.maxActive);
  return { ...inv, filled, available: Math.max(0, inv.maxActive - filled.length) };
}

export function getPlacementsSummary(now = Date.now()) {
  return {
    featuredPins: getFeaturedPins(now),
    featuredInventory: getFeaturedInventory(now),
    gccHiringSpotlight: getGccSpotlights(now),
    sponsoredJobBoosts: getJobBoosts(now),
    chrome: getChromeSlots(),
  };
}
