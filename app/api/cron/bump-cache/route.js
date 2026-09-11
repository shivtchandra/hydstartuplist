import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

/** Cheap ISR/tag bust after GitHub Actions scrapes. */
export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tags = (new URL(req.url).searchParams.get("tags") || "public-jobs,startups-dynamic")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  for (const tag of tags) revalidateTag(tag);
  return NextResponse.json({ ok: true, tags });
}
