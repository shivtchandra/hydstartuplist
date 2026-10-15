// Single source of truth for the public site origin (OG URLs, canonicals, sitemap).

// Brand entity lives on the parent domain (mapmyhyd.com). Every JSON-LD
// publisher/author/creator points here so search + AI engines see one org.
export const PARENT_SITE_URL = "https://mapmyhyd.com/";
export const PARENT_ORG_ID = "https://mapmyhyd.com/#organization";
export const BRAND_NAME = "Mapping HYD";

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ||
    "http://localhost:3000"
  );
}

export function getSiteHostname() {
  try {
    return new URL(getSiteUrl()).hostname;
  } catch {
    return "localhost";
  }
}
