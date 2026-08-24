import "./globals.css";

// Resolve the public origin so OG/Twitter image URLs are absolute in production.
// Prefer an explicit env; otherwise use Vercel's built-in production-domain var
// (set automatically on every Vercel deploy) so share cards work with no config.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  "http://localhost:3000";
const OG_TITLE = "HydMap — Every Hyderabad startup on one map";
const OG_DESC =
  "Interactive map, hiring feed, jobs, funding stages, news and analytics for 1,000+ Hyderabad startups.";
const OG_IMAGE = "/opengraph-image";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Hyderabad Startup Map | Explore & Track Hyderabad Startups",
  description: "Interactive map, hiring feed, news, and analytics for startups in Hyderabad",
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    siteName: "HydMap",
    url: SITE_URL,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: OG_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESC,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
