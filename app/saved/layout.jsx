import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  title: "Saved Startups & Opportunities | Mapping HYD",
  description: "View your saved startups, bookmarks, and job opportunities on Mapping HYD.",
  alternates: { canonical: `${getSiteUrl()}/saved` },
  robots: { index: false, follow: true },
};

export default function SavedLayout({ children }) {
  return children;
}
