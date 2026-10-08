import { runSyncDirectJobs } from "../../../../lib/cron/sync-direct-jobs.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runSyncDirectJobs();
  return Response.json(result, {
    status: result.status || (result.ok === false ? 500 : 200),
  });
}
