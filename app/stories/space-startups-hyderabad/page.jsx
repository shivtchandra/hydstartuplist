import Link from "next/link";
import { getSiteUrl } from "../../../lib/site-url.js";
import { articleJsonLd } from "../../../lib/jobs-seo.js";
import SiteNav from "../../components/SiteNav.jsx";

const SLUG = "space-startups-hyderabad";
const TITLE = "Space startups in Hyderabad: launch, satellites, and the city’s aerospace map";
const DESCRIPTION =
  "A map-based look at Hyderabad’s space and aerospace startups — Skyroot, Dhruva Space, Cosmoserve, JEH, Raghu Vamsi, Apollo Micro Systems — plus drone and counter-UAS companies in the same deeptech cluster.";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/stories/${SLUG}` },
  title: `${TITLE} | Hyderabad Startup Map`,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "article",
    url: `${getSiteUrl()}/stories/${SLUG}`,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const COMPANIES = [
  {
    id: "69202061-81b2-4f20-8e6b-00d43ed8f311",
    name: "Skyroot Aerospace",
    area: "Shamshabad",
    line: "Private aerospace company building orbital-class launch vehicles.",
    angle: "Launch vehicles",
  },
  {
    id: "9d051ab6-67fd-4c4c-a31e-ec952ca7d636",
    name: "Dhruva Space",
    area: "Begumpet",
    line: "Satellite and space technology manufacturer.",
    angle: "Satellites & platforms",
  },
  {
    id: "7a67e031-fb8b-4ad0-a5b9-13a2119fcd0b",
    name: "Cosmoserve Space",
    area: "Madhapur (T-Hub)",
    line: "Space sustainability — active debris removal and in-orbit servicing tech.",
    angle: "In-orbit servicing",
  },
  {
    id: "e8d2551b-4093-4b99-b129-76518b8c34ff",
    name: "JEH Aerospace",
    area: "Hyderabad",
    line: "Aerospace and defense precision manufacturing.",
    angle: "Precision manufacturing",
  },
  {
    id: "6b025a05-9db3-4730-9584-9f1b7a06179a",
    name: "Raghu Vamsi Aerospace Group",
    area: "Kukatpally",
    line: "Aerospace and defense manufacturing group.",
    angle: "Aero structures & manufacturing",
  },
  {
    id: "fb5fd7a4-e468-46f0-9c9c-bbd1c4e7750d",
    name: "Apollo Micro Systems",
    area: "Secunderabad",
    line: "Defense and aerospace electronic systems manufacturer.",
    angle: "Avionics & electronics",
  },
];

const ADJACENT = [
  {
    id: "079b948f-ff87-41a7-89af-1295ede5820e",
    name: "Indrajaal",
    area: "Somajiguda",
    line: "Autonomous wide-area anti-drone defense systems.",
  },
  {
    id: "2a0e9715-21af-43d9-89ff-f2ff7ee4fee5",
    name: "MARUT Drones",
    area: "Madhapur",
    line: "Agricultural and industrial drone manufacturer.",
  },
];

export default function SpaceStartupsHyderabadStory() {
  const pageUrl = `${getSiteUrl()}/stories/${SLUG}`;
  const published = "2026-09-04";
  const jsonLd = articleJsonLd({
    title: TITLE,
    description: DESCRIPTION,
    url: pageUrl,
    datePublished: published,
    dateModified: published,
  });

  return (
    <div className="page-with-nav">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav active="stories" />
      <article className="story-page">
        <p className="story-kicker">
          <Link href="/stories">Stories</Link> · Deeptech
        </p>
        <h1>{TITLE}</h1>
        <p className="story-lede">
          Hyderabad&apos;s deeptech map is not only SaaS and biotech. A real{" "}
          <strong>space and aerospace stack</strong> sits across Shamshabad, Begumpet, Kukatpally,
          Secunderabad, and Madhapur — from orbital launch to satellites, manufacturing, and
          in-orbit servicing — with drone and counter-UAS companies in the same talent pool.
        </p>
        <p className="story-meta">
          September 2026 · Based on companies tracked on the{" "}
          <Link href="/">Hyderabad Startup Map</Link>
        </p>

        <div className="story-body">
          <h2>Why Hyderabad shows up in space</h2>
          <p>
            The city already had aerospace manufacturing, defense electronics, and a large engineer
            base. Private space policy opened a second wave: startups that design launchers and
            satellites, plus firms that machine hardware and fly autonomy closer to Earth. On our
            map, the clearest cluster is{" "}
            <Link href="/jobs/sector/deeptech">Deeptech</Link> companies whose products literally
            leave the atmosphere — or enable the missions that do.
          </p>

          <div className="story-callout">
            This piece only names companies we already track on the map. It is a field guide to the
            Hyd space stack as mapped today — not a complete national census.
          </div>

          <h2>The stack, company by company</h2>
          <ol>
            {COMPANIES.map((c) => (
              <li key={c.id} style={{ marginBottom: 14 }}>
                <strong>
                  <Link href={`/startups/${c.id}`}>{c.name}</Link>
                </strong>{" "}
                <span style={{ opacity: 0.75 }}>({c.angle} · {c.area})</span>
                <br />
                {c.line}{" "}
                <Link href={`/startups/${c.id}`}>View on the map →</Link>
              </li>
            ))}
          </ol>

          <h2>Launch: Skyroot Aerospace</h2>
          <p>
            <Link href="/startups/69202061-81b2-4f20-8e6b-00d43ed8f311">Skyroot Aerospace</Link>,
            based around Shamshabad, is the headline private launcher from Hyderabad — building
            orbital-class vehicles and often cited as India&apos;s first private space-tech unicorn
            in national coverage. On the map it also shows active hiring (cryogenic propulsion and
            related engineering roles have appeared in our syncs), which is a practical signal that
            the build-out is still underway.
          </p>

          <h2>Satellites: Dhruva Space</h2>
          <p>
            <Link href="/startups/9d051ab6-67fd-4c4c-a31e-ec952ca7d636">Dhruva Space</Link> in
            Begumpet sits on the other side of the stack: satellite and space technology hardware.
            Recent map-linked news includes an ICEYE collaboration and a maiden raise from Antariksh
            Venture Capital Fund — typical of Hyd firms that sell platforms and payloads into a
            growing domestic and export market.
          </p>

          <h2>Sustainability: Cosmoserve Space</h2>
          <p>
            <Link href="/startups/7a67e031-fb8b-4ad0-a5b9-13a2119fcd0b">Cosmoserve Space</Link> is a
            newer Madhapur / T-Hub company focused on active debris removal and in-orbit servicing.
            It fills a gap the launcher and sat makers do not: what happens after launch, when
            orbits get crowded. Founded in 2024 on our records, it is the clearest “space
            sustainability” name currently on the Hyd map.
          </p>

          <h2>Manufacturing and electronics</h2>
          <p>
            Orbit needs factories and boards, not only press releases.{" "}
            <Link href="/startups/e8d2551b-4093-4b99-b129-76518b8c34ff">JEH Aerospace</Link> does
            precision aero/defense manufacturing;{" "}
            <Link href="/startups/6b025a05-9db3-4730-9584-9f1b7a06179a">
              Raghu Vamsi Aerospace Group
            </Link>{" "}
            in Kukatpally is a larger manufacturing group (including a widely reported ~$40M raise);
            and{" "}
            <Link href="/startups/fb5fd7a4-e468-46f0-9c9c-bbd1c4e7750d">Apollo Micro Systems</Link>{" "}
            in Secunderabad builds defense and aerospace electronics. Together they are why Hyd can
            support hardware-heavy space companies without importing every subsystem.
          </p>

          <h2>Adjacent aerial layer: drones and counter-UAS</h2>
          <p>
            Not every “space-adjacent” company flies to orbit. Two mapped deeptech firms share the
            same sensors, RF, and autonomy talent:
          </p>
          <ul>
            {ADJACENT.map((c) => (
              <li key={c.id}>
                <Link href={`/startups/${c.id}`}>{c.name}</Link> ({c.area}) — {c.line}
              </li>
            ))}
          </ul>
          <p>
            <Link href="/startups/079b948f-ff87-41a7-89af-1295ede5820e">Indrajaal</Link> has been
            among the more active hirers in our careers sync;{" "}
            <Link href="/startups/2a0e9715-21af-43d9-89ff-f2ff7ee4fee5">MARUT Drones</Link> spans
            agri and industrial UAVs. Treat them as the atmospheric layer next to the orbital one —
            useful when reading Hyd deeptech as a whole, not as a pure “space unicorn” story.
          </p>

          <h2>Where to explore next</h2>
          <ul>
            <li>
              <Link href="/">Hyderabad Startup Map</Link> — find these companies on the city map
            </li>
            <li>
              <Link href="/jobs/sector/deeptech">Deeptech jobs in Hyderabad</Link> — open roles in
              the same sector
            </li>
            <li>
              <Link href="/jobs">All Hyd startup jobs</Link> — ATS + careers + licensed listings
            </li>
            <li>
              <Link href="/news">News feed</Link> — recent coverage attached to mapped companies
            </li>
          </ul>

          <div className="story-callout">
            Know a Hyderabad space or aerospace company we are missing?{" "}
            <Link href="/submit">Submit it to the map</Link> so the next update of this story can
            include them.
          </div>
        </div>
      </article>
    </div>
  );
}
