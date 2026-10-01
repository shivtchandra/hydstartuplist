import { filterStartups, visibleHiring } from "./store.js";
import { cleanCompanyDescription, fundingLabel, hiringStatus } from "./company-quality.js";
import { featuredPinIdSetAsync } from "./placements.js";
import { startupSlug } from "./slug.js";

/**
 * Slim public startup list used by the map, insights, and /api/startups.
 * Keep this shape in sync so SSR pages and the client API stay identical.
 */
export async function getPublicStartups(filters = {}) {
  const list = await filterStartups({
    sector: filters.sector || "",
    fundingStage: filters.fundingStage || "",
    area: filters.area || "",
    q: filters.q || "",
  });

  const sponsoredIds = await featuredPinIdSetAsync();
  return list.map((s) => {
    const hiring = visibleHiring(s);
    return compact({
      id: s.id,
      slug: startupSlug(s),
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      sector: s.sector,
      fundingStage: fundingLabel(s.fundingStage),
      hiringStatus: hiringStatus(s),
      locationVerified: s.locationVerified === true,
      needsReview: /\(null\)|\bundefined\b/i.test(s.description || ""),
      website: s.website,
      logoUrl: s.logoUrl || null,
      area: s.area,
      hiring: hiring ? { count: hiring.count ?? null, roles: hiring.roles || [] } : null,
      founded: s.founded ?? null,
      active: s.active !== false,
      addedAt: s.addedAt ?? null,
      spotlight: s.spotlight === true,
      sponsored: sponsoredIds.has(s.id) || s.sponsored === true,
      description: s.description ? cleanCompanyDescription(s.description).slice(0, 140) : null,
    });
  });
}

// This list (~1,200 startups) is serialized into the homepage and /api/startups,
// so null/false/empty placeholders cost ~22% of the payload in origin transfer.
// Consumers only test these fields for truthiness, so absent reads the same.
// `active` stays explicit because absent would read as falsy, not as true.
function compact(entry) {
  for (const key of Object.keys(entry)) {
    const v = entry[key];
    if (key !== "active" && (v === null || v === false || v === "" || (Array.isArray(v) && v.length === 0))) {
      delete entry[key];
    }
  }
  return entry;
}
