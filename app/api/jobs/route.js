import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getAdminDb();
  if (!db) return NextResponse.json({ jobs: [], fetchedAt: null, note: "not configured yet" });

  try {
    const snap = await db.collection("job_board").doc("adzuna_latest").get();
    if (!snap.exists) return NextResponse.json({ jobs: [], fetchedAt: null, note: "no data fetched yet" });
    return NextResponse.json(snap.data());
  } catch (err) {
    console.error("jobs read error:", err);
    return NextResponse.json({ jobs: [], fetchedAt: null, note: "read error" });
  }
}
