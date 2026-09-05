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
    return {
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
    };
  });
}
