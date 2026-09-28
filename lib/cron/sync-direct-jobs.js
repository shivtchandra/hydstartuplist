import { getAdminDb } from "../firebaseAdmin.js";
import { DIRECT_FEEDS, directFeedDocId, fetchDirectFeed } from "../direct-feeds.js";

async function syncFeed(db, feed) {
  const { jobs: fresh, hits } = await fetchDirectFeed(feed);
  // Keep the previous snapshot rather than wiping the feed on an empty/failed run.
  if (!fresh.length) throw new Error("no jobs returned");

  const docRef = db.collection("job_board").doc(directFeedDocId(feed));
  const prevSnap = await docRef.get().catch(() => null);
  const prevById = new Map((prevSnap?.exists ? prevSnap.data()?.jobs || [] : []).map((j) => [j.id, j]));
  // These APIs list every open role, so the fresh result is the full set; only carry firstSeenAt over.
  const jobs = fresh.map((j) => ({ ...j, firstSeenAt: prevById.get(j.id)?.firstSeenAt || j.firstSeenAt }));

  await docRef.set({ jobs, fetchedAt: new Date().toISOString(), count: jobs.length, hits });
  return { total: jobs.length, hits };
}

export async function runSyncDirectJobs() {
  const started = Date.now();
  const db = await getAdminDb();
  if (!db) {
    return { ok: false, error: "Database unavailable", status: 503 };
  }

  const settled = await Promise.allSettled(DIRECT_FEEDS.map((feed) => syncFeed(db, feed)));
  const feeds = {};
  settled.forEach((r, i) => {
    const { id } = DIRECT_FEEDS[i];
    if (r.status === "fulfilled") feeds[id] = { ok: true, ...r.value };
    else {
      console.error(`sync-direct-jobs ${id} failed:`, r.reason);
      feeds[id] = { ok: false, error: String(r.reason?.message || r.reason) };
    }
  });

  const anyOk = Object.values(feeds).some((f) => f.ok);
  // No tag bust here; the workflow busts once per scrape batch (see adzuna-jobs route).
  return { ok: anyOk, status: anyOk ? 200 : 502, feeds, ms: Date.now() - started };
}
