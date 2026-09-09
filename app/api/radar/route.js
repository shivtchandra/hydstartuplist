import { NextResponse } from "next/server";
import { getRadarEntries, radarMeta } from "../../../lib/radar.js";
import { verifyBearerIdToken, getAdminAuth } from "../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";

function hasBearer(req) {
  const header = req.headers.get("authorization") || "";
  return /^Bearer\s+\S+/i.test(header);
}

/**
 * GET /api/radar?geo=hyd
 * Public: locked teaser (counts only — no company depth).
 * Authorization: Bearer <Firebase ID token> → exclusive Hyd list with founder LinkedIns.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const geo = searchParams.get("geo") || "hyd";
  if (!["hyd", "sf", "remote"].includes(geo)) {
    return NextResponse.json({ error: "Invalid geo" }, { status: 400 });
  }

  const meta = radarMeta(geo);
  const authConfigured = !!(await getAdminAuth());
  const claims = await verifyBearerIdToken(req);
  const devUnlock =
    process.env.NODE_ENV === "development" &&
    process.env.RADAR_DEV_UNLOCK === "1" &&
    hasBearer(req);

  if (!claims && !devUnlock) {
    return NextResponse.json({
      locked: true,
      authConfigured,
      geo,
      meta: {
        updatedAt: meta.updatedAt,
        headline: meta.headline,
        blurb: meta.blurb,
        exclusiveList: meta.exclusiveList,
        depthEnriched: meta.depthEnriched,
      },
      message: authConfigured
        ? "Sign in with Google to unlock Radar depth."
        : "Sign-in is required. Set FIREBASE_SERVICE_ACCOUNT on the server to verify members (or RADAR_DEV_UNLOCK=1 in local dev).",
    });
  }

  if (!authConfigured && !devUnlock) {
    return NextResponse.json(
      {
        locked: true,
        authConfigured: false,
        error: "Radar unlock needs FIREBASE_SERVICE_ACCOUNT on the server.",
      },
      { status: 503 }
    );
  }

  const entries = await getRadarEntries(geo, {
    includeDepth: true,
    includeJobs: false,
    exclusiveOnly: geo === "hyd",
  });

  return NextResponse.json({
    locked: false,
    geo,
    uid: claims?.uid || "dev",
    meta: {
      updatedAt: meta.updatedAt,
      headline: meta.headline,
      blurb: meta.blurb,
      exclusiveList: meta.exclusiveList,
    },
    entries,
  });
}
