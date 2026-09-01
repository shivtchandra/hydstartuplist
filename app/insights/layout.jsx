import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/insights` },

  title: "Hyderabad Startup Insights – Trends, Sectors & Funding Data",
  description: "Data-driven insights into the Hyderabad startup ecosystem — sector breakdown, funding trends, and growth.",
};

export default function Layout({ children }) {
  return children;
}
