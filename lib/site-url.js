// Single source of truth for the public site origin (OG URLs, canonicals, sitemap).
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
