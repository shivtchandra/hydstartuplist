import { NextResponse } from "next/server";
import { filterStartups } from "../../../lib/store.js";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const list = await filterStartups({
    sector: searchParams.get("sector") || "",
    fundingStage: searchParams.get("fundingStage") || "",
    area: searchParams.get("area") || "",
    q: searchParams.get("q") || "",
  });

  const slim = list.map((s) => {
    const hiring = s.hiring;
    return {
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      sector: s.sector,
      fundingStage: s.fundingStage,
      website: s.website,
      area: s.area,
      hiring: hiring?.active ? { count: hiring.count ?? null, roles: hiring.roles || [] } : null,
      founded: s.founded ?? null,
      active: s.active !== false,
      addedAt: s.addedAt ?? null,
    };
  });

  return NextResponse.json(slim);
}
