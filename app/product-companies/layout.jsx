import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/product-companies` },
  title: "Top 100+ Product Companies in Hyderabad (2026 Directory + Live Jobs & Salaries)",
  description:
    "Complete directory of 1,000+ verified product software companies in Hyderabad with 400+ live jobs, direct ATS portals (Greenhouse/Lever/Ashby), office maps, and zero consultancies.",
  keywords: [
    "product based companies in hyderabad",
    "product companies in hyderabad",
    "top product based companies in hyderabad",
    "product based companies in hyderabad hiring",
    "product based companies in hyderabad for freshers",
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
    "hyderabad startups map",
  ],
  openGraph: {
    title: "Top 100+ Product Companies in Hyderabad (2026 Directory + Live Jobs & Salaries)",
    description:
      "Explore 1,000+ verified product software companies and startups in Hyderabad with live office pins, funding stages, and direct ATS job openings.",
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
          name: "Which product companies in Hyderabad are actively hiring?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Over 60+ verified product startups and tech companies in Hyderabad have active openings tracked on Hyderabad Startups Map, linking directly to company ATS portals (Greenhouse, Lever, Ashby, Workday) with zero recruitment consultancies.",
          },
        },
        {
          "@type": "Question",
          name: "What are the top product-based companies in Hyderabad for freshers?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Startups and growth-stage product companies hiring entry-level talent and interns include Phenom, Darwinbox, Zenoti, Keka, HighRadius, alongside specialized deep-tech builders like Skyroot Aerospace and Dhruva Space.",
          },
        },
        {
          "@type": "Question",
          name: "How many product-based startups are located in Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hyderabad Startups Map tracks over 1,000+ verified product-based companies and software startups across HITEC City, Gachibowli, Madhapur, Knowledge City, and Financial District.",
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
