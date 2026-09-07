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
      {
        userAgent: ["GPTBot", "ChatGPT-User", "Google-Extended", "anthropic-ai", "ClaudeBot", "PerplexityBot"],
        allow: "/",
        disallow,
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-jobs.xml`],
  };
}
