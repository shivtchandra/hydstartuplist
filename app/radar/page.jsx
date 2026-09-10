import { radarMeta } from "../../lib/radar.js";
import { getSiteUrl } from "../../lib/site-url.js";
import SiteNav from "../components/SiteNav.jsx";
import RadarClient from "./RadarClient.jsx";

export const metadata = {
  title: "Radar — curated hard-to-find employers | Mapping HYD",
  description:
    "Login-gated research on hard-to-find Hyderabad employers: founder LinkedIns, why they’re missed, and careers quirks. Map and jobs stay free.",
  alternates: { canonical: `${getSiteUrl()}/radar` },
  robots: { index: false, follow: true },
};

export default function RadarPage() {
  const meta = radarMeta("hyd");
  return (
    <>
      <SiteNav active="radar" />
      <RadarClient
        initialMeta={{
          updatedAt: meta.updatedAt,
          headline: meta.headline || "Radar",
          blurb:
            meta.blurb ||
            "Hand-picked hard-to-find employers — not an Inc42/Greenhouse scrape.",
          exclusiveList: meta.exclusiveList,
          depthEnriched: meta.depthEnriched,
        }}
      />
    </>
  );
}
