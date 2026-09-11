import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { refreshDynamicOverlayRollup } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** One-shot / periodic rebuild of startups_meta/overlay_v1 (1-doc public read). */
export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const db = await getAdminDb();
  if (!db) return NextResponse.json({ ok: false, reason: "no-db" }, { status: 500 });
  const result = await refreshDynamicOverlayRollup(db);
  return NextResponse.json({ ok: !!result?.ok, ...result });
}
