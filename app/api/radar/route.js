import { NextResponse } from "next/server";
import { getRadarEntries, radarMeta } from "../../../lib/radar.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/radar?geo=hyd
 *
 * TEMP (2026-09-10): Firebase Admin token verify is bypassed so Radar depth
 * stays readable while FIREBASE_SERVICE_ACCOUNT init is broken on Vercel.
 * Re-enable Bearer + getAdminAuth gate before treating this as members-only again.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const geo = searchParams.get("geo") || "hyd";
    if (!["hyd", "sf", "remote"].includes(geo)) {
      return NextResponse.json({ error: "Invalid geo" }, { status: 400 });
    }

    const meta = radarMeta(geo);
    const entries = await getRadarEntries(geo, {
      includeDepth: true,
      includeJobs: false,
      exclusiveOnly: geo === "hyd",
    });

    return NextResponse.json({
      locked: false,
      temporaryPublic: true,
      geo,
      uid: "temp-public",
      meta: {
        updatedAt: meta.updatedAt,
        headline: meta.headline,
        blurb: meta.blurb,
        exclusiveList: meta.exclusiveList,
      },
      entries,
    });
  } catch (err) {
    const msg = String(err?.message || err || "");
    console.error("[api/radar]", msg);
    return NextResponse.json(
      {
        locked: true,
        error: /ENOENT|radar\.json/i.test(msg)
          ? "Radar data file missing from the server bundle."
          : "Radar failed to load.",
        detail: msg.slice(0, 160),
      },
      { status: 500 }
    );
  }
}
