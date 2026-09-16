import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/product-companies` },
  title: "Product Based Companies in Hyderabad (2026 Directory & Map)",
  description:
    "Complete list of 1,000+ product-based companies and software startups in Hyderabad — SaaS, AI, FinTech, and DeepTech offices across HITEC City, Gachibowli, and Madhapur.",
  openGraph: {
    title: "Product Based Companies in Hyderabad (2026 Directory & Map)",
    description:
      "Explore 1,000+ software product companies and startups in Hyderabad with live office pins, funding stages, and open job roles.",
    url: `${SITE_URL}/product-companies`,
  },
};

export default function Layout({ children }) {
  return children;
}
