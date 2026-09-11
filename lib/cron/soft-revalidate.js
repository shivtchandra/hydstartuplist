/** Revalidate Next data cache tags when running inside Next; no-op on GH. */
export async function softRevalidateTag(tag) {
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(tag);
  } catch {
    // Outside Next (GitHub Actions scripts) — ISR TTL covers freshness.
  }
}

/** Optional tiny Vercel ping so CDN/ISR tags refresh after a GH scrape. */
export async function bumpVercelCache(tags = ["public-jobs", "startups-dynamic"]) {
  const site = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) return { skipped: true };
  try {
    const res = await fetch(`${site}/api/cron/bump-cache?tags=${encodeURIComponent(tags.join(","))}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15_000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export function cronTimeBudgetMs(fallback = 22_000) {
  const fromEnv = parseInt(process.env.CRON_TIME_BUDGET_MS || "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  if (process.env.GITHUB_ACTIONS === "true") return 600_000; // 10 min on GH runners
  return fallback;
}

export function cronConcurrency(fallback = 3) {
  const fromEnv = parseInt(process.env.CRON_CONCURRENCY || "", 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  if (process.env.GITHUB_ACTIONS === "true") return 6;
  return fallback;
}
