import { getSiteUrl } from "../../lib/site-url.js";
import { getAllJobs } from "../../lib/jobs.js";
import { jobUrlId } from "../../lib/jobs-seo.js";

/**
 * Scoped jobs sitemap for crawl-budget triage.
 * GSC: 1.3K+ URLs were "Discovered – currently not indexed" after we submitted
 * the full live feed. Only recent openings belong in the submission feed;
 * older job URLs stay crawlable via internal links / hubs.
 */
export const revalidate = 3600;
export const dynamic = "force-dynamic";

const MAX_URLS = 200;
const MAX_AGE_DAYS = 14;

function esc(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );
}

function postedMs(job) {
  const raw = job?.postedAt || job?.sourcePostedAt || job?.fetchedAt;
  const t = Date.parse(raw || "");
  return Number.isFinite(t) ? t : 0;
}

export async function GET() {
  const site = getSiteUrl();
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  let entries = [];
  try {
    const jobs = await getAllJobs();
    entries = jobs
      .filter((j) => j && j.id && j.status !== "closed")
      .filter((j) => postedMs(j) >= cutoff)
      .sort((a, b) => postedMs(b) - postedMs(a))
      .slice(0, MAX_URLS)
      .map((j) => {
        const url = `${site}/jobs/${jobUrlId(j.id)}`;
        const lastmod = postedMs(j)
          ? new Date(postedMs(j)).toISOString().slice(0, 10)
          : null;
        return `  <url>\n    <loc>${esc(url)}</loc>${
          lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
        }\n    <changefreq>daily</changefreq>\n    <priority>0.5</priority>\n  </url>`;
      });
  } catch (err) {
    console.error("jobs sitemap error:", err);
    entries = [];
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join(
    "\n"
  )}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
