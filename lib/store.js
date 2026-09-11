/**
 * Next.js store facade — React.cache request dedupe for RSC/route handlers.
 * Data logic lives in store-core.js (safe for plain Node / GitHub Actions).
 */
import * as React from "react";
import { startupSlug } from "./slug.js";
import * as core from "./store-core.js";

const cache = typeof React.cache === "function" ? React.cache : ((fn) => fn);

export const {
  invalidateDynamicOverlay,
  refreshDynamicOverlayRollup,
  isHiringFresh,
  visibleHiring,
  getPending,
  addPending,
} = core;

export const getApproved = cache(core.getApproved);
export const getStartupById = cache(async (id) => {
  const all = await getApproved();
  return all.find((s) => s.id === id) || null;
});
export const getStartupBySlug = cache(async (slug) => {
  const all = await getApproved();
  return all.find((s) => s.active !== false && startupSlug(s) === slug) || null;
});

export async function getAllStartupSlugs() {
  const all = await getApproved();
  return all.filter((s) => s.active !== false).map(startupSlug);
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
