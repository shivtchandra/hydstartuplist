import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const REPO = process.env.GITHUB_REPO || "shivtchandra/hydstartuplist";
const WORKFLOW = "cron-jobs.yml";

/**
 * Vercel Cron → GitHub workflow_dispatch for the morning scrape.
 *
 * GitHub's own `schedule` trigger fires the 02:30 UTC scrape 6–7h late (and some
 * days not at all), so fresh jobs landed mid-afternoon IST or never got published.
 * A workflow_dispatch starts within seconds. The scrape itself still runs on the
 * GitHub runner; this route is one API call. The late GitHub schedule stays as a
 * backup and skips itself when a dispatch already ran that day (see the `gate` job).
 *
 * Needs GH_DISPATCH_TOKEN: a fine-grained PAT on this repo with Actions: read & write.
 */
export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GH_DISPATCH_TOKEN not set; GitHub schedule remains the only trigger" }, { status: 500 });
  }
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    // ?scope=jobs (the 06:30/12:30/18:30 runs) skips the Firecrawl-backed scrapers.
    body: JSON.stringify({
      ref: process.env.GITHUB_DISPATCH_REF || "master",
      inputs: { scope: new URL(req.url).searchParams.get("scope") === "jobs" ? "jobs" : "full" },
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch((err) => ({ ok: false, status: 0, text: async () => String(err?.message || err) }));

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error("dispatch-scrape failed", res.status, detail);
    return NextResponse.json({ ok: false, status: res.status, detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, dispatched: WORKFLOW });
}
