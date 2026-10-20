import { readGccs } from "../../lib/gccs.js";
import { getSiteUrl } from "../../lib/site-url.js";

const SITE_URL = getSiteUrl();

export function generateMetadata() {
  const count = readGccs().length;
  const title = `GCC Companies in Hyderabad – Verified Directory of ${count} Employers`;
  const description = `Browse ${count} mapped Global Capability Center employers in Hyderabad with official career links and evidence-complete local profiles where verified.`;
  return {
    alternates: { canonical: `${SITE_URL}/gccs` },
    title,
    description,
    openGraph: { title, description, url: `${SITE_URL}/gccs` },
  };
}

export default function Layout({ children }) {
  return children;
}
