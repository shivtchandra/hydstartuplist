import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin.js";
import { getApproved } from "../../../lib/store.js";

export const dynamic = "force-dynamic";

// Company career-page picks — the same real {title, url} roles check-hiring
// already found on each startup's own ATS/careers page (app/page.jsx's
// hiring badge shows these too). Mixed in here so /jobs isn't just Adzuna's
// generic board listings, which skew toward large non-startup employers.
async function careerPicks() {
  const all = await getApproved();
  const jobs = [];
  for (const s of all) {
    if (!s.hiring?.active || !Array.isArray(s.hiring.roles)) continue;
    for (const role of s.hiring.roles) {
      jobs.push({
        id: `careers-${s.id}-${role.url}`,
        title: role.title,
        company: s.name,
        location: s.area || "Hyderabad",
        url: role.url,
        postedAt: s.hiring.checkedAt || null,
        source: "careers",
      });
    }
  }
  return jobs;
}

export async function GET() {
  const picks = await careerPicks();

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ jobs: picks, fetchedAt: null, note: "Adzuna not configured yet" });

  try {
    const snap = await db.collection("job_board").doc("adzuna_latest").get();
    const adzuna = snap.exists ? snap.data() : { jobs: [], fetchedAt: null };
    const jobs = [...picks, ...(adzuna.jobs || [])].sort(
      (a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0)
    );
    return NextResponse.json({ jobs, fetchedAt: adzuna.fetchedAt || null, careerPicks: picks.length, adzunaCount: (adzuna.jobs || []).length });
  } catch (err) {
    console.error("jobs read error:", err);
    return NextResponse.json({ jobs: picks, fetchedAt: null, note: "Adzuna read error" });
  }
}
