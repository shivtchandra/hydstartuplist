import { NextResponse } from "next/server";
import { getApproved } from "../../../lib/store.js";

// Small, targeted payload — only the companies that have news items, with
// just the fields the /news feed needs (not the full enriched record).
export const dynamic = "force-dynamic";

export async function GET() {
  const items = getApproved()
    .filter((s) => Array.isArray(s.news) && s.news.length)
    .flatMap((s) =>
      s.news.map((n) => ({
        ...n,
        companyId: s.id,
        companyName: s.name,
        website: s.website,
        sector: s.sector,
      }))
    )
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return NextResponse.json(items);
}
