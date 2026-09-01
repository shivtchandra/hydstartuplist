import { NextResponse } from "next/server";
import { filterStartups, visibleHiring } from "../../../lib/store.js";
import { featuredPinIdSetAsync } from "../../../lib/placements.js";
import { startupSlug } from "../../../lib/slug.js";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const list = await filterStartups({
    sector: searchParams.get("sector") || "",
    fundingStage: searchParams.get("fundingStage") || "",
    area: searchParams.get("area") || "",
    q: searchParams.get("q") || "",
  });

  const sponsoredIds = await featuredPinIdSetAsync();
  const slim = list.map((s) => {
    const hiring = visibleHiring(s);
    return {
      id: s.id,
      slug: startupSlug(s),
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      sector: s.sector,
      fundingStage: s.fundingStage,
      website: s.website,
      logoUrl: s.logoUrl || null,
      area: s.area,
      hiring: hiring ? { count: hiring.count ?? null, roles: hiring.roles || [] } : null,
      founded: s.founded ?? null,
      active: s.active !== false,
      addedAt: s.addedAt ?? null,
      spotlight: s.spotlight === true,
      sponsored: sponsoredIds.has(s.id) || s.sponsored === true,
      description: s.description ? s.description.slice(0, 140) : null,
    };
  });

  return NextResponse.json(slim, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
