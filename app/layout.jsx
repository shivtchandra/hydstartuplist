import "./globals.css";
import "./opportunities.css";
import InteractionMetrics from "./components/InteractionMetrics.jsx";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";

import { getSiteUrl } from "../lib/site-url.js";

const outfit = localFont({
  src: "./fonts/Outfit.ttf",
  variable: "--font-heading-face",
  display: "swap",
});

const jakarta = localFont({
  src: "./fonts/PlusJakartaSans.ttf",
  variable: "--font-main-face",
  display: "swap",
});

const SITE_URL = getSiteUrl();
const OG_TITLE = "Hyderabad Startup & Product Companies Map – 1,000+ Tech Companies, Jobs & Funding";
const OG_DESC =
  "Explore 1,000+ startups and product companies in Hyderabad on an interactive map. Filter by sector, funding stage, and area. Browse open jobs, startup news, and funding rounds.";
const OG_IMAGE = "/opengraph-image?v=2"; // bump when OG art changes (WhatsApp caches hard)

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Mapping HYD",
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
      name: "Mapping HYD",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
      sameAs: [],
    },
  ],
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hyderabad Startup Map — Startup Companies in Hyderabad, Jobs & Funding | Mapping HYD",
    template: "%s | Mapping HYD",
  },
  description: OG_DESC,
  keywords: [
    "product companies Hyderabad",
    "startups in Hyderabad",
    "Hyderabad tech companies",
    "Hyderabad startup map",
    "startup jobs Hyderabad",
    "software companies Hyderabad",
    "GCCs Hyderabad",
    "Hyderabad startup funding",
  ],
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    siteName: "Mapping HYD",
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
    <html lang="en" data-theme="light" className={`${outfit.variable} ${jakarta.variable}`}>
      <head>
        <link rel="preconnect" href="https://tiles.stadiamaps.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <InteractionMetrics />
      </body>
    </html>
  );
}
