import { NextResponse } from "next/server";
import { getStartupById, visibleHiring } from "../../../../lib/store.js";
import { featuredPinIdSet } from "../../../../lib/placements.js";

// Single-record detail — the enriched fields (address, careers, description)
// are served one at a time here, only when a user opens a startup.
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const s = await getStartupById(params.id);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  const sponsored = featuredPinIdSet().has(s.id) || s.sponsored === true;
  return NextResponse.json({
    id: s.id,
    name: s.name,
    website: s.website,
    sector: s.sector,
    fundingStage: s.fundingStage,
    area: s.area,
    description: s.description,
    address: s.address,
    careers: s.careers,
    hiring: visibleHiring(s),
    news: s.news || null,
    spotlight: s.spotlight === true,
    sponsored,
  });
}
