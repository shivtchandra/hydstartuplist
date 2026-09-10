import { NextResponse } from "next/server";
import { getRadarEntries, radarMeta } from "../../../lib/radar.js";
import { verifyBearerIdToken, getAdminAuth, firebaseAdminInitError } from "../../../lib/firebaseAdmin.js";

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
  try {
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
      const adminErr = firebaseAdminInitError();
      const saPresent = !!(process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
      let message;
      if (authConfigured) {
        message = "Sign in with Google to unlock Radar depth.";
      } else if (!saPresent) {
        message =
          "FIREBASE_SERVICE_ACCOUNT is missing on this deployment. In Vercel: save the env var for Production, then Redeploy (env changes do not apply to the old deploy).";
      } else if (adminErr) {
        message = `Firebase Admin failed to start (${adminErr}). Re-paste FIREBASE_SERVICE_ACCOUNT as one-line JSON starting with { — no wrapping quotes.`;
      } else {
        message =
          "FIREBASE_SERVICE_ACCOUNT is set but Admin did not start. Redeploy once, then Retry. If it still fails, re-paste the JSON (must start with {).";
      }
      return NextResponse.json({
        locked: true,
        authConfigured,
        saPresent,
        geo,
        meta: {
          updatedAt: meta.updatedAt,
          headline: meta.headline,
          blurb: meta.blurb,
          exclusiveList: meta.exclusiveList,
          depthEnriched: meta.depthEnriched,
        },
        message,
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
  } catch (err) {
    const msg = String(err?.message || err || "");
    console.error("[api/radar]", msg);
    const hint = /FIREBASE|service.account|private_key|JSON/i.test(msg)
      ? "FIREBASE_SERVICE_ACCOUNT looks invalid — paste the JSON without surrounding quotes from .env."
      : /ENOENT|radar\.json/i.test(msg)
        ? "Radar data file missing from the server bundle."
        : "Radar failed to load. Check server logs / FIREBASE_SERVICE_ACCOUNT.";
    return NextResponse.json({ locked: true, error: hint, detail: msg.slice(0, 160) }, { status: 500 });
  }
}
