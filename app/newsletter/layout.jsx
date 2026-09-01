import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  title: "Newsletter – Hyderabad Startup Map",
  description: "Get notified about new Hyderabad startups, funding rounds, and open roles.",
  alternates: { canonical: `${getSiteUrl()}/newsletter` },
};

export default function NewsletterLayout({ children }) {
  return children;
}
