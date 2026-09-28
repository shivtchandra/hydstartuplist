import { NextResponse } from "next/server";
import { getPublicStartups } from "../../../lib/startups-public.js";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slim = await getPublicStartups({
    sector: searchParams.get("sector") || "",
    fundingStage: searchParams.get("fundingStage") || "",
    area: searchParams.get("area") || "",
    q: searchParams.get("q") || "",
  });

  return NextResponse.json(slim, {
    headers: {
      // ~680KB per response; at s-maxage=300 each query variant was regenerated
      // up to 288x/day. Admin edits call revalidatePath("/api/startups").
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
