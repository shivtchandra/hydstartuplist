import { NextResponse } from "next/server";
import { readGccs } from "../../../lib/gccs.js";
import { gccSpotlightIdSetAsync } from "../../../lib/placements.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = readGccs();
  const spotlight = await gccSpotlightIdSetAsync();
  return NextResponse.json(
    list.map((g) => ({
      ...g,
      sponsored: spotlight.has(g.id) || g.sponsored === true,
    })),
    // Same TTL as /api/placements so spotlight toggles show within minutes.
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
  );
}
