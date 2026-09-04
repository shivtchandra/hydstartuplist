import { NextResponse } from "next/server";
import { getNewsFeed } from "../../../lib/news.js";

// Small, targeted payload — only the companies that have news items, with
// just the fields the /news feed needs (not the full enriched record).
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getNewsFeed();
  return NextResponse.json(items);
}
