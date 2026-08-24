import { NextResponse } from "next/server";
import { filterStartups, visibleHiring } from "../../../lib/store.js";
import { featuredPinIdSetAsync } from "../../../lib/placements.js";

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
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      sector: s.sector,
      fundingStage: s.fundingStage,
      website: s.website,
      area: s.area,
      hiring: hiring ? { count: hiring.count ?? null, roles: hiring.roles || [] } : null,
      founded: s.founded ?? null,
      active: s.active !== false,
      addedAt: s.addedAt ?? null,
      spotlight: s.spotlight === true,
      sponsored: sponsoredIds.has(s.id) || s.sponsored === true,
    };
  });

  return NextResponse.json(slim);
}
