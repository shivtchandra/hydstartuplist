import { getSiteUrl } from "../../lib/site-url.js";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/gccs` },

  title: "GCCs in Hyderabad – Global Capability Centres Directory",
  description: "Directory of Global Capability Centres operating in Hyderabad — filter by sector and headcount.",
};

export default function Layout({ children }) {
  return children;
}
