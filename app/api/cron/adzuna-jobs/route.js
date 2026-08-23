import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";

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

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    where: "Hyderabad",
    category: "it-jobs",
    max_days_old: "2",
    results_per_page: "50",
    "content-type": "application/json",
  });

  const resp = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) {
    return NextResponse.json({ error: `Adzuna responded ${resp.status}` }, { status: 502 });
  }
  const data = await resp.json();

  const jobs = (data.results || []).map((r) => ({
    id: String(r.id),
    title: r.title?.replace(/<[^>]+>/g, "").trim(),
    company: r.company?.display_name || "Unknown",
    location: r.location?.display_name || "Hyderabad",
    url: r.redirect_url,
    postedAt: r.created,
    salary: r.salary_min && r.salary_max ? { min: r.salary_min, max: r.salary_max } : null,
  }));

  const db = await getAdminDb();
  if (db) {
    try {
      await db.collection("job_board").doc("adzuna_latest").set({
        jobs,
        fetchedAt: new Date().toISOString(),
        totalAvailable: data.count ?? null,
      });
    } catch (err) {
      console.error("adzuna Firestore write error:", err);
    }
  }

  return NextResponse.json({
    success: true,
    fetched: jobs.length,
    totalAvailable: data.count ?? null,
    persisted: !!db,
    timestamp: new Date().toISOString(),
  });
}
