import { getAdminDb } from "../firebaseAdmin.js";
import { fetchHealthcareJobs } from "../healthcare.js";
import { softRevalidateTag } from "./soft-revalidate.js";

export async function runSyncHealthcareJobs() {
  const started = Date.now();
  const db = await getAdminDb();
  if (!db) {
    return { ok: false, error: "Database unavailable", status: 503 };
  }

  const { jobs, companies, sources } = await fetchHealthcareJobs();
  if (!jobs.length) {
    return { ok: false, error: "No healthcare jobs retrieved", status: 502 };
  }

  const now = new Date().toISOString();
  const docRef = db.collection("job_board").doc("healthcare_latest");

  // Load existing doc to retain older active listings within 14 days
  const prevSnap = await docRef.get().catch(() => null);
  const prevJobs = prevSnap?.exists ? prevSnap.data()?.jobs || [] : [];
  const byId = new Map();

  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const j of prevJobs) {
    const t = new Date(j.sourcePostedAt || j.postedAt || j.firstSeenAt || 0).getTime();
    if (t >= cutoff) {
      byId.set(j.id, j);
    }
  }

  // Upsert new scraped jobs
  for (const j of jobs) {
    const prev = byId.get(j.id);
    byId.set(j.id, {
      ...j,
      firstSeenAt: prev?.firstSeenAt || j.firstSeenAt || now,
      lastCheckedAt: now,
    });
  }

  const finalJobs = [...byId.values()].sort((a, b) => {
    const ta = new Date(a.sourcePostedAt || a.postedAt || a.firstSeenAt || 0).getTime();
    const tb = new Date(b.sourcePostedAt || b.postedAt || b.firstSeenAt || 0).getTime();
    return tb - ta;
  });

  await docRef.set({
    jobs: finalJobs,
    fetchedAt: now,
    count: finalJobs.length,
    newThisRun: jobs.length,
    discoveredCompanies: companies,
    sources,
  });

  await softRevalidateTag("public-jobs");

  return {
    ok: true,
    total: finalJobs.length,
    scraped: jobs.length,
    companies: companies.length,
    sources,
    ms: Date.now() - started,
  };
}
