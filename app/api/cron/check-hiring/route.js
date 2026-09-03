import { NextResponse } from "next/server";
import { getApproved } from "../../../../lib/store.js";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max allowed serverless duration on Vercel Pro

// Firecrawl is a paid credit-metered fallback. It only runs when explicitly
// switched on with FIRECRAWL_ENABLED=1 — otherwise the cron sticks to the
// free ATS-API / HTML-discovery / schema.org paths and never spends credits.
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_ENABLED = process.env.FIRECRAWL_ENABLED === "1";
const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function getJson(url) {
  try {
    const resp = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function getText(url) {
  try {
    const resp = await fetch(url, { redirect: "follow", headers: UA, signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

function slugCandidates(entry) {
  const slugs = new Set();
  if (entry.website) {
    try {
      const host = new URL(entry.website).hostname.replace(/^www\./, "");
      const parts = host.split(".");
      const label = parts[0]?.toLowerCase();
      if (label && label.length >= 3 && !["app", "get", "the", "use", "try"].includes(label)) {
        slugs.add(label);
        if (label.includes("-")) slugs.add(label.replace(/-/g, ""));
      } else if (parts.length > 2 && parts[1].length >= 3) {
        slugs.add(parts[1].toLowerCase());
      }
    } catch {}
  }
  return [...slugs];
}

function atsProbes(slug) {
  return [
    { source: "greenhouse", url: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, boardUrl: `https://boards.greenhouse.io/${slug}` },
    { source: "lever", url: `https://api.lever.co/v0/postings/${slug}?mode=json`, boardUrl: `https://jobs.lever.co/${slug}` },
    { source: "ashby", url: `https://api.ashbyhq.com/posting-api/job-board/${slug}`, boardUrl: `https://jobs.ashbyhq.com/${slug}` },
    { source: "recruitee", url: `https://${slug}.recruitee.com/api/offers/`, boardUrl: `https://${slug}.recruitee.com/` },
    { source: "workable", url: `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`, boardUrl: `https://apply.workable.com/${slug}/` },
    { source: "breezy", url: `https://${slug}.breezy.hr/api/v1/jobs`, boardUrl: `https://${slug}.breezy.hr/` },
    { source: "smartrecruiters", url: `https://api.smartrecruiters.com/v1/companies/${slug}/postings`, boardUrl: `https://jobs.smartrecruiters.com/${slug}` },
  ];
}

function extractJobs(source, d) {
  if (!d) return null;
  if (source === "greenhouse") return d.jobs || null;
  if (source === "lever") return Array.isArray(d) ? d : null;
  if (source === "ashby") return d.jobs || null;
  if (source === "recruitee") return d.offers || null;
  if (source === "workable") return d.jobs || null;
  if (source === "breezy") return Array.isArray(d) ? d : null;
  if (source === "smartrecruiters") return d.content || null;
  return null;
}

function locOf(source, j) {
  if (source === "greenhouse") return j.location?.name || "";
  if (source === "lever") return j.categories?.location || "";
  if (source === "ashby") return j.location || "";
  if (source === "recruitee") return `${j.city || ""} ${j.country || ""} ${j.location || ""}`;
  if (source === "workable") return `${j.city || ""} ${j.country || ""} ${j.location?.city || ""}`;
  if (source === "breezy") return `${j.location?.city || ""} ${j.location?.country?.name || ""}`;
  if (source === "smartrecruiters") return `${j.location?.city || ""} ${j.location?.country || ""}`;
  return "";
}

function roleOf(source, j, boardUrl) {
  const title = j.title || j.text || j.name || "Open Role";
  const url = j.absolute_url || j.hostedUrl || j.applyUrl || j.jobUrl || j.url || j.ref || boardUrl;
  return { title, url };
}

async function discoverAtsFromHtml(entry) {
  const urlsToFetch = new Set();
  if (entry.website) urlsToFetch.add(entry.website);
  if (entry.careers) urlsToFetch.add(entry.careers);
  if (entry.website) {
    const base = entry.website.replace(/\/$/, "");
    urlsToFetch.add(`${base}/careers`);
    urlsToFetch.add(`${base}/jobs`);
  }

  // Fetch all candidate pages concurrently — was sequential (up to 4 × 5s = 20s
  // per company), which is why check-hiring blew the 60s function budget.
  const htmls = await Promise.all([...urlsToFetch].map((u) => getText(u)));

  const patterns = [
    { source: "greenhouse", regex: /boards\.greenhouse\.io\/([a-z0-9_-]+)/i },
    { source: "lever", regex: /jobs\.lever\.co\/([a-z0-9_-]+)/i },
    { source: "ashby", regex: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i },
    { source: "recruitee", regex: /([a-z0-9_-]+)\.recruitee\.com/i },
    { source: "workable", regex: /apply\.workable\.com\/([a-z0-9_-]+)/i },
    { source: "breezy", regex: /([a-z0-9_-]+)\.breezy\.hr/i },
    { source: "smartrecruiters", regex: /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/i },
  ];

  for (const html of htmls) {
    if (!html) continue;

    for (const { source, regex } of patterns) {
      const match = html.match(regex);
      if (match && match[1] && match[1].length > 2) {
        const slug = match[1].toLowerCase();
        const probes = atsProbes(slug).filter((p) => p.source === source);
        for (const probe of probes) {
          const d = await getJson(probe.url);
          const jobs = extractJobs(source, d);
          if (Array.isArray(jobs) && jobs.length > 0) {
            const locRegex = /hyderabad|secunderabad|telangana|\bindia\b|remote\s*\(?india\)?/i;
            const matched = jobs.filter((j) => locRegex.test(locOf(source, j)));
            if (matched.length > 0) {
              const roles = matched.slice(0, 5).map((j) => roleOf(source, j, probe.boardUrl));
              return {
                active: true,
                count: matched.length,
                source: probe.source,
                slug,
                url: probe.boardUrl,
                roles,
                checkedAt: new Date().toISOString(),
              };
            }
          }
        }
      }
    }
  }
  return null;
}

async function schemaOrgJobs(entry) {
  if (!entry.careers || entry.careers.includes("linkedin.com")) return null;
  const html = await getText(entry.careers);
  if (!html) return null;

  const matches = [...html.matchAll(/"@type"\s*:\s*"JobPosting"[\s\S]{0,300}?"title"\s*:\s*"([^"]+)"/gi)];
  const allMatches = [...html.matchAll(/"@type"\s*:\s*"JobPosting"/gi)];
  if (allMatches.length === 0) return null;
  const roles = matches.slice(0, 5).map((m) => ({ title: m[1], url: entry.careers }));
  return {
    active: true,
    count: allMatches.length,
    source: "schema-org",
    url: entry.careers,
    roles,
    checkedAt: new Date().toISOString(),
  };
}

async function firecrawlJobs(entry) {
  if (!FIRECRAWL_ENABLED || !FIRECRAWL_KEY || (!entry.careers && !entry.website)) return null;
  const targetUrl = entry.careers || `${entry.website.replace(/\/$/, "")}/careers`;
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const markdown = data.data?.markdown || "";
    if (!markdown) return null;

    const roleMatches = [...markdown.matchAll(/(?:###?\s*|[*•-]\s*)([A-Z][A-Za-z0-9\s/&,.-]{4,50}(?:Engineer|Developer|Manager|Analyst|Lead|Specialist|Designer|Consultant|Architect|Intern|Director|VP|Head|Representative|Executive))/g)];
    if (roleMatches.length === 0) return null;

    const roles = roleMatches.slice(0, 5).map((m) => ({ title: m[1].trim(), url: targetUrl }));
    return {
      active: true,
      count: roleMatches.length,
      source: "firecrawl",
      url: targetUrl,
      roles,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

const SRC_ORDER = { greenhouse: 0, lever: 1, ashby: 2, recruitee: 3, workable: 4, breezy: 5, smartrecruiters: 6 };

async function checkOne(entry) {
  if (!entry.website) return null;

  const tasks = [];
  for (const slug of slugCandidates(entry)) {
    for (const probe of atsProbes(slug)) {
      tasks.push(
        (async () => {
          const d = await getJson(probe.url);
          const jobs = extractJobs(probe.source, d);
          if (!Array.isArray(jobs) || jobs.length === 0) return null;
          const locRegex = /hyderabad|secunderabad|telangana|\bindia\b|remote\s*\(?india\)?/i;
          const matched = jobs.filter((j) => locRegex.test(locOf(probe.source, j)));
          if (matched.length === 0) return null;
          const roles = matched.slice(0, 5).map((j) => roleOf(probe.source, j, probe.boardUrl));
          return {
            active: true,
            count: matched.length,
            source: probe.source,
            slug,
            url: probe.boardUrl,
            roles,
            checkedAt: new Date().toISOString(),
          };
        })()
      );
    }
  }

  const results = (await Promise.all(tasks)).filter(Boolean);
  if (results.length) {
    results.sort((a, b) => (SRC_ORDER[a.source] ?? 99) - (SRC_ORDER[b.source] ?? 99));
    return results[0];
  }

  const discovered = await discoverAtsFromHtml(entry);
  if (discovered) return discovered;

  const schemaHit = await schemaOrgJobs(entry);
  if (schemaHit) return schemaHit;

  return firecrawlJobs(entry);
}

export async function GET(req) {
  // Authorization check for Vercel Cron
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const all = await getApproved();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "40", 10);
  const db = await getAdminDb();

  // Rotating cursor: each run picks up where the last one left off and
  // wraps to 0 past the end, so successive daily cron runs eventually cover
  // every company with no manual offset bookkeeping. An explicit ?offset=
  // overrides the stored cursor (useful for a manual one-off run).
  const cursorRef = db ? db.collection("cron_state").doc("check_hiring") : null;
  let offset = parseInt(searchParams.get("offset") || "", 10);
  if (Number.isNaN(offset)) {
    const cursorSnap = cursorRef ? await cursorRef.get() : null;
    offset = cursorSnap?.exists ? cursorSnap.data().offset || 0 : 0;
  }
  const targets = all.slice(offset, offset + limit);

  const results = [];
  let hits = 0;

  // Companies were being checked one at a time — each miss falls through a
  // slow ATS-discovery chain (~20-37s), so a sequential batch of 25 blew past
  // Vercel's 60s cap and the cursor (written only after the loop) never
  // advanced, stalling on the same stuck batch every run. Run with bounded
  // concurrency and a time budget instead; `attempted` tracks what actually
  // finished so the cursor advances only past real progress.
  const CONCURRENCY = 6;
  const TIME_BUDGET_MS = 45_000; // headroom under the 60s function cap
  const startedAt = Date.now();
  const attempted = new Array(targets.length).fill(false);

  async function worker() {
    while (true) {
      const idx = nextIdx++;
      if (idx >= targets.length) return;
      if (Date.now() - startedAt > TIME_BUDGET_MS) return; // out of time — leave unattempted for next cursor pass
      const entry = targets[idx];
      if (entry.hiring?.source === "manual") {
        attempted[idx] = true;
        continue;
      }
      let h = null;
      try {
        h = await checkOne(entry);
      } catch {
        h = null;
      }
      attempted[idx] = true;
      if (h) {
        hits++;
        results.push({ id: entry.id, name: entry.name, hiring: h });
        if (db) {
          try {
            await db.collection("startups_dynamic").doc(entry.id).set({ hiring: h, updatedAt: new Date().toISOString() }, { merge: true });
          } catch (err) {
            console.error(`Firestore write error for ${entry.name}:`, err);
          }
        }
      }
    }
  }
  let nextIdx = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));

  const firstUnattempted = attempted.findIndex((v) => !v);
  const nextOffset =
    firstUnattempted === -1
      ? (offset + limit >= all.length ? 0 : offset + limit)
      : offset + firstUnattempted;
  if (cursorRef) {
    try {
      await cursorRef.set({ offset: nextOffset, lastRunAt: new Date().toISOString() });
    } catch (err) {
      console.error("cursor write error:", err);
    }
  }

  return NextResponse.json({
    success: true,
    checked: targets.length,
    hiringHits: hits,
    offset,
    nextOffset,
    results,
    timestamp: new Date().toISOString(),
  });
}
