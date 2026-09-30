import { getSiteUrl } from "../../lib/site-url.js";
import GccSeoIndex from "../components/GccSeoIndex.jsx";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/gccs` },
  title: "Top 100+ GCC Companies in Hyderabad (2026 List) — Global Capability Centers Directory",
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
    "global capability centers in hyderabad",
    "global capability centres in hyderabad",
    "msd gcc hyderabad",
    "hyderabad startup map",
  ],
  openGraph: {
    title: "Top 100+ GCC Companies in Hyderabad (2026 List) — Global Capability Centers Directory",
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
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What are the top GCC companies in Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Prominent Global Capability Centers (GCCs) in Hyderabad include Microsoft IDC, Google, Amazon, Wells Fargo, Goldman Sachs, JPMorgan Chase, Novartis, Sanofi, Providence, Bristol Myers Squibb (BMS), and Micron.",
          },
        },
        {
          "@type": "Question",
          name: "Where are GCCs clustered in Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The vast majority of Hyderabad's GCCs are located in Salarpuria Sattva Knowledge City (Raidurgam), HITEC City (Mindspace), Gachibowli (DLF & Phoenix), and Financial District (WaveRock).",
          },
        },
        {
          "@type": "Question",
          name: "How many GCCs operate in Hyderabad?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Hyderabad is home to over 250+ active Global Capability Centers employing more than 200,000 technology and business professionals.",
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
      {/* Server-rendered GCC list + crawl links — the client page ships an
          empty shell, this gives Googlebot real HTML for "GCC companies in
          Hyderabad". Normal scrolling page, no :has() workaround needed. */}
      <GccSeoIndex />
    </>
  );
}
