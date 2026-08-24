import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";

function checkPasscode(req) {
  const passcode = req.headers.get("x-admin-passcode");
  return !!process.env.NEXT_PUBLIC_ADMIN_PASSCODE && passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
}

// List featured-pin payment requests (manual UPI flow). Admin verifies each
// against the bank/UPI statement using the submitted transaction id, then
// activates the slot in data/placements.json.
export async function GET(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ requests: [], note: "FIREBASE_SERVICE_ACCOUNT not set" });

  const snap = await db.collection("featured_requests").orderBy("createdAt", "desc").get();
  const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ requests });
}

// Update a request's status: verified | rejected | pending_verification.
export async function POST(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !["verified", "rejected", "pending_verification"].includes(status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }, { status: 500 });

  const existing = await db.collection("featured_requests").doc(id).get();
  const placedSlotId = existing.exists ? existing.data()?.placedSlotId : null;
  if (status === "rejected" && placedSlotId) {
    await db.collection("granted_placements").doc(placedSlotId).set({ active: false }, { merge: true });
  }

  await db.collection("featured_requests").doc(id).set(
    {
      status,
      reviewedAt: new Date().toISOString(),
      ...(status === "rejected" && placedSlotId
        ? { placementVisible: false, placementRemovedAt: new Date().toISOString() }
        : {}),
    },
    { merge: true }
  );
  return NextResponse.json({ ok: true, id, status });
}
