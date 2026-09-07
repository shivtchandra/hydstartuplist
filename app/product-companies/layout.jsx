import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export const metadata = {
  alternates: { canonical: `${SITE_URL}/product-companies` },
  title: "Companies in Hyderabad – Product & Tech Startups | Mapping HYD",
  description:
    "Browse companies in Hyderabad building software products — 1,000+ startups across SaaS, FinTech, HealthTech, and AI. Filter by sector, funding, and area.",
  openGraph: {
    title: "Companies in Hyderabad | Mapping HYD",
    description:
      "1,000+ product-focused companies in Hyderabad — SaaS, FinTech, HealthTech, AI and more. Browse jobs and funding data.",
    url: `${SITE_URL}/product-companies`,
  },
};

export default function Layout({ children }) {
  return children;
}
