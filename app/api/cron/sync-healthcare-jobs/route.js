import { NextResponse } from "next/server";
import { runSyncHealthcareJobs } from "../../../../lib/cron/sync-healthcare-jobs.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSyncHealthcareJobs();
  const status = result.ok === false ? 500 : 200;
  return NextResponse.json(result, { status });
}
