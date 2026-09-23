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
const WEBSITE = "https://www.punarvienergies.com/careers/";
const LOCATION = "Vijayawada, Andhra Pradesh";

const roles = [
  { slug: "bdm", title: "Business Development Manager", url: `${WEBSITE}?role=bdm` },
  { slug: "bde", title: "Business Development Executive", url: `${WEBSITE}?role=bde` },
];

const newJobs = roles.map(({ slug, title, url }) => ({
  id: `priority-${ENTRY_ID}-${slug}`,
  title,
  company: COMPANY,
  location: LOCATION,
  url,
  postedAt: today,
  sourcePostedAt: today,
  firstSeenAt: now,
  lastCheckedAt: now,
  lastSeenAt: now,
  fetchedAt: now,
  description: "Qualification: Graduation | Experience: 3–5 Years | Preferred Industry: Solar / Renewable Energy. Contact: hr@punarvienergies.com | +91 7997033799",
  salary: null,
  source: "careers",
  startupId: null,
  employerType: "startup",
  website: WEBSITE,
  employerId: ENTRY_ID,
  status: "active",
  missingScans: 0,
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
