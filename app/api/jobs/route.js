import { NextResponse } from "next/server";
import { getAllJobs } from "../../../lib/jobs.js";
import { getAdminDb } from "../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await getAllJobs();

  const db = await getAdminDb();
  if (!db) {
    return NextResponse.json({ jobs, fetchedAt: null, note: "Adzuna not configured yet" });
  }

  try {
    const snap = await db.collection("job_board").doc("adzuna_latest").get();
    const adzuna = snap.exists ? snap.data() : { jobs: [], fetchedAt: null };
    return NextResponse.json({ jobs, fetchedAt: adzuna.fetchedAt || null });
  } catch (err) {
    console.error("jobs read error:", err);
    return NextResponse.json({ jobs, fetchedAt: null, note: "Adzuna read error" });
  }
}
