import { getSiteUrl } from "../../lib/site-url.js";
import GccSeoIndex from "../components/GccSeoIndex.jsx";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/gccs` },

  title: "GCC Companies in Hyderabad — Global Capability Centres Directory",
  description:
    "Directory of GCC companies in Hyderabad — Global Capability Centres running engineering, product and operations from HITEC City and Gachibowli. Filter by industry and find careers pages.",
};

export default function Layout({ children }) {
  return (
    <>
      {children}
      {/* Server-rendered GCC list + crawl links — the client page ships an
          empty shell, this gives Googlebot real HTML for "GCC companies in
          Hyderabad". Normal scrolling page, no :has() workaround needed. */}
      <GccSeoIndex />
    </>
  );
}
