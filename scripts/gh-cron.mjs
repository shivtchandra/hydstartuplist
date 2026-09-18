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
import { bumpVercelCache } from "../lib/cron/soft-revalidate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

// Prefer SITE_URL for getSiteUrl() consumers
if (!process.env.NEXT_PUBLIC_SITE_URL && process.env.SITE_URL) {
  process.env.NEXT_PUBLIC_SITE_URL = process.env.SITE_URL;
}

const job = process.argv[2];
if (!job) {
  console.error("Usage: node scripts/gh-cron.mjs <sync-ats-jobs|check-hiring|sync-priority-careers|rebuild-overlay>");
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
  if (job !== "rebuild-overlay") {
    const bump = await bumpVercelCache();
    console.log("[gh-cron] bump-cache", bump);
  }
} catch (err) {
  console.error(`[gh-cron] ${job} failed:`, err);
  process.exit(1);
}
