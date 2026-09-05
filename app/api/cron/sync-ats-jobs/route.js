import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { loadActiveAtsBoards } from "../../../../lib/ats/boards.js";
import { fetchBoardJobs, toPublicJob } from "../../../../lib/ats/index.js";
import { notifyJobUrls } from "../../../../lib/google-indexing.js";
import { jobUrlId } from "../../../../lib/jobs-seo.js";
import { getSiteUrl } from "../../../../lib/site-url.js";
import { reconcileBoard } from "../../../../lib/job-lifecycle.js";
import { acquireBoard } from "../../../../lib/board-store.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 10;
const TIME_BUDGET_MS = 48_000;

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
                if (j.description) role.description = j.description;
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

  // Firestore docs max out at 1MB — trim descriptions if the payload is fat
  const MAX_DOC = 900_000;
  let payloadJobs = jobs;
  let jsonSize = Buffer.byteLength(JSON.stringify({ jobs: payloadJobs, fetchedAt }), "utf8");
  if (jsonSize > MAX_DOC) {
    payloadJobs = jobs.map((j) => {
      if (!j.description || j.description.length <= 2000) return j;
      return { ...j, description: j.description.slice(0, 2000) };
    });
    jsonSize = Buffer.byteLength(JSON.stringify({ jobs: payloadJobs, fetchedAt }), "utf8");
  }
  if (jsonSize > MAX_DOC) {
    payloadJobs = payloadJobs.map(({ description, ...rest }) => ({
      ...rest,
      description: description ? description.slice(0, 800) : null,
    }));
  }

  await db.runTransaction(async tx => {
    const lock = (await tx.get(lease.ref)).data();
    if (lock?.leaseToken !== lease.token || lock.leaseUntil < Date.now()) throw new Error("Stale sync rejected");
    tx.set(db.collection("job_board").doc("ats_latest"), {
    jobs: payloadJobs,
    lifecycleVersion: 1,
    fetchedAt,
    boardCount: allBoards.length,
    jobCount: payloadJobs.length,
    lastBatchSize: batch.length,
    });
    tx.set(lease.ref, { leaseUntil: 0, lastSuccessAt: Date.now() }, { merge: true });
  });

  const prevIds = new Set(prevJobs.map((j) => String(j.id)));
  const nextIds = new Set(jobs.filter(j => j.status !== "closed").map((j) => String(j.id)));
  const site = getSiteUrl();
  const updated = [...nextIds]
    .filter((id) => !prevIds.has(id))
    .map((id) => `${site}/jobs/${jobUrlId(id)}`);
  const deleted = [...prevIds]
    .filter((id) => !nextIds.has(id))
    .map((id) => `${site}/jobs/${jobUrlId(id)}`);
  const indexing = await notifyJobUrls({ updated, deleted });

  const firstUnattempted = attempted.findIndex((v) => !v);
  const advanced = firstUnattempted === -1 ? batch.length : firstUnattempted;
  const nextOffset = (start + advanced) % Math.max(allBoards.length, 1);
  await cursorRef.set({ offset: nextOffset, lastRunAt: fetchedAt });

  return NextResponse.json({
    success: true,
    boardsTotal: allBoards.length,
    boardsAttempted: attempted.filter(Boolean).length,
    hydJobsWritten: newJobs.length,
    feedSize: jobs.length,
    withDescription: jobs.filter((j) => j.description).length,
    offset: start,
    nextOffset,
    indexing,
    sample: boardResults.slice(0, 15),
    timestamp: fetchedAt,
  });
}
