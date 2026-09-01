import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/news` },

  title: "Hyderabad Startup News – Funding, Launches & Ecosystem Updates",
  description: "Latest startup news from Hyderabad — funding rounds, product launches, and ecosystem highlights.",
};

export default function Layout({ children }) {
  return children;
}
