import { NextResponse } from "next/server";
import { getAllJobs } from "../../../lib/jobs.js";

export const dynamic = "force-dynamic";

// Only the home preview reads this (first 12 + count). Shipping the full list
// was ~4.9MB per origin fetch, re-pulled every 5 min — the bulk of Fast Origin Transfer.
const PREVIEW = 12;

export async function GET() {
  const jobs = await getAllJobs();
  const list = Array.isArray(jobs) ? jobs : [];
  // fetchedAt lives on Adzuna docs; avoid a second Firestore hop just for a timestamp.
  return NextResponse.json(
    {
      jobs: list.slice(0, PREVIEW),
      total: list.length,
      fetchedAt: null,
      stale: jobs?.sourceStale === true,
    },
    {
      headers: {
        // Job syncs run a few times a day; an hour at the edge is plenty fresh.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
