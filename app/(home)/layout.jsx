import { getSiteUrl } from "../../lib/site-url.js";
import HomeSeoIndex from "../components/HomeSeoIndex.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export const metadata = {
  alternates: { canonical: getSiteUrl() },
};

export default function HomeLayout({ children }) {
  return (
    <>
      {children}
      {/* Server-rendered content + crawl links below the map — the client map
          ships an empty shell, this gives Googlebot real HTML on the homepage. */}
      {/* @ts-expect-error Async Server Component */}
      <HomeSeoIndex />
      <SiteFooter />
    </>
  );
}
