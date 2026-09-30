import { NextResponse } from "next/server";
import { getRadarEntries, getRadarRemoteHires, radarMeta } from "../../../lib/radar.js";
import { verifyBearerIdToken } from "../../../lib/firebaseAdmin.js";

// Research fields only signed-in members receive.
function stripDetails(row) {
  const { depth, missReasons, missReasonLabels, tierNote, ...rest } = row;
  return { ...rest, missReasons: [], missReasonLabels: [], hasDepth: !!depth || row.hasDepth };
}

export const dynamic = "force-dynamic";

/**
 * GET /api/radar?geo=hyd
 *
 * The list is public; research details (founder LinkedIns, sources, notes,
 * why-it's-missed) are sent only with a valid Firebase ID token.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const geo = searchParams.get("geo") || "hyd";
    if (!["hyd", "sf", "remote"].includes(geo)) {
      return NextResponse.json({ error: "Invalid geo" }, { status: 400 });
    }

    const member = await verifyBearerIdToken(req);
    const meta = radarMeta(geo);
    let entries = await getRadarEntries(geo, {
      includeDepth: !!member,
      includeJobs: false,
      exclusiveOnly: geo === "hyd",
    });

    const remoteHires = getRadarRemoteHires();
    const remoteNames = new Set(
      remoteHires.flatMap((r) => [r.name.toLowerCase(), r.id.replace(/^radar-remote-/, "").toLowerCase()])
    );

    // Dedup so companies featured in Remote Hires (e.g. Synthio Labs, Plane) don't repeat in Watch
    entries = entries.filter((e) => {
      const n = (e.name || "").toLowerCase();
      const firstWord = n.split(" ")[0];
      return !remoteNames.has(n) && !remoteNames.has(firstWord);
    });

    let allEntries = [...entries, ...remoteHires];
    if (!member) allEntries = allEntries.map(stripDetails);

    return NextResponse.json(
      {
        locked: false,
        detailsLocked: !member,
        geo,
        meta: {
          updatedAt: meta.updatedAt,
          headline: meta.headline,
          blurb: meta.blurb,
          exclusiveList: {
            ...meta.exclusiveList,
            watchCount: entries.filter((e) => e.exclusiveTier === "watch").length,
            remoteCount: remoteHires.length,
            total: allEntries.length,
          },
        },
        entries: allEntries,
      },
      {
        headers: {
          // Only the anonymous (detail-free) response may be shared by the CDN.
          "Cache-Control": member
            ? "private, no-store"
            : "public, s-maxage=600, stale-while-revalidate=1200",
          Vary: "Authorization",
        },
      }
    );
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
