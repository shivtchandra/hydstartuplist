import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { normalizeSalary, sanitizeJobHtml } from "../../../../lib/job-content.js";
import { notifyJobUrls } from "../../../../lib/google-indexing.js";
import { jobUrlId } from "../../../../lib/jobs-seo.js";
import { getSiteUrl } from "../../../../lib/site-url.js";

// Daily Hyderabad tech-jobs pull via Adzuna — a legitimate, licensed job
// aggregator (not a scrape of LinkedIn/Naukri/Indeed, which is ToS-off-limits
// — see check-hiring's comments). max_days_old=2 keeps it fresh; category
// restricts to IT jobs so the feed stays relevant to this site's audience.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return NextResponse.json({ error: "ADZUNA_APP_ID/ADZUNA_APP_KEY not configured" }, { status: 500 });
  }

  // Adzuna caps each page at 50 results, so one page badly undercounts —
  // there are hundreds of matching postings on a given day. Pull 3 pages
  // in parallel (up to 150 jobs) instead of widening the recency window.
  const PAGES = 3;
  const basePage = (page) => {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      where: "Hyderabad",
      category: "it-jobs",
      max_days_old: "3",
      results_per_page: "50",
      "content-type": "application/json",
    });
    return fetch(`https://api.adzuna.com/v1/api/jobs/in/search/${page}?${params}`, {
      signal: AbortSignal.timeout(15000),
    }).then((r) => (r.ok ? r.json() : null));
  };

  const pages = await Promise.all(Array.from({ length: PAGES }, (_, i) => basePage(i + 1).catch(() => null)));
  const firstOk = pages.find(Boolean);
  if (!firstOk) {
    return NextResponse.json({ error: "Adzuna request failed" }, { status: 502 });
  }

  const fetchedAt = new Date().toISOString();
  const seen = new Set();
  const jobs = [];
  for (const data of pages) {
    for (const r of data?.results || []) {
      const id = String(r.id);
      if (seen.has(id)) continue;
      seen.add(id);
      const description = r.description ? sanitizeJobHtml(r.description) : null;
      jobs.push({
        id,
        title: r.title?.replace(/<[^>]+>/g, "").trim(),
        company: r.company?.display_name || "Unknown",
        location: r.location?.display_name || "Hyderabad",
        url: r.redirect_url,
        postedAt: r.created,
        fetchedAt,
        description: description || null,
        salary: normalizeSalary(r.salary_min, r.salary_max),
        source: "adzuna",
      });
    }
  }

  const db = await getAdminDb();
  let indexing = null;
  if (db) {
    try {
      const prevSnap = await db.collection("job_board").doc("adzuna_latest").get();
      const prevJobs = prevSnap.exists ? prevSnap.data().jobs || [] : [];
      const prevIds = new Set(prevJobs.map((j) => String(j.id)));
      const nextIds = new Set(jobs.map((j) => String(j.id)));

      await db.collection("job_board").doc("adzuna_latest").set({
        jobs,
        fetchedAt,
        totalAvailable: firstOk.count ?? null,
      });

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

  return NextResponse.json({
    success: true,
    fetched: jobs.length,
    withDescription: jobs.filter((j) => j.description).length,
    withSalary: jobs.filter((j) => j.salary).length,
    totalAvailable: firstOk.count ?? null,
    persisted: !!db,
    indexing,
    timestamp: fetchedAt,
  });
}
