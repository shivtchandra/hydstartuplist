import { getApproved, getStartupById, visibleHiring } from "../../../../lib/store.js";
import { featuredPinIdSetAsync } from "../../../../lib/placements.js";

// One file per startup (/data/startups/<id>.json) for the detail sheet on the
// static site; same shape as /api/startups/[id].
export const dynamic = "force-static";

export async function generateStaticParams() {
  return (await getApproved()).map((s) => ({ id: `${s.id}.json` }));
}

export async function GET(_req, { params }) {
  const s = await getStartupById(String(params.id).replace(/\.json$/, ""));
  if (!s) return Response.json({ error: "not found" }, { status: 404 });
  const sponsored = (await featuredPinIdSetAsync()).has(s.id) || s.sponsored === true;
  return Response.json({
    id: s.id,
    name: s.name,
    website: s.website,
    logoUrl: s.logoUrl || null,
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
