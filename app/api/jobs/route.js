import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAdminDb } from "../../../lib/firebaseAdmin.js";
import { getApproved, visibleHiring } from "../../../lib/store.js";
import { getJobBoostsAsync, jobIsBoosted } from "../../../lib/placements.js";

export const dynamic = "force-dynamic";

function gccNames() {
  const file = path.join(process.cwd(), "data", "gccs.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")).map((g) => g.name.toLowerCase());
}

// Classify each job so the UI can offer real filters instead of exposing
// "adzuna vs careers" plumbing as a badge. Career-page picks are already
// known-accurate startup roles. Adzuna's own company field is free text, so
// only match it against the curated GCC list (distinctive proper nouns —
// "Amazon", "Wells Fargo" — safe substring matches); everything else that
// doesn't hit either bucket is general Hyderabad market listings.
function categorize(job, gccs) {
  if (job.source === "careers") return "startup";
  const company = (job.company || "").toLowerCase();
  if (gccs.some((g) => company.includes(g) || g.includes(company))) return "gcc";
  return "other";
}

// Company career-page picks — the same real {title, url} roles check-hiring
// already found on each startup's own ATS/careers page (app/page.jsx's
// hiring badge shows these too). Mixed in here so /jobs isn't just Adzuna's
// generic board listings, which skew toward large non-startup employers.
async function careerPicks() {
  const all = await getApproved();
  const jobs = [];
  for (const s of all.filter((startup) => startup.active !== false)) {
    const hiring = visibleHiring(s);
    if (!hiring || !Array.isArray(hiring.roles)) continue;
    for (const role of hiring.roles) {
      jobs.push({
        id: `careers-${s.id}-${role.url}`,
        title: role.title,
        company: s.name,
        location: s.area || "Hyderabad",
        url: role.url,
        postedAt: hiring.checkedAt || null,
        source: "careers",
      });
    }
  }
  return jobs;
}


async function withBoost(jobs) {
  const boosts = await getJobBoostsAsync();
  return jobs
    .map((j) => ({ ...j, sponsored: jobIsBoosted(j, boosts) }))
    .sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
}

export async function GET() {
  const picks = await careerPicks();
  const gccs = gccNames();

  const db = await getAdminDb();
  if (!db) {
    const jobs = await withBoost(picks.map((j) => ({ ...j, category: categorize(j, gccs) })));
    return NextResponse.json({ jobs, fetchedAt: null, note: "Adzuna not configured yet" });
  }

  try {
    const snap = await db.collection("job_board").doc("adzuna_latest").get();
    const adzuna = snap.exists ? snap.data() : { jobs: [], fetchedAt: null };
    const jobs = await withBoost(
      [...picks, ...(adzuna.jobs || [])].map((j) => ({ ...j, category: categorize(j, gccs) }))
    );
    return NextResponse.json({ jobs, fetchedAt: adzuna.fetchedAt || null });
  } catch (err) {
    console.error("jobs read error:", err);
    const jobs = await withBoost(picks.map((j) => ({ ...j, category: categorize(j, gccs) })));
    return NextResponse.json({ jobs, fetchedAt: null, note: "Adzuna read error" });
  }
}
