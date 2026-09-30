import Link from "next/link";
import { getEcosystemStats } from "../../lib/ecosystem-stats.js";
import { getSiteUrl } from "../../lib/site-url.js";
import SiteNav from "../components/SiteNav.jsx";

export const revalidate = 86400;

// Founders, mirrored from https://mapmyhyd.com/about (mapping-hyd-hub).
const FOUNDERS = [
  {
    id: "founder",
    name: "Shiva Chandra Takkelapati",
    role: "Founder · Engineering & Cartography",
    bio: "Grew up in Hyderabad. Built the original startup map and engineers the data pipelines, ATS syncs and map stack.",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/shiva-chandra-takkelapati-10ba3032b/" },
      { label: "tekkdevv", href: "https://www.tekkdevv.com/" },
      { label: "GitHub", href: "https://github.com/shivtchandra" },
    ],
  },
  {
    id: "cofounder",
    name: "Nitya Boyapati",
    role: "Cofounder · Design & Curation",
    bio: "Leads editorial research, curation and design systems across Mapping HYD.",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/nitya-boyapati/" }],
  },
];

const TITLE = "About Mapping HYD — Hyderabad's open startup & tech ecosystem map";
const DESCRIPTION =
  "Mapping HYD is an open map and data platform tracking verified startups, GCCs and tech parks across Hyderabad for engineers, founders, investors and recruiters. How the data is collected, verified and who builds it.";

export async function generateMetadata() {
  const url = `${getSiteUrl()}/about`;
  return {
    alternates: { canonical: url },
    title: TITLE,
    description: DESCRIPTION,
    openGraph: { title: TITLE, description: DESCRIPTION, url, type: "website" },
    twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
  };
}

export default async function AboutPage() {
  const eco = await getEcosystemStats();
  const site = getSiteUrl();
  const pageUrl = `${site}/about`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: TITLE,
        description: DESCRIPTION,
        mainEntity: { "@id": `${site}/#organization` },
      },
      ...FOUNDERS.map((f) => ({
        "@type": "Person",
        "@id": `${site}/#${f.id}`,
        name: f.name,
        jobTitle: f.role,
        description: f.bio,
        worksFor: { "@id": `${site}/#organization` },
        sameAs: f.links.map((l) => l.href),
      })),
    ],
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <article className="story-page">
        <p className="story-kicker">About</p>
        <h1>About Mapping HYD</h1>
        <p className="story-lede">
          Mapping HYD is an open map and data platform tracking{" "}
          <strong>{eco.totalStartups.toLocaleString()} reviewed startups and software companies</strong>,{" "}
          <strong>{eco.totalGccs} GCCs</strong> and <strong>{eco.techParks} tech parks</strong> across Hyderabad,
          built for engineers, founders, investors and recruiters.
        </p>

        <div className="story-body">
          <h2>What Mapping HYD does</h2>
          <p>
            Mapping HYD puts every tech company in Hyderabad on one <Link href="/">interactive map</Link>, with each
            office pinned to its real location. Companies are added by founders through{" "}
            <Link href="/submit">the submission form</Link> and by manual research, and every entry is reviewed before
            it goes live. Open roles are pulled straight from employer applicant tracking systems (Greenhouse, Lever,
            Ashby, Workday, SmartRecruiters, Workable, Recruitee) and career pages, then deduplicated into the{" "}
            <Link href="/jobs">Hyderabad jobs board</Link>. The aggregate numbers are published on{" "}
            <Link href="/hyderabad-tech-statistics">Hyderabad tech statistics</Link>.
          </p>

          <h2>What makes it different</h2>
          <ul>
            <li>
              <strong>Real coordinates.</strong> Every company is pinned to its office, so you can see who works in{" "}
              <Link href="/areas/hitec-city">HITEC City</Link> versus{" "}
              <Link href="/areas/gachibowli">Gachibowli</Link>.
            </li>
            <li>
              <strong>Direct employer links.</strong> Every job links to the company&apos;s own careers page or ATS.
              No recruiters or middlemen in between.
            </li>
            <li>
              <strong>Park-level data.</strong> Tenant lists for campuses like{" "}
              <Link href="/parks/mindspace-madhapur">Mindspace Madhapur</Link> and the other{" "}
              <Link href="/parks">Hyderabad tech parks</Link>.
            </li>
            <li>
              <strong>Hiring signals, updated daily.</strong> {eco.hiringPct}% of mapped startups currently show a live
              hiring signal.
            </li>
          </ul>

          <h2>Who uses Mapping HYD</h2>
          <ul>
            <li>
              <strong>Job seekers and freshers</strong> looking for product companies near home, via the{" "}
              <Link href="/jobs/fresher">fresher jobs board</Link>.
            </li>
            <li>
              <strong>Founders</strong> scouting neighbours, talent pools and office locations.
            </li>
            <li>
              <strong>Investors and analysts</strong> sizing sectors and stages, such as{" "}
              <Link href="/stage/unicorns">Hyderabad unicorns</Link>.
            </li>
            <li>
              <strong>Recruiters and GCC leaders</strong> benchmarking the{" "}
              <Link href="/gccs">GCC landscape</Link> and{" "}
              <Link href="/product-companies">product companies</Link>.
            </li>
            <li>
              <strong>Students and placement cells</strong> checking which companies are hiring from their campus via{" "}
              <Link href="/colleges">college pages</Link>.
            </li>
          </ul>

          <h2>The team behind it</h2>
          <p>
            Mapping HYD is built by two Hyderabad locals and is part of the wider{" "}
            <a href="https://mapmyhyd.com/about">Mapping HYD</a> project, which maps the city one category at a time.
            The mission: make Hyderabad&apos;s tech ecosystem as easy to see as its skyline.
          </p>
          {FOUNDERS.map((f) => (
            <div key={f.id}>
              <h3>{f.name}</h3>
              <p>
                <strong>{f.role}.</strong> {f.bio}{" "}
                {f.links.map((l, i) => (
                  <span key={l.label}>
                    {i > 0 && " · "}
                    <a href={l.href} rel="me noopener" target="_blank">
                      {l.label}
                    </a>
                  </span>
                ))}
              </p>
            </div>
          ))}

          <div className="story-callout">
            Spotted a wrong pin or a missing company? <Link href="/submit">Submit or correct a listing</Link>. Press
            and researchers can cite <Link href="/hyderabad-tech-statistics">our statistics page</Link> freely with
            attribution.
          </div>
        </div>
      </article>
    </div>
  );
}
