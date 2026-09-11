import { NextResponse } from "next/server";
import { runSyncAtsJobs } from "../../../../lib/cron/sync-ats-jobs.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.CRON_ON_VERCEL !== "1") {
    return NextResponse.json({
      skipped: true,
      reason: "Heavy scrape runs on GitHub Actions. Set CRON_ON_VERCEL=1 to force here.",
    });
  }
  const { searchParams } = new URL(req.url);
  const result = await runSyncAtsJobs({ searchParams });
  return NextResponse.json(result, { status: result.status || (result.ok === false ? 500 : 200) });
}
