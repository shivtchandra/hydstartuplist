import { getSiteUrl } from "./site-url.js";

/**
 * Same-site check for browser POSTs. Pages are served from Cloudflare and
 * /api/* is proxied to Vercel, so the browser's Origin is the public site
 * (startups.mapmyhyd.com) while req.url is the Vercel host. Accept exactly
 * those two origins.
 */
export function isAllowedOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(req.url).origin || origin === new URL(getSiteUrl()).origin;
}
