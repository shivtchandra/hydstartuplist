import { NextResponse } from "next/server";
import { runSyncPriorityCareers } from "../../../../lib/cron/sync-priority-careers.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Prefer GitHub Actions for the heavy scrape (Fluid Active CPU). Allow emergency Vercel runs.
  if (process.env.CRON_ON_VERCEL !== "1" && process.env.GITHUB_ACTIONS !== "true") {
    return NextResponse.json(
      {
        skipped: true,
        reason: "Heavy scrape runs on GitHub Actions. Set CRON_ON_VERCEL=1 to force here.",
      },
      { status: 200 }
    );
  }
  const result = await runSyncPriorityCareers();
  const status = result.ok === false ? 500 : 200;
  return NextResponse.json(result, { status });
}
