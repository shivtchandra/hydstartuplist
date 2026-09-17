import Link from "next/link";
import { getSiteUrl } from "../../lib/site-url.js";
import SiteNav from "../components/SiteNav.jsx";

export const metadata = {
  title: "Stories | Hyderabad Startup Map",
  description:
    "Research notes on the Hyderabad startup ecosystem — funding, GCCs, deeptech, and how Hyd compares to Bengaluru.",
  alternates: { canonical: `${getSiteUrl()}/stories` },
  openGraph: {
    title: "Stories | Hyderabad Startup Map",
    description:
      "Research notes on the Hyderabad startup ecosystem — funding, GCCs, deeptech, and how Hyd compares to Bengaluru.",
    type: "website",
  },
};

const STORIES = [
  {
    href: "/stories/hyderabad-fresher-tech-hiring-guide-2026",
    title: "Hyderabad Fresher Tech Hiring & Salary Guide (2026 Edition)",
    blurb:
      "The definitive guide for freshers: salary tiers (₹3.5 LPA to ₹24+ LPA), top product companies hiring entry-level talent, off-campus tactics, and how to avoid consultancy scams.",
  },
  {
    href: "/stories/top-product-companies-hyderabad",
    title: "Top 50 Product Based Companies in Hyderabad (Tier 1 & High-Growth 2026 Guide)",
    blurb:
      "The comprehensive guide to product companies in Hyderabad: Microsoft, Google, Amazon, Darwinbox, Zenoti, Keka, Skyroot, tech stacks, salary benchmarks, and office pins.",
  },
  {
    href: "/stories/hyderabad-tech-parks-guide",
    title: "The Insider's Guide to Hyderabad IT Parks & Tech Campuses (2026)",
    blurb:
      "Everything you need to know about working in Mindspace Madhapur, Sattva Knowledge City, WaveRock SEZ, DLF Cyber City, and Cyber Towers: commute times, major employers, and food culture.",
  },
  {
    href: "/stories/space-startups-hyderabad",
    title: "Space startups in Hyderabad: launch, satellites, and the city’s aerospace map",
    blurb:
      "Skyroot, Dhruva Space, Cosmoserve, JEH, Raghu Vamsi, Apollo Micro Systems — plus drone and counter-UAS names on the same deeptech map.",
  },
  {
    href: "/stories/hyderabad-startup-hiring-report-2026",
    title: "Hyderabad startup hiring report — who's hiring in 2026",
    blurb:
      "Live snapshot of open roles across mapped Hyderabad startups: top hiring companies, sectors, and links to browse by role, area, and sector.",
  },
  {
    href: "/stories/bengaluru-vs-hyderabad-startup-limelight",
    title: "Bengaluru still owns the limelight. Hyderabad is writing a different script.",
    blurb:
      "Unicorn counts and funding totals still favor Bangalore — but H1 2026 growth, GCCs, and deeptech tell a Hyd story that isn’t “mini-Bengaluru.”",
  },
];

export default function StoriesIndex() {
  return (
    <div className="page-with-nav">
      <SiteNav active="stories" />
      <div className="stories-index">
        <p className="story-kicker">Hyderabad Startup Map</p>
        <h1>Stories</h1>
        <p className="form-sub" style={{ marginBottom: 28 }}>
          Short research pieces on the Hyderabad startup ecosystem — written to map the city, not mimic another hub.
        </p>
        {STORIES.map((s) => (
          <Link key={s.href} href={s.href} className="story-index-card">
            <h2>{s.title}</h2>
            <p>{s.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
