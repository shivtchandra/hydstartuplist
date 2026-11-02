import { NextResponse } from "next/server";
import { readGuardedJson } from "../../../../lib/career/guard.js";
import { fetchFullJobText } from "../../../../lib/ats/job-details.js";
import boards from "../../../../data/ats-boards.json";

export const dynamic = "force-dynamic";

// One match run shortlists 40 jobs, so 4 calls of 10. Allows a few runs per 10 minutes.
const MAX_JOBS = 10;

export async function POST(req) {
  const { body, response } = await readGuardedJson(req, { bucket: "job-text", max: 40, maxBytes: 20000 });
  if (response) return response;

  const jobs = (Array.isArray(body?.jobs) ? body.jobs : [])
    .filter((j) => j && typeof j.id === "string")
    .slice(0, MAX_JOBS);
  const results = await Promise.all(jobs.map((j) => fetchFullJobText({ id: j.id, url: j.url }, boards)));

  const texts = {};
  jobs.forEach((j, i) => {
    if (results[i]) texts[j.id] = results[i];
  });
  return NextResponse.json({ texts });
}
