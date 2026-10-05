import { getAdminDb } from "../firebaseAdmin.js";
import { loadActiveAtsBoards } from "../ats/boards.js";
import { fetchBoardJobs, toPublicJob } from "../ats/index.js";
import { notifyJobUrls } from "../google-indexing.js";
import { jobUrlId } from "../jobs-seo.js";
import { getSiteUrl } from "../site-url.js";
import { reconcileBoard } from "../job-lifecycle.js";
import { acquireBoard } from "../board-store.js";
import { refreshDynamicOverlayRollup } from "../store-core.js";
import { softRevalidateTag, cronTimeBudgetMs, cronConcurrency } from "./soft-revalidate.js";
import { getAtsFeedSnapshot, splitIntoShards, atsShardDocId, MAX_SHARDS } from "../ats/feed-store.js";
import { inferExperienceLevel } from "../job-facets.js";

export async function runSyncAtsJobs({ limit = 0, offset = 0, searchParams = null } = {}) {
  const TIME_BUDGET_MS = cronTimeBudgetMs(22_000);
  const CONCURRENCY = cronConcurrency(3);
  // DRY_RUN=1: scan every board and report sizes/counts, but write nothing.
  const dryRun = process.env.DRY_RUN === "1";

  const db = await getAdminDb();
  if (!db) return { ok: false, error: "Firebase not configured" };

  // Lease must outlive the whole scan, or the final write is rejected as stale.
  const lease = dryRun ? null : await acquireBoard(db, "legacy-sync", Date.now(), { leaseMs: TIME_BUDGET_MS + 120_000 });
  if (!dryRun && !lease) return { ok: false, error: "Sync already running", status: 409 };

  if (searchParams) {
    limit = parseInt(searchParams.get("limit") || String(limit), 10) || 0;
    if (searchParams.has("offset")) offset = parseInt(searchParams.get("offset") || "0", 10) || 0;
  }

  // Rotating cursor across all boards so every board syncs daily even under 60s cap
  const cursorRef = db.collection("cron_state").doc("sync_ats_jobs");
  let start = offset;
  if (!(searchParams && searchParams.has("offset"))) {
    const cursorSnap = await cursorRef.get();
    start = cursorSnap.exists ? cursorSnap.data().offset || 0 : 0;
  }

  const allBoards = await loadActiveAtsBoards();
  if (!allBoards.length) {
    return {
      ok: true,
      success: true,
      message: "No classified ATS boards yet — run scripts/classify-ats.mjs",
      boards: 0,
      jobs: 0,
    };
  }

  const ordered = [...allBoards.slice(start), ...allBoards.slice(0, start)];
  const batch = limit > 0 ? ordered.slice(0, limit) : ordered;

  const fetchedAt = new Date().toISOString();
  const prevSnap = await getAtsFeedSnapshot(db);
  const prevDoc = prevSnap.exists ? prevSnap.data() : { jobs: [] };
  const prevJobs = prevDoc.jobs || [];
  // Keep jobs from boards not in this batch so partial runs don't wipe the feed
  const successfulBoards = new Set();

  const startedAt = Date.now();
  let nextIdx = 0;
  const attempted = new Array(batch.length).fill(false);
  const boardResults = [];
  const newJobs = [];

  async function worker() {
    while (true) {
      const idx = nextIdx++;
      if (idx >= batch.length) return;
      if (Date.now() - startedAt > TIME_BUDGET_MS) return;
      const board = batch[idx];
      attempted[idx] = true;
      try {
        const result = await fetchBoardJobs(board.atsProvider, board.atsSlug, {
          companyName: board.name,
          geoFilter: true,
          allowRemote: board.allowRemote === true,
        });
        if (!result.ok || !result.complete) throw new Error("Incomplete board scan; retaining previous jobs");
        const publicJobs = result.jobs.map((n) =>
          toPublicJob(n, {
            startupId: board.startupId || null,
            company: board.name,
            fetchedAt,
            employerType: board.employerType || (board.startupId ? "startup" : "other"),
            website: board.website || null,
            boardUrl: board.boardUrl || null,
          })
        );
        const key = `${board.atsProvider}:${board.atsSlug}`;
        const reconciled = reconcileBoard(prevJobs.filter(j => `${j.atsProvider}:${j.atsSlug}` === key), publicJobs, { complete: true, checkedAt: fetchedAt, baseline: !prevDoc.lifecycleVersion });
        newJobs.push(...reconciled.jobs);
        successfulBoards.add(key);
        boardResults.push({
          id: board.id,
          name: board.name,
          provider: board.atsProvider,
          slug: board.atsSlug,
          hydJobs: publicJobs.length,
          raw: result.totalRaw,
        });

        if (board.startupId && !dryRun) {
          if (publicJobs.length > 0) {
            const hiring = {
              active: true,
              count: publicJobs.length,
              source: board.atsProvider,
              slug: board.atsSlug,
              url: board.boardUrl || result.boardUrl,
              roles: publicJobs.slice(0, 20).map((j) => {
                const role = { title: j.title, url: j.url };
                if (j.salary) role.salary = j.salary;
                return role;
              }),
              checkedAt: fetchedAt,
            };
            await db
              .collection("startups_dynamic")
              .doc(board.startupId)
              .set({ hiring, updatedAt: fetchedAt, atsProvider: board.atsProvider, atsSlug: board.atsSlug, atsBoardUrl: board.boardUrl || result.boardUrl }, { merge: true });
          } else {
            await db
              .collection("startups_dynamic")
              .doc(board.startupId)
              .set({ hiring: null, updatedAt: fetchedAt }, { merge: true });
          }
        }
      } catch (err) {
        console.error(`sync-ats ${board.id}:`, err);
        boardResults.push({ id: board.id, error: String(err.message || err) });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, batch.length || 1) }, () => worker())
  );

  const retained = prevJobs.filter(j => !successfulBoards.has(`${j.atsProvider}:${j.atsSlug}`));
  const mergedJobs = [...retained, ...newJobs];
  // Dedupe by id
  const seen = new Set();
  const jobs = [];
  for (const j of mergedJobs) {
    if (seen.has(j.id)) continue;
    seen.add(j.id);
    jobs.push(j);
  }

  // Firestore hard-caps docs at 1,048,576 bytes (we hit 1,233,706 byte writes
  // once), so the feed is split across shard docs — see lib/ats/feed-store.js.
  // Live roles go first, newest-first, then closed ones (lifecycle history);
  // anything past MAX_SHARDS is dropped, closed roles before live ones.
  const DESC_MAX = 400;

  function leanJob(j, descMax) {
    const out = {
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location || null,
      url: j.url,
      postedAt: j.postedAt || j.sourcePostedAt || null,
      status: j.status || "active",
      source: j.source || "ats",
      atsProvider: j.atsProvider || null,
      atsSlug: j.atsSlug || null,
      startupId: j.startupId || null,
      salary: j.salary || null,
      fetchedAt: j.fetchedAt || fetchedAt,
      lastSeenAt: j.lastSeenAt || j.fetchedAt || fetchedAt,
    };
    if (descMax > 0 && j.description) {
      const d = String(j.description);
      out.description = d.length > descMax ? d.slice(0, descMax) : d;
    }
    return out;
  }

  const byRecent = (key) => (a, b) => String(key(b) || "").localeCompare(String(key(a) || ""));
  const live = jobs.filter((j) => j.status !== "closed").sort(byRecent((j) => j.postedAt || j.fetchedAt));
  const closed = jobs.filter((j) => j.status === "closed").sort(byRecent((j) => j.closedAt || j.lastSeenAt));
  const shards = splitIntoShards([...live, ...closed].map((j) => leanJob(j, DESC_MAX)));
  const payloadJobs = shards.flat();
  const shardBytes = shards.map((s) => Buffer.byteLength(JSON.stringify({ jobs: s }), "utf8"));
  const jsonSize = shardBytes.reduce((a, b) => a + b, 0);
  const prevShardCount = Math.min(Math.max(1, prevDoc.shardCount || 1), MAX_SHARDS);
  const liveWritten = payloadJobs.filter((j) => j.status !== "closed");
  const earlyCareer = liveWritten.filter((j) => ["intern", "junior"].includes(inferExperienceLevel(j.title, j.description, j))).length;

  if (!dryRun) try {
    await db.runTransaction(async (tx) => {
      const lock = (await tx.get(lease.ref)).data();
      if (lock?.leaseToken !== lease.token || lock.leaseUntil < Date.now()) {
        throw new Error("Stale sync rejected");
      }
      const col = db.collection("job_board");
      shards.forEach((shardJobs, i) => {
        const doc = { jobs: shardJobs, shardIndex: i };
        if (i === 0) {
          Object.assign(doc, {
            lifecycleVersion: 1,
            fetchedAt,
            boardCount: allBoards.length,
            jobCount: payloadJobs.length,
            lastBatchSize: batch.length,
            payloadBytes: jsonSize,
            shardCount: shards.length,
          });
        }
        tx.set(col.doc(atsShardDocId(i)), doc);
      });
      for (let i = shards.length; i < prevShardCount; i++) tx.delete(col.doc(atsShardDocId(i)));
      tx.set(lease.ref, { leaseUntil: 0, lastSuccessAt: Date.now(), failures: 0, error: null }, { merge: true });
    });
  } catch (err) {
    try {
      await lease.ref.set({ leaseUntil: 0, error: String(err.message || err) }, { merge: true });
    } catch {}
    return {
      ok: false,
      error: String(err.message || err),
      payloadBytes: jsonSize,
      feedSize: jobs.length,
      status: 500,
    };
  }

  const boardsFailed = boardResults.filter((r) => r.error).length;
  const stats = {
    boardsTotal: allBoards.length,
    boardsAttempted: attempted.filter(Boolean).length,
    boardsFailed,
    hydJobsWritten: newJobs.length,
    feedSize: jobs.length,
    liveRoles: liveWritten.length,
    earlyCareer,
    payloadBytes: jsonSize,
    shardCount: shards.length,
    shardBytes,
    withDescription: payloadJobs.filter((j) => j.description).length,
    truncated: payloadJobs.length < jobs.length,
    descMax: DESC_MAX,
  };
  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      ...stats,
      failed: boardResults.filter((r) => r.error),
      boards: boardResults.filter((r) => !r.error).sort((a, b) => b.hydJobs - a.hydJobs),
      timeBudgetMs: TIME_BUDGET_MS,
    };
  }

  await softRevalidateTag("public-jobs");

  let indexing = null;
  try {
    const prevIds = new Set(prevJobs.map((j) => String(j.id)));
    const nextIds = new Set(jobs.filter((j) => j.status !== "closed").map((j) => String(j.id)));
    const site = getSiteUrl();
    const updated = [...nextIds]
      .filter((id) => !prevIds.has(id))
      .slice(0, 200)
      .map((id) => `${site}/jobs/${jobUrlId(id)}`);
    const deleted = [...prevIds]
      .filter((id) => !nextIds.has(id))
      .slice(0, 200)
      .map((id) => `${site}/jobs/${jobUrlId(id)}`);
    indexing = await notifyJobUrls({ updated, deleted });
  } catch (err) {
    indexing = { error: String(err.message || err) };
  }

  const firstUnattempted = attempted.findIndex((v) => !v);
  const advanced = firstUnattempted === -1 ? batch.length : firstUnattempted;
  const nextOffset = (start + advanced) % Math.max(allBoards.length, 1);
  await cursorRef.set({ offset: nextOffset, lastRunAt: fetchedAt });

  
  await refreshDynamicOverlayRollup(db);

  return {
    ok: true,
    success: true,
    ...stats,
    offset: start,
    nextOffset,
    indexing,
    sample: boardResults.slice(0, 15),
    timestamp: fetchedAt,
    timeBudgetMs: TIME_BUDGET_MS,
  };
}
