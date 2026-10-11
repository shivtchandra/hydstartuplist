import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import {
  normalizeSalary,
  stripHtml,
  ADZUNA_FRESH_DAYS,
  isSpamOrConsultancyJob,
} from "../../../../lib/job-content.js";
import { notifyJobUrls } from "../../../../lib/google-indexing.js";
import { jobUrlId } from "../../../../lib/jobs-seo.js";
import { getSiteUrl } from "../../../../lib/site-url.js";

import { inferExperienceLevel } from "../../../../lib/job-facets.js";

// Adzuna has no webhooks — we poll their search API on a short cadence and
// upsert only new/changed listings into job_board/adzuna_latest.
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const PAGES = 4;
const DESC_MAX = 4000;
const ADZUNA_FRESHER_DAYS = 7;

function isStillFresh(job, nowMs) {
  const raw = job?.postedAt || job?.fetchedAt;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return false;
  const level = inferExperienceLevel(job.title, job.description, job);
  const allowedDays = level === "intern" || level === "junior" ? ADZUNA_FRESHER_DAYS : ADZUNA_FRESH_DAYS;
  return nowMs - t <= allowedDays * 24 * 60 * 60 * 1000;
}

function normalizeAdzunaResult(r, fetchedAt) {
  const description = r.description ? stripHtml(String(r.description)) : null;
  const job = {
    id: String(r.id),
    title: r.title?.replace(/<[^>]+>/g, "").trim(),
    company: r.company?.display_name || "Unknown",
    location: r.location?.display_name || "Hyderabad",
    url: r.redirect_url,
    postedAt: r.created,
    sourcePostedAt: r.created,
    firstSeenAt: r.created,
    fetchedAt,
    description: description
      ? description.length > DESC_MAX
        ? description.slice(0, DESC_MAX)
        : description
      : null,
    salary: normalizeSalary(r.salary_min, r.salary_max),
    source: "adzuna",
  };
  if (isSpamOrConsultancyJob(job)) return null;
  return job;
}

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return Response.json(
      { error: "ADZUNA_APP_ID/ADZUNA_APP_KEY not configured" },
      { status: 500 }
    );
  }

  // Pull newest IT jobs in Hyderabad. max_days_old stays tight so each poll
  // is mostly "what changed"; we retain older-but-still-fresh rows from Firestore.
  const basePage = (page) => {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      where: "Hyderabad",
      category: "it-jobs",
      max_days_old: "3",
      results_per_page: "50",
      sort_by: "date",
      "content-type": "application/json",
    });
    return fetch(`https://api.adzuna.com/v1/api/jobs/in/search/${page}?${params}`, {
      signal: AbortSignal.timeout(15000),
    }).then((r) => (r.ok ? r.json() : null));
  };

  const fresherPage = (what, page = 1) => {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: what,
      where: "Hyderabad",
      category: "it-jobs",
      max_days_old: "7",
      results_per_page: "50",
      sort_by: "date",
      "content-type": "application/json",
    });
    return fetch(`https://api.adzuna.com/v1/api/jobs/in/search/${page}?${params}`, {
      signal: AbortSignal.timeout(15000),
    }).then((r) => (r.ok ? r.json() : null));
  };

  // Any category — healthcare, operations and non-tech entry roles live outside it-jobs.
  const keywordPage = (what, page = 1) => {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: what,
      where: "Hyderabad",
      max_days_old: "7",
      results_per_page: "50",
      sort_by: "date",
      "content-type": "application/json",
    });
    return fetch(`https://api.adzuna.com/v1/api/jobs/in/search/${page}?${params}`, {
      signal: AbortSignal.timeout(15000),
    }).then((r) => (r.ok ? r.json() : null));
  };

  // Targeted pack for below 1-year / fresher openings in Hyderabad:
  // - Top tech fresher queries with 2 pages each (up to 100 results per term)
  // - Specific 0-1y phrasing commonly used by Indian tech recruiters
  const FRESHER_IT_QUERIES = [
    { what: "fresher", pages: [1, 2] },
    { what: "0-1 years", pages: [1, 2] },
    { what: "0-1 year", pages: [1] },
    { what: "internship", pages: [1, 2] },
    { what: "trainee", pages: [1, 2] },
    { what: "entry level", pages: [1] },
    { what: "junior developer", pages: [1] },
    { what: "graduate trainee", pages: [1] },
    { what: "associate engineer", pages: [1] },
  ];

  // Broad entry roles outside it-jobs (operations, support, sales, general freshers).
  const BROAD_ENTRY_QUERIES = [
    { what: "fresher", pages: [1, 2] },
    { what: "0-1 years", pages: [1] },
    { what: "intern", pages: [1] },
    { what: "associate", pages: [1] },
    { what: "sales executive", pages: [1] },
  ];

  const HEALTHCARE_QUERIES = ["dietitian", "nutritionist", "health coach"];

  const pages = await Promise.all([
    ...Array.from({ length: PAGES }, (_, i) => basePage(i + 1).catch(() => null)),
    ...FRESHER_IT_QUERIES.flatMap((q) => q.pages.map((p) => fresherPage(q.what, p).catch(() => null))),
    ...BROAD_ENTRY_QUERIES.flatMap((q) => q.pages.map((p) => keywordPage(q.what, p).catch(() => null))),
    ...HEALTHCARE_QUERIES.map((q) => keywordPage(q, 1).catch(() => null)),
  ]);
  const firstOk = pages.find(Boolean);
  if (!firstOk) {
    return Response.json({ error: "Adzuna request failed" }, { status: 502 });
  }

  const fetchedAt = new Date().toISOString();
  const nowMs = Date.now();
  const incoming = new Map();
  for (const data of pages) {
    for (const r of data?.results || []) {
      const job = normalizeAdzunaResult(r, fetchedAt);
      if (!job?.id || !job?.title) continue;
      incoming.set(job.id, job);
    }
  }

  const db = await getAdminDb();
  let indexing = null;
  let prevJobs = [];
  let newCount = 0;
  let retainedCount = 0;
  let droppedStale = 0;
  let feedSize = incoming.size;

  if (db) {
    try {
      const prevSnap = await db.collection("job_board").doc("adzuna_latest").get();
      prevJobs = prevSnap.exists ? prevSnap.data().jobs || [] : [];
      const prevIds = new Set(prevJobs.map((j) => String(j.id)));

      // Start from still-fresh previous jobs, then overlay/add API hits
      const merged = new Map();
      for (const j of prevJobs) {
        if (!isStillFresh(j, nowMs) || isSpamOrConsultancyJob(j)) {
          droppedStale++;
          continue;
        }
        merged.set(String(j.id), j);
        retainedCount++;
      }
      for (const [id, job] of incoming) {
        if (!merged.has(id)) newCount++;
        merged.set(id, job);
      }

      const jobs = [...merged.values()].sort((a, b) => {
        const ta = new Date(a.postedAt || a.fetchedAt || 0).getTime();
        const tb = new Date(b.postedAt || b.fetchedAt || 0).getTime();
        return tb - ta;
      });

      // Firestore 1MB guard — prefer newest if somehow oversized
      let payloadJobs = jobs;
      let jsonSize = Buffer.byteLength(JSON.stringify({ jobs: payloadJobs, fetchedAt }), "utf8");
      if (jsonSize > 850_000) {
        payloadJobs = jobs.map((j) =>
          j.description && j.description.length > 1200
            ? { ...j, description: j.description.slice(0, 1200) }
            : j
        );
        jsonSize = Buffer.byteLength(JSON.stringify({ jobs: payloadJobs, fetchedAt }), "utf8");
      }
      if (jsonSize > 850_000) {
        payloadJobs = payloadJobs.map((j) =>
          j.description && j.description.length > 600
            ? { ...j, description: j.description.slice(0, 600) }
            : j
        );
        jsonSize = Buffer.byteLength(JSON.stringify({ jobs: payloadJobs, fetchedAt }), "utf8");
      }
      if (jsonSize > 850_000) {
        payloadJobs = payloadJobs.slice(0, 400);
      }

      const nextIds = new Set(payloadJobs.map((j) => String(j.id)));
      feedSize = payloadJobs.length;
      await db.collection("job_board").doc("adzuna_latest").set({
        jobs: payloadJobs,
        fetchedAt,
        totalAvailable: firstOk.count ?? null,
        lastPollNew: newCount,
        lastPollIncoming: incoming.size,
      });
      // No tag bust here: busting "public-jobs" invalidates every ISR page built
      // from it. The workflow busts once per scrape batch via /api/cron/bump-cache.

      const site = getSiteUrl();
      const updated = [...nextIds]
        .filter((id) => !prevIds.has(id))
        .map((id) => `${site}/jobs/${jobUrlId(id)}`);
      const deleted = [...prevIds]
        .filter((id) => !nextIds.has(id))
        .map((id) => `${site}/jobs/${jobUrlId(id)}`);
      indexing = await notifyJobUrls({ updated, deleted });
    } catch (err) {
      console.error("adzuna Firestore write error:", err);
    }
  }

  return Response.json({
    success: true,
    mode: "incremental-poll",
    incoming: incoming.size,
    new: newCount,
    retained: retainedCount,
    droppedStale,
    feedSize: incoming.size + retainedCount, // approximate before dedupe overlay
    withDescription: [...incoming.values()].filter((j) => j.description).length,
    totalAvailable: firstOk.count ?? null,
    persisted: !!db,
    indexing,
    timestamp: fetchedAt,
  });
}
