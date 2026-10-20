import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/product-companies` },
  title: "List of Product Based Companies in Hyderabad (2026 Directory + Direct ATS Jobs)",
  description:
    "Browse a verified list of product based companies in Hyderabad with live jobs, direct company ATS links, office locations, funding stages, and fresher-friendly openings.",
  keywords: [
    "product based companies in hyderabad",
    "product companies in hyderabad",
    "product based companies in hyderabad hiring",
    "product based companies in hyderabad for freshers",
    "product based companies list in hyderabad",
    "product based software companies in hyderabad",
    "saas companies in hyderabad",
  ],
  openGraph: {
    title: "List of Product Based Companies in Hyderabad (2026 Directory + Direct ATS Jobs)",
    description:
      "Explore verified product software companies and startups in Hyderabad with live office pins, funding stages, and direct ATS job openings.",
    url: `${SITE_URL}/product-companies`,
  },
};

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hyderabad Startups Map", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Product Based Companies in Hyderabad", item: `${SITE_URL}/product-companies` },
      ],
    },
    {
      "@type": "CollectionPage",
      name: "Product Based Companies in Hyderabad",
      url: `${SITE_URL}/product-companies`,
      description:
        "Comprehensive directory of product-based software companies and startups located in Hyderabad.",
      about: {
        "@type": "Thing",
        name: "Software Product Companies in Hyderabad",
      },
    },
  ],
};

export default function Layout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />
      {children}
    </>
  );
}
