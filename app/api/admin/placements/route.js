import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";

function checkPasscode(req) {
  const passcode = req.headers.get("x-admin-passcode");
  return !!process.env.NEXT_PUBLIC_ADMIN_PASSCODE && passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
}

// List live granted placements (the Firestore overlay merged on top of
// data/placements.json by lib/placements.js).
export async function GET(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ slots: [], note: "FIREBASE_SERVICE_ACCOUNT not set" });

  const snap = await db.collection("granted_placements").orderBy("createdAt", "desc").get();
  const slots = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ slots });
}

// Activate a slot (goes live immediately) or deactivate an existing one.
//   POST { action: "activate", type, startupId?|gccId?|match?, days, startsAt?, label?, requestId? }
//   POST { action: "deactivate", id }
export async function POST(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const action = body.action || "activate";

  if (action === "deactivate") {
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.collection("granted_placements").doc(body.id).set({ active: false }, { merge: true });
    return NextResponse.json({ ok: true, id: body.id, active: false });
  }

  const { type, startupId, gccId, match, days, startsAt, label, requestId } = body;
  if (!["featured", "gcc", "jobBoost"].includes(type)) {
    return NextResponse.json({ error: "type must be featured | gcc | jobBoost" }, { status: 400 });
  }
  if (type === "featured" && !startupId) {
    return NextResponse.json({ error: "startupId required for a featured pin" }, { status: 400 });
  }
  if (type === "gcc" && !gccId) {
    return NextResponse.json({ error: "gccId required for a GCC spotlight" }, { status: 400 });
  }

  const start = startsAt ? new Date(startsAt) : new Date();
  const nDays = Math.max(1, Math.floor(Number(days) || 1));
  const end = new Date(start.getTime() + nDays * 86400000);

  const doc = {
    type,
    startupId: type === "featured" ? String(startupId).trim() : null,
    gccId: type === "gcc" ? String(gccId).trim() : null,
    match: type === "jobBoost" ? match || {} : null,
    label: label || "Sponsored",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    days: nDays,
    requestId: requestId || null,
    active: true,
    createdAt: new Date().toISOString(),
  };

  const ref = await db.collection("granted_placements").add(doc);

  // Mark the originating payment request as placed (if any).
  if (requestId) {
    await db.collection("featured_requests").doc(requestId).set(
      { status: "placed", placedSlotId: ref.id, placedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  return NextResponse.json({ ok: true, slotId: ref.id, endsAt: doc.endsAt });
}
