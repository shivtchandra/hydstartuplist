import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { loadActiveAtsBoards } from "../../../../lib/ats/boards.js";
import { fetchBoardJobs, toPublicJob } from "../../../../lib/ats/index.js";
import { notifyJobUrls } from "../../../../lib/google-indexing.js";
import { jobUrlId } from "../../../../lib/jobs-seo.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import { reconcileBoard } from "../../../../lib/job-lifecycle.js";
import { acquireBoard } from "../../../../lib/board-store.js";
import { refreshDynamicOverlayRollup } from "../../../../lib/store.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CONCURRENCY = 3;
const TIME_BUDGET_MS = 22_000;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = await getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
  }

  const lease = await acquireBoard(db, "legacy-sync");
  if (!lease) return NextResponse.json({ error: "Sync already running" }, { status: 409 });
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "0", 10) || 0;
  const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

  // Rotating cursor across all boards so every board syncs daily even under 60s cap
  const cursorRef = db.collection("cron_state").doc("sync_ats_jobs");
  let start = offset;
  if (!searchParams.has("offset")) {
    const cursorSnap = await cursorRef.get();
    start = cursorSnap.exists ? cursorSnap.data().offset || 0 : 0;
  }

  const allBoards = await loadActiveAtsBoards();
  if (!allBoards.length) {
    return NextResponse.json({
      success: true,
      message: "No classified ATS boards yet — run scripts/classify-ats.mjs",
      boards: 0,
      jobs: 0,
    });
  }

  const ordered = [...allBoards.slice(start), ...allBoards.slice(0, start)];
  const batch = limit > 0 ? ordered.slice(0, limit) : ordered;

  const fetchedAt = new Date().toISOString();
  const prevSnap = await db.collection("job_board").doc("ats_latest").get();
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

        if (board.startupId) {
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

  // Firestore hard-caps docs at 1,048,576 bytes. JSON UTF-8 understates that
  // (field names, nulls, wire encoding), so pack lean and keep a fat margin.
  // Symptom we hit: 1,233,706 byte writes failing legacy-sync.
  const MAX_JSON = 720_000;
  const docBytes = (list) =>
    Buffer.byteLength(
      JSON.stringify({
        jobs: list,
        lifecycleVersion: 1,
        fetchedAt,
        boardCount: allBoards.length,
        jobCount: list.length,
        lastBatchSize: batch.length,
      }),
      "utf8"
    );

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

  function pack(list, descMax) {
    // Prefer live roles; closed ones are lifecycle noise in the mega-doc.
    const live = list.filter((j) => j.status !== "closed");
    const closed = list.filter((j) => j.status === "closed");
    const ordered = [...live, ...closed];
    let packed = ordered.map((j) => leanJob(j, descMax));
    let size = docBytes(packed);
    if (size <= MAX_JSON) return { jobs: packed, bytes: size, descMax, truncated: false };

    // Drop closed entirely, then newest-first until under budget.
    packed = live
      .slice()
      .sort((a, b) => String(b.postedAt || b.fetchedAt || "").localeCompare(String(a.postedAt || a.fetchedAt || "")))
      .map((j) => leanJob(j, descMax));
    size = docBytes(packed);
    while (packed.length > 200 && size > MAX_JSON) {
      packed = packed.slice(0, Math.max(200, Math.floor(packed.length * 0.85)));
      size = docBytes(packed);
    }
    // Binary trim if still fat (very large boards).
    if (size > MAX_JSON) {
      let lo = 50;
      let hi = packed.length;
      let best = packed.slice(0, 50);
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const trial = packed.slice(0, mid);
        const trialSize = docBytes(trial);
        if (trialSize <= MAX_JSON) {
          best = trial;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      packed = best;
      size = docBytes(packed);
    }
    return { jobs: packed, bytes: size, descMax, truncated: packed.length < list.length };
  }

  let packed = pack(jobs, 400);
  if (packed.bytes > MAX_JSON) packed = pack(jobs, 160);
  if (packed.bytes > MAX_JSON) packed = pack(jobs, 0);
  const payloadJobs = packed.jobs;
  const jsonSize = packed.bytes;

  try {
    await db.runTransaction(async (tx) => {
      const lock = (await tx.get(lease.ref)).data();
      if (lock?.leaseToken !== lease.token || lock.leaseUntil < Date.now()) {
        throw new Error("Stale sync rejected");
      }
      tx.set(db.collection("job_board").doc("ats_latest"), {
        jobs: payloadJobs,
        lifecycleVersion: 1,
        fetchedAt,
        boardCount: allBoards.length,
        jobCount: payloadJobs.length,
        lastBatchSize: batch.length,
        payloadBytes: jsonSize,
      });
      tx.set(lease.ref, { leaseUntil: 0, lastSuccessAt: Date.now(), failures: 0, error: null }, { merge: true });
    });
  } catch (err) {
    try {
      await lease.ref.set({ leaseUntil: 0, error: String(err.message || err) }, { merge: true });
    } catch {}
    return NextResponse.json(
      { error: String(err.message || err), payloadBytes: jsonSize, feedSize: jobs.length },
      { status: 500 }
    );
  }

  revalidateTag("public-jobs");

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

  
  if (db) {
    void refreshDynamicOverlayRollup(db);
  }

return NextResponse.json({
    success: true,
    boardsTotal: allBoards.length,
    boardsAttempted: attempted.filter(Boolean).length,
    hydJobsWritten: newJobs.length,
    feedSize: jobs.length,
    payloadBytes: jsonSize,
    withDescription: payloadJobs.filter((j) => j.description).length,
    truncated: packed.truncated,
    descMax: packed.descMax,
    offset: start,
    nextOffset,
    indexing,
    sample: boardResults.slice(0, 15),
    timestamp: fetchedAt,
  });
}
