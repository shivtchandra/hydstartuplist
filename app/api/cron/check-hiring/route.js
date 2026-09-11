import { NextResponse } from "next/server";
import { runCheckHiring } from "../../../../lib/cron/check-hiring.js";

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
  if (process.env.CRON_ON_VERCEL !== "1") {
    return NextResponse.json({
      skipped: true,
      reason: "Heavy scrape runs on GitHub Actions. Set CRON_ON_VERCEL=1 to force here.",
    });
  }
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offsetRaw = searchParams.get("offset");
  const offset = offsetRaw == null || offsetRaw === "" ? null : parseInt(offsetRaw, 10);
  const result = await runCheckHiring({ limit, offset });
  return NextResponse.json(result, { status: result.ok === false ? 500 : 200 });
}
