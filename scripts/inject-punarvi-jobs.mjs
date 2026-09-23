#!/usr/bin/env node
// One-off: inject Punarvi Energies jobs into priority_careers_latest.
// Run: node scripts/inject-punarvi-jobs.mjs
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const { getAdminDb } = await import("../lib/firebaseAdmin.js");

const db = await getAdminDb();
if (!db) { console.error("Firebase not configured"); process.exit(1); }

const now = new Date().toISOString();
const today = now.slice(0, 10);

const ENTRY_ID = "punarvi-energies";
const COMPANY = "Punarvi Energies Ltd.";
const WEBSITE = "https://www.punarvienergies.com/";
const CAREERS = "https://www.punarvienergies.com/careers/";
const LOCATION = "Vijayawada / Amaravathi, Andhra Pradesh";
const APPLY_EMAIL = "hr@punarvienergies.com";
const APPLY_PHONES = ["+91 79970 33799", "+91 72878 72877"];
const BLURB =
  "Solar / renewables BD roles — direct apply only (careers page has no listings). Graduation · 3–5 years · preferred solar/renewables.";

const roles = [
  { slug: "bdm", title: "Business Development Manager", url: `${CAREERS}?role=bdm` },
  { slug: "bde", title: "Business Development Executive", url: `${CAREERS}?role=bde` },
];

const newJobs = roles.map(({ slug, title, url }) => ({
  id: `priority-${ENTRY_ID}-${slug}`,
  title,
  company: COMPANY,
  location: LOCATION,
  url,
  postedAt: now,
  sourcePostedAt: now,
  firstSeenAt: now,
  lastCheckedAt: now,
  lastSeenAt: now,
  fetchedAt: now,
  description: BLURB,
  salary: null,
  source: "careers",
  startupId: null,
  employerType: "startup",
  website: WEBSITE,
  employerId: ENTRY_ID,
  status: "active",
  missingScans: 0,
  exclusive: true,
  applyEmail: APPLY_EMAIL,
  applyPhones: APPLY_PHONES,
  qualification: "Graduation (any degree)",
  experience: "3–5 years",
  industry: "Solar / Renewables",
  exclusiveNote: "No portal listing — email or call HR to apply.",
}));

const snap = await db.collection("job_board").doc("priority_careers_latest").get();
const prev = snap.exists ? snap.data()?.jobs || [] : [];

// Remove any old Punarvi entries then prepend fresh ones
const filtered = prev.filter(j => j.employerId !== ENTRY_ID);
const merged = [...newJobs, ...filtered];

await db.collection("job_board").doc("priority_careers_latest").set({
  ...( snap.exists ? snap.data() : {} ),
  jobs: merged,
  fetchedAt: now,
});

console.log(`Injected ${newJobs.length} Punarvi Energies jobs. Total priority jobs: ${merged.length}`);
process.exit(0);
