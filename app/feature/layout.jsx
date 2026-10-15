import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  title: "Feature Your Startup",
  description: "Promote and feature your startup across the Mapping HYD startup map and job board.",
  alternates: { canonical: `${getSiteUrl()}/feature` },
};

export default function FeatureLayout({ children }) {
  return children;
}
