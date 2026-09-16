import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  title: "Submit a Startup | Mapping HYD",
  description: "Submit a new startup, office location, or job board to the Hyderabad Startup Map.",
  alternates: { canonical: `${getSiteUrl()}/submit` },
};

export default function SubmitLayout({ children }) {
  return children;
}
