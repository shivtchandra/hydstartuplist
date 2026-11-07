import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  title: "Submit a Startup",
  description: "Submit a new startup, office location, or job board to the Mapping HYD Hyderabad startup map.",
  alternates: { canonical: `${getSiteUrl()}/submit` },
  // A form, not a search result.
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function SubmitLayout({ children }) {
  return children;
}
