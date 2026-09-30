import { radarMeta } from "../../lib/radar.js";
import { getSiteUrl } from "../../lib/site-url.js";
import SiteNav from "../components/SiteNav.jsx";
import RadarClient from "./RadarClient.jsx";

export const metadata = {
  title: "Radar: Hard-to-Find Hyderabad Startups & Employers Worth Knowing",
  description:
    "A hand-picked list of Hyderabad startups and employers that are easy to miss: what they build and where to apply. Sign in free for founder links and full research briefs.",
  alternates: { canonical: `${getSiteUrl()}/radar` },
  openGraph: {
    title: "Radar: Hard-to-Find Hyderabad Startups & Employers",
    description: "A hand-picked list of Hyderabad employers that are easy to miss, researched by Mapping HYD.",
    url: `${getSiteUrl()}/radar`,
    type: "website",
  },
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
