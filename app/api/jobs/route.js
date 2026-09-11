import { NextResponse } from "next/server";
import { getAllJobs } from "../../../lib/jobs.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await getAllJobs();
  // fetchedAt lives on Adzuna docs; avoid a second Firestore hop just for a timestamp.
  return NextResponse.json(
    {
      jobs,
      fetchedAt: null,
      stale: jobs?.sourceStale === true,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
