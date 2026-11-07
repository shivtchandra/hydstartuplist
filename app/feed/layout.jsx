import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/feed` },
  // Client-rendered feed; the static HTML is near empty.
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },

  title: "Startup Activity Feed – Latest Hyderabad Startup Updates",
  description: "Real-time feed of job postings, funding rounds, and news from 1,000+ startups in Hyderabad.",
};

export default function Layout({ children }) {
  return children;
}
