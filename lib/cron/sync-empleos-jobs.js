import { getAdminDb } from "../firebaseAdmin.js";
import { fetchEmpleosHyderabadJobs } from "../empleos.js";
import { revalidateTag } from "next/cache";

export async function runSyncEmpleosJobs() {
  const started = Date.now();
  const db = await getAdminDb();
  if (!db) {
    return { ok: false, error: "Database unavailable", status: 503 };
  }

  const { jobs, companies } = await fetchEmpleosHyderabadJobs();
  if (!jobs.length) {
    return { ok: false, error: "No jobs retrieved from in.empleos.io", status: 502 };
  }

  const now = new Date().toISOString();
  const docRef = db.collection("job_board").doc("empleos_latest");

  // Load existing doc to retain older active listings
  const prevSnap = await docRef.get().catch(() => null);
  const prevJobs = prevSnap?.exists ? prevSnap.data()?.jobs || [] : [];
  const byId = new Map();

  // Keep previous jobs up to 14 days old
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const j of prevJobs) {
    const t = new Date(j.sourcePostedAt || j.postedAt || j.fetchedAt || 0).getTime();
    if (t >= cutoff) {
      byId.set(j.id, j);
    }
  }

  // Upsert new scraped jobs
  for (const j of jobs) {
    byId.set(j.id, j);
  }

  const finalJobs = [...byId.values()].sort((a, b) => {
    const ta = new Date(a.sourcePostedAt || a.postedAt || 0).getTime();
    const tb = new Date(b.sourcePostedAt || b.postedAt || 0).getTime();
    return tb - ta;
  });

  await docRef.set({
    jobs: finalJobs,
    fetchedAt: now,
    count: finalJobs.length,
    newThisRun: jobs.length,
    discoveredCompanies: companies,
  });

  try {
    revalidateTag("public-jobs");
  } catch {}

  return {
    ok: true,
    total: finalJobs.length,
    scraped: jobs.length,
    companies: companies.length,
    discoveredCompanies: companies,
    ms: Date.now() - started,
  };
}
