import {
  loadPriorityCareers,
  scrapePriorityEmployer,
  hiringToPublicJobs,
  mergePriorityJobs,
} from "../priority-careers.js";
import { getAdminDb } from "../firebaseAdmin.js";
import { notifyJobUrls } from "../google-indexing.js";
import { jobUrlId } from "../jobs-seo.js";
import { getSiteUrl } from "../site-url.js";
import { refreshDynamicOverlayRollup } from "../store-core.js";
import { softRevalidateTag, cronTimeBudgetMs, cronConcurrency } from "./soft-revalidate.js";

const MAX_JSON = 720_000;

function docBytes(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}

function leanJob(j, descMax = 1200) {
  const out = {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location || "Hyderabad",
    url: j.url,
    postedAt: j.postedAt || j.sourcePostedAt || null,
    sourcePostedAt: j.sourcePostedAt || j.postedAt || null,
    firstSeenAt: j.firstSeenAt || j.fetchedAt || null,
    lastCheckedAt: j.lastCheckedAt || j.fetchedAt || null,
    lastSeenAt: j.lastSeenAt || j.fetchedAt || null,
    status: j.status || "active",
    source: j.source || "careers",
    startupId: j.startupId || null,
    employerType: j.employerType || null,
    website: j.website || null,
    employerId: j.employerId || null,
    salary: j.salary || null,
  };
  if (descMax > 0 && j.description) {
    const d = String(j.description).trim();
    out.description = d.length > descMax ? d.slice(0, descMax) : d;
  }
  return out;
}

function packPriorityPayload(list, results, fetchedAt) {
  const sanitizedResults = (results || []).map((r) => ({
    id: r.id,
    name: r.name,
    ok: !!r.ok,
    ...(r.roles != null ? { roles: r.roles } : {}),
    ...(r.source ? { source: r.source } : {}),
    ...(r.error ? { error: String(r.error).slice(0, 150) } : {}),
  }));

  const live = list.filter((j) => j.status !== "closed");
  const closed = list.filter((j) => j.status === "closed");
  const ordered = [...live, ...closed];

  for (const descMax of [1500, 800, 200, 0]) {
    let packed = ordered.map((j) => leanJob(j, descMax));
    let payload = {
      jobs: packed,
      fetchedAt,
      lifecycleVersion: 1,
      employers: sanitizedResults.filter((r) => r.ok).length,
      results: sanitizedResults,
    };
    if (docBytes(payload) <= MAX_JSON) return payload;

    packed = live
      .slice()
      .sort((a, b) =>
        String(b.postedAt || b.sourcePostedAt || b.fetchedAt || "").localeCompare(
          String(a.postedAt || a.sourcePostedAt || a.fetchedAt || "")
        )
      )
      .map((j) => leanJob(j, descMax));

    payload = {
      jobs: packed,
      fetchedAt,
      lifecycleVersion: 1,
      employers: sanitizedResults.filter((r) => r.ok).length,
      results: sanitizedResults,
    };
    if (docBytes(payload) <= MAX_JSON) return payload;

    while (packed.length > 20 && docBytes(payload) > MAX_JSON) {
      packed = packed.slice(0, Math.floor(packed.length * 0.85));
      payload.jobs = packed;
    }
    if (docBytes(payload) <= MAX_JSON) return payload;
  }

  return {
    jobs: ordered.slice(0, 50).map((j) => leanJob(j, 0)),
    fetchedAt,
    lifecycleVersion: 1,
    employers: sanitizedResults.filter((r) => r.ok).length,
    results: sanitizedResults,
  };
}

export async function runSyncPriorityCareers() {
  const db = await getAdminDb();
  if (!db) return { ok: false, error: "Firebase not configured" };

  const TIME_BUDGET_MS = cronTimeBudgetMs(22_000);
  const CONCURRENCY = cronConcurrency(2);

  const entries = loadPriorityCareers();
  const fetchedAt = new Date().toISOString();
  const startedAt = Date.now();
  let nextIdx = 0;
  const results = [];
  const jobs = [];

  async function worker() {
    while (true) {
      const idx = nextIdx++;
      if (idx >= entries.length) return;
      if (Date.now() - startedAt > TIME_BUDGET_MS) return;
      const entry = entries[idx];
      let hiring = null;
      try {
        hiring = await scrapePriorityEmployer(entry);
      } catch (err) {
        results.push({ id: entry.id, name: entry.name, ok: false, error: String(err?.message || err).slice(0, 150) });
        continue;
      }
      if (!hiring?.roles?.length) {
        results.push({ id: entry.id, name: entry.name, ok: false, roles: 0 });
        continue;
      }
      jobs.push(...hiringToPublicJobs(entry, hiring, fetchedAt));
      results.push({ id: entry.id, name: entry.name, ok: true, roles: hiring.roles.length, source: hiring.source || "careers" });

      if (entry.startupId) {
        try {
          const prevSnap = await db.collection("startups_dynamic").doc(entry.startupId).get();
          const prevRoles = prevSnap.exists ? prevSnap.data()?.hiring?.roles || [] : [];
          const prevByUrl = new Map(prevRoles.map((r) => [r.url, r]));
          const hiringWithSeen = {
            ...hiring,
            roles: (hiring.roles || []).map((role) => {
              const prev = prevByUrl.get(role.url);
              return {
                ...role,
                firstSeenAt: prev?.firstSeenAt || hiring.checkedAt || fetchedAt,
                postedAt: role.postedAt || prev?.postedAt || null,
              };
            }),
          };
          await db.collection("startups_dynamic").doc(entry.startupId).set(
            { hiring: hiringWithSeen, updatedAt: fetchedAt },
            { merge: true }
          );
          const site = getSiteUrl();
          const prevUrls = new Set(prevRoles.map((r) => r.url));
          const nextUrls = new Set(hiring.roles.map((r) => r.url));
          const updated = [...nextUrls]
            .filter((u) => !prevUrls.has(u))
            .map((u) => `${site}/jobs/${jobUrlId(`careers-${entry.startupId}-${u}`)}`);
          const deleted = [...prevUrls]
            .filter((u) => !nextUrls.has(u))
            .map((u) => `${site}/jobs/${jobUrlId(`careers-${entry.startupId}-${u}`)}`);
          if (updated.length || deleted.length) await notifyJobUrls({ updated, deleted });
        } catch (err) {
          console.error(`priority careers write failed for ${entry.name}:`, err);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));

  const prevSnap = await db.collection("job_board").doc("priority_careers_latest").get();
  const prevJobs = prevSnap.exists ? prevSnap.data()?.jobs || [] : [];
  const scrapedEmployerIds = results.filter((r) => r.ok).map((r) => r.id);
  const merged = mergePriorityJobs(prevJobs, jobs, { checkedAt: fetchedAt, scrapedEmployerIds });

  const payload = packPriorityPayload(merged, results, fetchedAt);

  try {
    await db.collection("job_board").doc("priority_careers_latest").set(payload);
  } catch (err) {
    console.error("[sync-priority-careers] Failed to write priority_careers_latest:", err);
    try {
      const minimalPayload = {
        jobs: (payload.jobs || []).slice(0, 100).map((j) => leanJob(j, 0)),
        fetchedAt,
        lifecycleVersion: 1,
        employers: results.filter((r) => r.ok).length,
      };
      await db.collection("job_board").doc("priority_careers_latest").set(minimalPayload);
    } catch (fallbackErr) {
      console.error("[sync-priority-careers] Fallback write also failed:", fallbackErr);
    }
  }

  await softRevalidateTag("public-jobs");
  try {
    await refreshDynamicOverlayRollup(db);
  } catch (overlayErr) {
    console.error("[sync-priority-careers] refreshDynamicOverlayRollup error:", overlayErr);
  }

  return {
    ok: true,
    success: true,
    employers: entries.length,
    hit: results.filter((r) => r.ok).length,
    jobs: payload.jobs.length,
    scraped: jobs.length,
    fetchedAt,
    timeBudgetMs: TIME_BUDGET_MS,
    results,
  };
}
