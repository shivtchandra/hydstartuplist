import { getSiteUrl } from "../../lib/site-url.js";
import GccSeoIndex from "../components/GccSeoIndex.jsx";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/gccs` },
  title: "GCC Companies in Hyderabad (2026 List) — Global Capability Centers Directory | Mapping HYD",
  description:
    "Explore 100+ Global Capability Centers (GCCs) in Hyderabad. Browse tech, BFSI, pharma, and product engineering hubs across HITEC City, Knowledge City, and Gachibowli with verified career pages.",
  keywords: [
    "gcc companies in hyderabad",
    "list of gcc companies in hyderabad",
    "top gcc companies in hyderabad",
    "hyderabad gcc companies",
    "global capability center hyderabad",
    "top 10 gcc companies in hyderabad",
    "new gccs in hyderabad",
    "global capability centres in hyderabad",
  ],
  openGraph: {
    title: "GCC Companies in Hyderabad (2026 List) — Global Capability Centers Directory",
    description:
      "Explore 100+ Global Capability Centers (GCCs) in Hyderabad across HITEC City, Knowledge City, and Gachibowli.",
    url: `${SITE_URL}/gccs`,
  },
};

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hyderabad Startup Map", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "GCC Companies in Hyderabad", item: `${SITE_URL}/gccs` },
      ],
    },
    {
      "@type": "CollectionPage",
      name: "Global Capability Centers (GCCs) in Hyderabad",
      url: `${SITE_URL}/gccs`,
      description:
        "Directory of Global Capability Centers (GCCs) running major engineering and product divisions in Hyderabad.",
      about: {
        "@type": "Thing",
        name: "Global Capability Centers in Hyderabad",
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
      {/* Server-rendered GCC list + crawl links — the client page ships an
          empty shell, this gives Googlebot real HTML for "GCC companies in
          Hyderabad". Normal scrolling page, no :has() workaround needed. */}
      <GccSeoIndex />
    </>
  );
}
