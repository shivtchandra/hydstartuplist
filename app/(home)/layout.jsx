import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  alternates: { canonical: getSiteUrl() },
};

export default function HomeLayout({ children }) {
  return children;
}
