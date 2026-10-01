import { NextResponse } from "next/server";
import { getRadarEntries, getRadarRemoteHires, radarMeta } from "../../../lib/radar.js";
import { verifyBearerIdToken, lastIdTokenError } from "../../../lib/firebaseAdmin.js";

// Signed-out visitors get a preview: this many companies per section.
const PREVIEW_PER_TIER = 3;

// Research fields only signed-in members receive.
function stripDetails(row) {
  const { depth, missReasons, missReasonLabels, tierNote, ...rest } = row;
  const founders = depth?.founders || [];
  return {
    ...rest,
    missReasons: [],
    missReasonLabels: [],
    hasDepth: !!depth || row.hasDepth,
    // Counts only — lets signed-out visitors see what the full brief contains.
    lockedCounts: {
      linkedins: founders.filter((f) => f.linkedin).length,
      sources: (depth?.sources || []).length,
      whyHard: new Set([...(missReasonLabels || []), ...(depth?.stealthSignals || [])]).size,
      notes: !!depth?.researchNotes,
    },
  };
}

export const dynamic = "force-dynamic";

/**
 * GET /api/radar?geo=hyd
 *
 * Signed-out: a preview (PREVIEW_PER_TIER companies per section, no research
 * details) plus hidden counts. With a valid Firebase ID token: every company
 * and its full brief (founder LinkedIns, sources, notes, why-it's-missed).
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const geo = searchParams.get("geo") || "hyd";
    if (!["hyd", "sf", "remote"].includes(geo)) {
      return NextResponse.json({ error: "Invalid geo" }, { status: 400 });
    }

    const member = await verifyBearerIdToken(req);
    const personalised = !!req.headers.get("authorization") || searchParams.has("member");
    const meta = radarMeta(geo);
    let entries = await getRadarEntries(geo, {
      includeDepth: true, // stripped below for signed-out requests
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
    const hiddenCounts = { core: 0, watch: 0, remote: 0 };
    if (!member) {
      const seen = { core: 0, watch: 0, remote: 0 };
      allEntries = allEntries
        .filter((e) => {
          const tier = e.exclusiveTier in seen ? e.exclusiveTier : "watch";
          seen[tier] += 1;
          if (seen[tier] > PREVIEW_PER_TIER) {
            hiddenCounts[tier] += 1;
            return false;
          }
          return true;
        })
        .map(stripDetails);
    }

    return NextResponse.json(
      {
        locked: false,
        detailsLocked: !member,
        hiddenCounts,
        // Why a token that was sent didn't unlock Radar (short code, no secrets).
        ...(personalised && !member ? { authError: lastIdTokenError() || "no-token" } : {}),
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
          "Cache-Control": personalised
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
