import { NextResponse } from "next/server";
import { runSyncEmpleosJobs } from "../../../../lib/cron/sync-empleos-jobs.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runSyncEmpleosJobs();
  return NextResponse.json(result, {
    status: result.status || (result.ok === false ? 500 : 200),
  });
}
