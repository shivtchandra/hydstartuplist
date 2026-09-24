import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/product-companies` },
  title: "Product Based Companies in Hyderabad (2026 Directory & Map)",
  description:
    "Complete list of 1,000+ product-based companies and software startups in Hyderabad — SaaS, AI, FinTech, and DeepTech offices across HITEC City, Gachibowli, and Madhapur.",
  keywords: [
    "product based companies in hyderabad",
    "product companies in hyderabad",
    "software product development company in hyderabad",
    "product base company in hyderabad",
    "list of product based companies in hyderabad",
    "best product based companies in hyderabad",
    "product development services in hyderabad",
    "software product development company in madhapur",
    "saas companies in hyderabad",
  ],
  openGraph: {
    title: "Product Based Companies in Hyderabad (2026 Directory & Map)",
    description:
      "Explore 1,000+ software product companies and startups in Hyderabad with live office pins, funding stages, and open job roles.",
    url: `${SITE_URL}/product-companies`,
  },
};

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hyderabad Startup Map", item: SITE_URL },
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
