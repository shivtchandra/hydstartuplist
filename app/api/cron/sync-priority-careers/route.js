import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import {
  loadPriorityCareers,
  scrapePriorityEmployer,
  hiringToPublicJobs,
  mergePriorityJobs,
} from "../../../../lib/priority-careers.js";
import { notifyJobUrls } from "../../../../lib/google-indexing.js";
import { jobUrlId } from "../../../../lib/jobs-seo.js";
import { getSiteUrl } from "../../../../lib/site-url.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 4;
const TIME_BUDGET_MS = 48_000;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getAdminDb();
  if (!db) return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });

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
        results.push({ id: entry.id, name: entry.name, ok: false, error: String(err?.message || err) });
        continue;
      }
      if (!hiring?.roles?.length) {
        results.push({ id: entry.id, name: entry.name, ok: false, roles: 0 });
        continue;
      }
      jobs.push(...hiringToPublicJobs(entry, hiring, fetchedAt));
      results.push({ id: entry.id, name: entry.name, ok: true, roles: hiring.roles.length, source: hiring.source });

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

  await db.collection("job_board").doc("priority_careers_latest").set({
    jobs: merged,
    fetchedAt,
    lifecycleVersion: 1,
    employers: results.filter((r) => r.ok).length,
    results,
  });
  revalidateTag("public-jobs");

  return NextResponse.json({
    success: true,
    employers: entries.length,
    hit: results.filter((r) => r.ok).length,
    jobs: merged.length,
    scraped: jobs.length,
    fetchedAt,
    results,
  });
}
