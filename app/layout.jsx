import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

// Resolve the public origin so OG/Twitter image URLs are absolute in production.
// Prefer an explicit env; otherwise use Vercel's built-in production-domain var
// (set automatically on every Vercel deploy) so share cards work with no config.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  "http://localhost:3000";
const OG_TITLE = "Hyderabad Startup Map – 1,000+ Startups, Jobs & Funding";
const OG_DESC =
  "Explore 1,000+ startups in Hyderabad on an interactive map. Filter by sector, funding stage, and area. Browse open jobs, startup news, and funding rounds.";
const OG_IMAGE = "/opengraph-image";

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "HydMap",
      description: OG_DESC,
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "HydMap",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
      sameAs: [],
    },
  ],
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hyderabad Startup Map | 1,000+ Startups, Jobs & Funding | HydMap",
    template: "%s | HydMap",
  },
  description: OG_DESC,
  keywords: [
    "Hyderabad startups",
    "Hyderabad startup map",
    "startup jobs Hyderabad",
    "Hyderabad tech companies",
    "Hyderabad startup ecosystem",
    "startups in Hyderabad",
    "Hyderabad funding rounds",
    "GCCs Hyderabad",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    siteName: "HydMap",
    url: SITE_URL,
    type: "website",
    locale: "en_IN",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: OG_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESC,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://tiles.stadiamaps.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
