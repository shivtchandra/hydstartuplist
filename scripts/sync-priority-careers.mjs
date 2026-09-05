#!/usr/bin/env node
// Local one-off: POST/GET the deployed cron, or dry-run scrapes without Firestore.
//   DRY=1 node scripts/sync-priority-careers.mjs
//   SITE_URL=... CRON_SECRET=... node scripts/sync-priority-careers.mjs
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { loadPriorityCareers, scrapePriorityEmployer } from "../lib/priority-careers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
const secret = process.env.CRON_SECRET;

if (process.env.DRY === "1" || !site || !secret) {
  const entries = loadPriorityCareers();
  console.log(`Dry-run scrape for ${entries.length} priority employers…`);
  for (const entry of entries) {
    const hiring = await scrapePriorityEmployer(entry);
    console.log(
      hiring?.roles?.length
        ? `✓ ${entry.name}: ${hiring.roles.length} roles via ${hiring.source}`
        : `· ${entry.name}: no roles`
    );
  }
  if (!site || !secret) console.log("\n(Set SITE_URL + CRON_SECRET to hit the live cron instead of dry-run.)");
  process.exit(0);
}

const res = await fetch(`${site.replace(/\/$/, "")}/api/cron/sync-priority-careers`, {
  headers: { Authorization: `Bearer ${secret}` },
});
const text = await res.text();
console.log(res.status, text);
