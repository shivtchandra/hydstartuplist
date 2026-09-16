import Link from "next/link";
import { getSiteUrl } from "../../../lib/site-url.js";
import { articleJsonLd } from "../../../lib/jobs-seo.js";
import SiteNav from "../../components/SiteNav.jsx";

const SLUG = "hyderabad-tech-parks-guide";
const TITLE = "The Insider's Guide to Hyderabad IT Parks & Tech Campuses (2026)";
const DESCRIPTION =
  "Everything you need to know about working in Mindspace Madhapur, Sattva Knowledge City, WaveRock SEZ, DLF Cyber City, and Cyber Towers: commute times, major employers, cafeteria culture, and tech density.";

export const metadata = {
  alternates: { canonical: `${getSiteUrl()}/stories/${SLUG}` },
  title: `${TITLE} | Mapping HYD`,
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
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav active="stories" />
      <article className="story-article">
        <header className="story-header">
          <p className="story-kicker">Campus Guide · Hyderabad 2026</p>
          <h1>{TITLE}</h1>
          <p className="story-dek">{DESCRIPTION}</p>
          <div className="story-byline">
            <span>By Mapping HYD Research</span>
            <span aria-hidden="true">·</span>
            <span>Updated September 2026</span>
            <span aria-hidden="true">·</span>
            <span>7 min read</span>
          </div>
        </header>

        <section className="story-body">
          <p>
            Whether you are relocating to Hyderabad, switching to a new product engineering role, or deciding where to
            rent an apartment, understanding the city&apos;s tech park ecosystem is essential. Hyderabad&apos;s tech landscape
            is concentrated primarily along the western corridor, but each campus has its own distinctive commute dynamics,
            employer profile, and work culture.
          </p>

          <h2>The 5 Major Tech Campuses Shaping Hyderabad Tech</h2>

          <div style={{ display: "grid", gap: "24px", margin: "24px 0" }}>
            {PARKS_DATA.map((park) => (
              <div
                key={park.name}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 750, color: "#0f172a" }}>
                    <Link href={`/parks/${park.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                      {park.name}
                    </Link>
                  </h3>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1", background: "#e0f2fe", padding: "3px 10px", borderRadius: "12px" }}>
                    {park.location}
                  </span>
                </div>

                <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#c2410c", margin: "0 0 12px" }}>
                  {park.vibe}
                </p>

                <div style={{ display: "grid", gap: "8px", fontSize: "13.5px", color: "#334155" }}>
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

                <div style={{ marginTop: "16px" }}>
                  <Link
                    href={`/parks/${park.slug}`}
                    style={{ fontSize: "13px", fontWeight: 700, color: "#ea580c", textDecoration: "none" }}
                  >
                    View Mapped Startups &amp; Jobs in {park.name} →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <h2>Commute Strategy: Where to Live Based on Your Tech Park</h2>
          <div style={{ overflowX: "auto", margin: "20px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Your Office Location</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Best Residential Neighborhoods</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Commute Mode</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>Sattva Knowledge City &amp; T-Hub</td>
                  <td style={{ padding: "12px 14px" }}>Madhapur, Durgam Cheruvu, Kondapur, Jubilee Hills</td>
                  <td style={{ padding: "12px 14px" }}>Hyderabad Metro (Blue Line to Raidurg) or 10-15 min drive</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>Mindspace Madhapur</td>
                  <td style={{ padding: "12px 14px" }}>Madhapur, Ayyappa Society, Kondapur, Gachibowli</td>
                  <td style={{ padding: "12px 14px" }}>Blue Line Metro or Cable Bridge from Central Hyd</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>WaveRock &amp; Financial District</td>
                  <td style={{ padding: "12px 14px" }}>Nanakramguda, Kokapet, Gachibowli, Tellapur</td>
                  <td style={{ padding: "12px 14px" }}>Outer Ring Road (ORR) / Personal Vehicle or Shuttle</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>DLF Cyber City &amp; Gachibowli</td>
                  <td style={{ padding: "12px 14px" }}>Gachibowli, Kondapur, Manikonda, Kothaguda</td>
                  <td style={{ padding: "12px 14px" }}>Direct bus corridors, 2-wheeler, or short auto ride</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fdba74",
              borderRadius: "12px",
              padding: "20px 24px",
              margin: "32px 0",
              textAlign: "center",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#9a3412" }}>
              Explore All Tech Parks &amp; Startups on the Map
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#7c2d12" }}>
              Search across 1,200+ startups, IT companies, and live open roles by tech corridor.
            </p>
            <Link
              href="/parks"
              style={{
                display: "inline-block",
                background: "#ea580c",
                color: "#fff",
                fontWeight: 700,
                padding: "10px 20px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Browse All Hyderabad Tech Parks →
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
