import { NextResponse } from "next/server";
import { getNewsFeed } from "../../../lib/news.js";

// Small, targeted payload — only the companies that have news items, with
// just the fields the /news feed needs (not the full enriched record).
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getNewsFeed();
  // ~270KB; news is fetched once a day by cron, so cache at the edge.
  return NextResponse.json(items, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
