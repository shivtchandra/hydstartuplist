import { NextResponse } from "next/server";
import { filterStartups } from "../../../lib/store.js";

// Public list = render-only fields. The enriched, expensive-to-build layer
// (address, careers, description) is NOT shipped in bulk — it loads one record
// at a time via /api/startups/[id] on pin click, so the whole dataset can't be
// scraped from a single request in DevTools.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const list = filterStartups({
    sector: searchParams.get("sector") || "",
    fundingStage: searchParams.get("fundingStage") || "",
    area: searchParams.get("area") || "",
    q: searchParams.get("q") || "",
  });
  const slim = list.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    sector: s.sector,
    fundingStage: s.fundingStage,
    website: s.website, // needed for the favicon logo marker
    area: s.area,       // coarse locality (exact street address stays in the detail route)
    hiring: s.hiring?.active ? { count: s.hiring.count ?? null } : null,
    founded: s.founded ?? null,
    active: s.active !== false, // default true until the meta-check marks it
  }));
  return NextResponse.json(slim);
}
