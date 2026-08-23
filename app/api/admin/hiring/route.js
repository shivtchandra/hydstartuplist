import { NextResponse } from "next/server";
import { getApproved, isHiringFresh } from "../../../../lib/store.js";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";

function checkPasscode(req) {
  const passcode = req.headers.get("x-admin-passcode");
  return !!process.env.NEXT_PUBLIC_ADMIN_PASSCODE && passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
}

// Raw scraper results — every company check-hiring found something for,
// regardless of the 7-day freshness rule or an admin hide (those only
// filter the PUBLIC-facing routes). Admin needs to see everything to
// decide what to hide, including already-stale entries.
export async function GET(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await getApproved();
  const results = all
    .filter((s) => s.hiring)
    .map((s) => ({
      id: s.id,
      name: s.name,
      website: s.website,
      hiring: s.hiring,
      hiringHidden: s.hiringHidden === true,
      fresh: isHiringFresh(s.hiring),
    }))
    .sort((a, b) => new Date(b.hiring.checkedAt || 0) - new Date(a.hiring.checkedAt || 0));

  return NextResponse.json({ results, total: results.length });
}

// Admin manually hides/unhides one company's hiring result from all public
// routes (bulk /api/startups, detail /api/startups/[id], /api/jobs) without
// touching the scraped data itself — re-running check-hiring later just
// overwrites hiring again, so this flag lives separately in startups_dynamic.
export async function POST(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, hidden } = await req.json();
  if (!id || typeof hidden !== "boolean") {
    return NextResponse.json({ error: "id and hidden (boolean) required" }, { status: 400 });
  }

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }, { status: 500 });

  await db.collection("startups_dynamic").doc(id).set({ hiringHidden: hidden }, { merge: true });
  return NextResponse.json({ ok: true, id, hidden });
}
