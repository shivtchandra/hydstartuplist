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
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
