import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/product-companies` },
  title: "Product Companies in Hyderabad – 1,000+ Tech Startups",
  description:
    "Browse product companies in Hyderabad — startups and tech companies building their own software products. Filter by sector, funding stage, and area on an interactive map.",
  openGraph: {
    title: "Product Companies in Hyderabad | Mapping HYD",
    description:
      "1,000+ product-focused tech companies in Hyderabad — SaaS, FinTech, HealthTech, AI and more. Browse jobs and funding data.",
    url: `${SITE_URL}/product-companies`,
  },
};

export default function Layout({ children }) {
  return children;
}
