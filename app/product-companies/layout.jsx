import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/product-companies` },
  title: "Top Product Based Companies in Hyderabad (2026 Directory & Map) — 1,000+ Startups",
  description:
    "Complete list of 1,000+ top product-based companies and software startups in Hyderabad — SaaS, AI, FinTech, and DeepTech offices across HITEC City, Gachibowli, and Madhapur.",
  keywords: [
    "product based companies in hyderabad",
    "product companies in hyderabad",
    "top product based companies in hyderabad",
    "what are product based companies in hyderabad",
    "best product based companies in hyderabad",
    "product based companies list in hyderabad",
    "top 100 product based companies in hyderabad",
    "product based it companies in hyderabad",
    "top 20 product based companies in hyderabad",
    "product based software companies in hyderabad",
    "software product development company in hyderabad",
    "product base company in hyderabad",
    "saas companies in hyderabad",
    "hyderabad startup map",
  ],
  openGraph: {
    title: "Top Product Based Companies in Hyderabad (2026 Directory & Map)",
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
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What are the top product-based companies in Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Top product-based companies in Hyderabad include Microsoft IDC, Google, Amazon AWS, Salesforce, ServiceNow, Uber, AMD, Qualcomm, alongside homegrown SaaS unicorns like Darwinbox, Zenoti, HighRadius, and Keka HR.",
          },
        },
        {
          "@type": "Question",
          name: "How many product-based startups are located in Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Mapping HYD tracks over 1,000+ verified product-based companies and software startups across HITEC City, Gachibowli, Madhapur, Knowledge City, and Financial District.",
          },
        },
        {
          "@type": "Question",
          name: "Where can I find jobs at product companies in Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can explore live engineering, product, and AI roles directly on Mapping HYD's Jobs Board, linking straight to company ATS portals with zero consultancy middle-layers.",
          },
        },
      ],
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
