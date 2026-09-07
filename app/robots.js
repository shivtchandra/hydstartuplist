import { getSiteUrl } from "../lib/site-url.js";

export default function robots() {
  const SITE_URL = getSiteUrl();
  const disallow = ["/admin/", "/shiva/", "/api/"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // Explicit allow for answer-engine crawlers (do not block GPTBot / Perplexity / Claude).
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "anthropic-ai",
          "ClaudeBot",
          "PerplexityBot",
        ],
        allow: "/",
        disallow,
      },
    ],
    // Hubs live in /sitemap.xml. /sitemap-jobs.xml is deliberately scoped to
    // recent openings only (see app/sitemap-jobs.xml/route.js) to stop crawl-budget flood.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-jobs.xml`],
  };
}
