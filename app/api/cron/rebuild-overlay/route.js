import { NextResponse } from "next/server";
import { runRebuildOverlay } from "../../../../lib/cron/rebuild-overlay.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Overlay rebuild is relatively light; allow Vercel OR GH.
  const result = await runRebuildOverlay();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
