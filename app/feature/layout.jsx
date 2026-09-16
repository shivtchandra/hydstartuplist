import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  title: "Feature Your Startup | Mapping HYD",
  description: "Promote and feature your startup across the Hyderabad Startup Map and Job board.",
  alternates: { canonical: `${getSiteUrl()}/feature` },
};

export default function FeatureLayout({ children }) {
  return children;
}
