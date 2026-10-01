import Link from "next/link";
import { getSiteUrl } from "../../../lib/site-url.js";
import { articleJsonLd } from "../../../lib/jobs-seo.js";
import ArticleShell from "../../components/ArticleShell.jsx";

const SLUG = "hyderabad-tech-parks-guide";
const TITLE = "The Insider's Guide to Hyderabad IT Parks & Tech Campuses (2026)";
const DESCRIPTION =
  "Everything you need to know about working in Mindspace Madhapur, Sattva Knowledge City, WaveRock SEZ, DLF Cyber City, and Cyber Towers: commute times, major employers, cafeteria culture, and tech density.";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/stories/${SLUG}` },
  title: `${TITLE}`,
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

const PARKS_DATA = [
  {
    name: "Sattva Knowledge City",
    location: "Raidurgam (Terminal of Blue Line Metro)",
    vibe: "Ultra-modern, LEED Platinum, high-salary tech & AI epicenter",
    tenants: "Microsoft, Lloyds Technology Centre, ServiceNow, AMD, T-Hub 2.0, DXC Technology",
    commute: "Direct air-conditioned skywalk connected straight into Raidurg Metro Station. Minimal road traffic friction.",
    food: "Extensive premium food court (Knowledge City Hub), multi-cuisine cafes, Starbucks, and walking distance to Inorbit / Ikea.",
    slug: "sattva-knowledge-city",
  },
  {
    name: "Mindspace Madhapur",
    location: "Madhapur (Heart of HITEC City)",
    vibe: "Massive 110-acre established business township with sports arenas and open plazas",
    tenants: "Amazon, Qualcomm, Accenture, Cognizant, Novartis, Deloitte, B2B SaaS builders",
    commute: "Raidurg and Durgam Cheruvu Metro stations. Quick access via the Durgam Cheruvu Cable Bridge from Jubilee Hills.",
    food: "Multiple multi-building cafeterias, The Hub dining zone, and hundreds of street-food / restaurant options right outside gates.",
    slug: "mindspace-madhapur",
  },
  {
    name: "WaveRock SEZ",
    location: "Nanakramguda / Financial District",
    vibe: "Grade-A institutional SEZ campus with Fortune 500 tech and financial powerhouses",
    tenants: "Apple, GAP Inc., Development Bank of Singapore (DBS), DuPont, Accenture, TCS",
    commute: "Direct access from Outer Ring Road (ORR Exit 1). Best accessed via personal vehicle, carpools, or campus feeder shuttles.",
    food: "Central multi-level food atrium inside the building with international food chains and corporate dining setups.",
    slug: "waverock-sez",
  },
  {
    name: "DLF Cyber City",
    location: "Gachibowli",
    vibe: "High-density software and product campus bridging Gachibowli with HITEC City",
    tenants: "Microsoft R&D, Barclays, Cognizant, Ericsson, Capgemini, Keka HR",
    commute: "Located on Gachibowli main road, easy connection to ORR and 5 minutes from Raidurg.",
    food: "DLF Street Food Lane right outside the gate is legendary in Hyderabad for evening bites, alongside organized campus cafeterias.",
    slug: "dlf-cyber-city",
  },
  {
    name: "Cyber Towers & Cyber Gateway",
    location: "HITEC City Junction",
    vibe: "Historic landmark quadrangle with dense IT service and digital tech agency presence",
    tenants: "L&T Infotech, TCS, Oracle, Cyient, and dozens of tech consultancies",
    commute: "Steps away from HITEC City Metro Station (Blue Line) — the single most accessible public transit point in the cyber belt.",
    food: "Shilparamam night food street, Cyber Pearl food court, and countless restaurants within a 200m radius.",
    slug: "cyber-towers",
  },
];

export default function TechParksGuidePage() {
  const jsonLd = articleJsonLd({
    title: TITLE,
    description: DESCRIPTION,
    url: `${getSiteUrl()}/stories/${SLUG}`,
    datePublished: "2026-04-10",
    dateModified: "2026-09-17",
  });

  return (
    <ArticleShell
      kicker={<><Link href="/stories">Stories</Link> · Tech parks</>}
      title={TITLE}
      lede={DESCRIPTION}
      meta={["By Mapping HYD Research", "Updated September 2026", "7 min read"]}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="story-body">
          <p>
            Whether you are relocating to Hyderabad, switching to a new product engineering role, or deciding where to
            rent an apartment, understanding the city&apos;s tech park ecosystem is essential. Hyderabad&apos;s tech landscape
            is concentrated primarily along the western corridor, from <Link href="/areas/madhapur">Madhapur</Link> and{" "}
            <Link href="/areas/hitec-city">HITEC City</Link> down to <Link href="/areas/gachibowli">Gachibowli</Link> and
            the <Link href="/areas/financial-district">Financial District</Link>, but each campus has its own distinctive
            commute dynamics, employer profile, and work culture. For how many startups sit in each neighbourhood, see the{" "}
            <Link href="/hyderabad-tech-statistics">Hyderabad tech statistics</Link>.
          </p>

          <h2>The 5 Major Tech Campuses Shaping Hyderabad Tech</h2>

          <div className="story-cards">
            {PARKS_DATA.map((park) => (
              <div
                key={park.name}
              >
                <div className="story-card-head">
                  <h3 className="story-card-title">
                    <Link href={`/parks/${park.slug}`}>
                      {park.name}
                    </Link>
                  </h3>
                  <span className="ui-badge">
                    {park.location}
                  </span>
                </div>

                <p className="story-card-kicker">
                  {park.vibe}
                </p>

                <div className="story-card-facts">
                  <div>
                    <strong>Key Employers &amp; Startups:</strong> {park.tenants}
                  </div>
                  <div>
                    <strong>Commute &amp; Metro:</strong> {park.commute}
                  </div>
                  <div>
                    <strong>Food &amp; Lifestyle:</strong> {park.food}
                  </div>
                </div>

                <div className="story-card-foot">
                  <Link
                    href={`/parks/${park.slug}`}
                    className="story-card-link"
                  >
                    View Mapped Startups &amp; Jobs in {park.name} →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <h2>Commute Strategy: Where to Live Based on Your Tech Park</h2>
          <div className="story-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Your Office Location</th>
                  <th>Best Residential Neighborhoods</th>
                  <th>Commute Mode</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sattva Knowledge City &amp; T-Hub</td>
                  <td><Link href="/areas/madhapur">Madhapur</Link>, Durgam Cheruvu, <Link href="/areas/kondapur">Kondapur</Link>, <Link href="/areas/jubilee-hills">Jubilee Hills</Link></td>
                  <td>Hyderabad Metro (Blue Line to Raidurg) or 10-15 min drive</td>
                </tr>
                <tr>
                  <td>Mindspace Madhapur</td>
                  <td>Madhapur, Ayyappa Society, Kondapur, Gachibowli</td>
                  <td>Blue Line Metro or Cable Bridge from Central Hyd</td>
                </tr>
                <tr>
                  <td>WaveRock &amp; Financial District</td>
                  <td><Link href="/areas/nanakramguda">Nanakramguda</Link>, Kokapet, Gachibowli, Tellapur</td>
                  <td>Outer Ring Road (ORR) / Personal Vehicle or Shuttle</td>
                </tr>
                <tr>
                  <td>DLF Cyber City &amp; Gachibowli</td>
                  <td>Gachibowli, Kondapur, Manikonda, Kothaguda</td>
                  <td>Direct bus corridors, 2-wheeler, or short auto ride</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className="story-cta"
          >
            <h3>
              Explore All Tech Parks &amp; Startups on the Map
            </h3>
            <p>
              Search across 1,200+ startups, IT companies, and live open roles by tech corridor.
            </p>
            <Link
              href="/parks"
              className="ui-btn ui-btn--primary"
            >
              Browse All Hyderabad Tech Parks →
            </Link>
          </div>
        </section>
      </ArticleShell>
  );
}
