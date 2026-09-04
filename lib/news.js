import { getApproved } from "./store.js";

/**
 * Flatten per-startup news arrays into a single feed, newest first.
 * Shared by /api/news and the /news SSR page so crawlers see real articles.
 */
export async function getNewsFeed() {
  const all = await getApproved();
  return all
    .filter((s) => s.active !== false)
    .filter((s) => Array.isArray(s.news) && s.news.length)
    .flatMap((s) =>
      s.news.map((n) => ({
        ...n,
        companyId: s.id,
        companyName: s.name,
        website: s.website,
        logoUrl: s.logoUrl || null,
        sector: s.sector,
      }))
    )
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
}
