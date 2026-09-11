import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { getApproved, invalidateDynamicOverlay, refreshDynamicOverlayRollup, visibleHiring } from "../../../../lib/store.js";
import { checkAdminPasscode } from "../../../../lib/admin-auth.js";

export const dynamic = "force-dynamic";

function checkPasscode(req) {
  const passcode = req.headers.get("x-admin-passcode");
  return checkAdminPasscode(req);
}

export async function GET(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await getApproved();
  const startups = all
    .map((s) => ({
      id: s.id,
      name: s.name,
      website: s.website || "",
      sector: s.sector || "Other",
      fundingStage: s.fundingStage || "Undisclosed",
      area: s.area || "Hyderabad",
      active: s.active !== false,
      addedAt: s.addedAt || s.updatedAt || null,
      verified: s.verified === true,
      hiring: visibleHiring(s),
    }))
    .sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0));

  return NextResponse.json(
    { startups },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function POST(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await req.json().catch(() => ({}));
  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ error: "id and active boolean are required" }, { status: 400 });
  }

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }, { status: 500 });

  await db.collection("startups_dynamic").doc(id).set(
    {
      active,
      visibilityUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  invalidateDynamicOverlay();
  void refreshDynamicOverlayRollup(db);

  return NextResponse.json({ ok: true, id, active });
}
