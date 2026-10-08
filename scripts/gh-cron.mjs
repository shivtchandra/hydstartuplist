#!/usr/bin/env node
/**
 * Run heavy crons on GitHub Actions (not Vercel Fluid CPU).
 *
 *   node scripts/gh-cron.mjs sync-ats-jobs
 *   node scripts/gh-cron.mjs check-hiring
 *   node scripts/gh-cron.mjs sync-priority-careers
 *   node scripts/gh-cron.mjs rebuild-overlay
 *
 * Env: FIREBASE_SERVICE_ACCOUNT (JSON), NEXT_PUBLIC_SITE_URL or SITE_URL,
 * optional CRON_SECRET (for bump-cache), FIRECRAWL_*, CRON_TIME_BUDGET_MS.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

// Prefer SITE_URL for getSiteUrl() consumers
if (!process.env.NEXT_PUBLIC_SITE_URL && process.env.SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = process.env.SITE_URL;
}

const job = process.argv[2];
if (!job) {
  console.error("Usage: node scripts/gh-cron.mjs <job> [query]  (see runners below)");
  process.exit(2);
}

const runners = {
  "sync-ats-jobs": async () => (await import("../lib/cron/sync-ats-jobs.js")).runSyncAtsJobs({}),
  "check-hiring": async () => {
    const limit = parseInt(process.env.LIMIT || "40", 10);
    return (await import("../lib/cron/check-hiring.js")).runCheckHiring({ limit });
  },
  "sync-priority-careers": async () =>
    (await import("../lib/cron/sync-priority-careers.js")).runSyncPriorityCareers(),
  "sync-healthcare-jobs": async () =>
    (await import("../lib/cron/sync-healthcare-jobs.js")).runSyncHealthcareJobs(),
  "rebuild-overlay": async () => (await import("../lib/cron/rebuild-overlay.js")).runRebuildOverlay(),
};

// These used to be curl'd on Vercel, where each run was capped at 20-30s and
// billed as Fluid Active CPU. Run the same route handlers here instead: free
// and unlimited on a public repo, with up to 6h per job. Optional 3rd arg is a
// query string, e.g. `node scripts/gh-cron.mjs fetch-news limit=20`.
const ROUTE_JOBS = ["fetch-news", "adzuna-jobs", "sync-empleos-jobs", "sync-direct-jobs", "job-alerts", "newsletter"];
for (const name of ROUTE_JOBS) {
  runners[name] = async () => {
    // The handlers check `Bearer ${CRON_SECRET}`; mint one in-process if unset.
    if (!process.env.CRON_SECRET) process.env.CRON_SECRET = crypto.randomUUID();
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";
    const query = process.argv[3] ? `?${process.argv[3]}` : "";
    const { GET } = await import(`../app/api/cron/${name}/route.js`);
    const res = await GET(
      new Request(`${site}/api/cron/${name}${query}`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
    );
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, ...(body && typeof body === "object" ? body : { body }) };
  };
}

if (!runners[job]) {
  console.error("Unknown job:", job);
  process.exit(2);
}

console.log(`[gh-cron] start ${job} GITHUB_ACTIONS=${process.env.GITHUB_ACTIONS || "0"}`);
const started = Date.now();
try {
  const result = await runners[job]();
  console.log(JSON.stringify({ job, ms: Date.now() - started, result }, null, 2));
  if (result?.ok === false) process.exit(1);
  // No per-job cache bust: each bust invalidates every ISR page built from the
  // tagged data. The workflow's bump-cache job busts once per scrape batch.
} catch (err) {
  console.error(`[gh-cron] ${job} failed:`, err);
  process.exit(1);
}
