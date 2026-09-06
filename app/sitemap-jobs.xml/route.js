import { getSiteUrl } from "../../lib/site-url.js";
import { getAllJobs } from "../../lib/jobs.js";
import { jobUrlId } from "../../lib/jobs-seo.js";

// Live job URLs churn hourly and Firestore reads time out the static build,
// so job detail pages are excluded from the main /sitemap.xml (see app/sitemap.js).
// This dynamic sitemap runs at request-time (ISR) where getAllJobs() reads the
// live Firestore feed, so the JobPosting pages still get discovered + indexed.
export const revalidate = 3600;
export const dynamic = "force-dynamic";

const MAX_URLS = 20000; // Google per-sitemap cap is 50k; stay well under.

function esc(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );
}

export async function GET() {
  const site = getSiteUrl();
  let entries = [];
  try {
    const jobs = await getAllJobs();
    entries = jobs
      .filter((j) => j && j.id && j.status !== "closed")
      .slice(0, MAX_URLS)
      .map((j) => {
        const url = `${site}/jobs/${jobUrlId(j.id)}`;
        const lastmod = j.postedAt
          ? new Date(j.postedAt).toISOString().slice(0, 10)
          : null;
        return `  <url>\n    <loc>${esc(url)}</loc>${
          lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
        }\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`;
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
