import Link from "next/link";
import { getSiteUrl } from "../../lib/site-url.js";
import SiteNav from "../components/SiteNav.jsx";

const DESCRIPTION =
  "Research and guides on Hyderabad's tech ecosystem: hiring data, fresher salaries, product companies, tech parks, deeptech, and how Hyderabad compares to Bengaluru.";

export const metadata = {
  title: "Stories & Research on Hyderabad's Startup Ecosystem",
  description: DESCRIPTION,
  alternates: { canonical: `${getSiteUrl()}/stories` },
  openGraph: {
    title: "Stories & Research on Hyderabad's Startup Ecosystem",
    description: DESCRIPTION,
    type: "website",
  },
};

// `live` = numbers on the page refresh from the board; `date` = first published.
const STORIES = [
  {
    href: "/stories/hyderabad-job-market-pulse-2026",
    tag: "Hiring",
    title: "Hyderabad Job Market Pulse: Who's Hiring and for What",
    blurb:
      "Role demand, experience bands, fresher scarcity and employer concentration on the live board, plus how Hyderabad compares with Bengaluru and Pune.",
    date: "2026-09-25",
    minutes: 7,
    live: true,
  },
  {
    href: "/stories/t-hub-hyderabad",
    tag: "Ecosystem",
    title: "T-Hub Hyderabad: What It Is, Where It Is, and Startups Nearby",
    blurb:
      "What T-Hub actually does, how it fits into the HITEC City–Gachibowli corridor, and how to find companies and jobs around the campus.",
    date: "2026-09-07",
    minutes: 3,
  },
  {
    href: "/stories/space-startups-hyderabad",
    tag: "Deeptech",
    title: "Space Startups in Hyderabad: Launch, Satellites and Aerospace",
    blurb:
      "Skyroot, Dhruva Space, Cosmoserve, JEH, Raghu Vamsi and Apollo Micro Systems, plus the drone and counter-UAS companies on the same deeptech map.",
    date: "2026-09-04",
    minutes: 4,
  },
  {
    href: "/stories/hyderabad-tech-parks-guide",
    tag: "Tech parks",
    title: "Hyderabad IT Parks and Tech Campuses: An Insider's Guide",
    blurb:
      "Mindspace Madhapur, Sattva Knowledge City, WaveRock SEZ, DLF Cyber City and Cyber Towers: major employers, commute options, where to live and what to eat.",
    date: "2026-04-10",
    minutes: 7,
  },
  {
    href: "/stories/hyderabad-fresher-tech-hiring-guide-2026",
    tag: "Freshers",
    title: "Hyderabad Fresher Tech Hiring and Salary Guide 2026",
    blurb:
      "College-by-college placement numbers, salary tiers from ₹3.6 LPA to ₹28 LPA+, the roles freshers actually land, off-campus tactics and how to spot consultancy scams.",
    date: "2026-03-15",
    minutes: 12,
  },
  {
    href: "/stories/top-product-companies-hyderabad",
    tag: "Companies",
    title: "Top 50 Product Companies in Hyderabad (2026)",
    blurb:
      "Microsoft, Google, Amazon, Darwinbox, Zenoti, Keka, Skyroot and more: what each Hyderabad team builds, its tech stack, salary benchmarks and office location.",
    date: "2026-03-01",
    minutes: 8,
  },
  {
    href: "/stories/hyderabad-startup-hiring-report-2026",
    tag: "Hiring",
    title: "Hyderabad Startup Hiring Report 2026",
    blurb:
      "A live snapshot of open roles at mapped Hyderabad startups: the top hiring companies and sectors, with links to browse by role, area and sector.",
    date: "2026-02-01",
    minutes: 3,
    live: true,
  },
  {
    href: "/stories/bengaluru-vs-hyderabad-startup-limelight",
    tag: "Analysis",
    title: "Bengaluru vs Hyderabad: Why Hyd Is Writing a Different Script",
    blurb:
      "Bengaluru still leads on unicorns and funding totals, but H1 2026 growth, GCCs and deeptech show Hyderabad is not a mini-Bengaluru.",
    minutes: 4,
  },
];

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StoriesIndex() {
  return (
    <div className="page-with-nav">
      <SiteNav active="stories" />
      <div className="stories-index">
        <p className="story-kicker">Hyderabad Startup Map</p>
        <h1>Stories &amp; research</h1>
        <p className="stories-index-sub">
          Data-backed guides to Hyderabad&apos;s tech ecosystem, written to map the city, not to copy another hub.
        </p>

        <Link href="/hyderabad-tech-statistics" className="stories-featured">
          <span className="stories-featured-badge">
            <span className="stories-live-dot" aria-hidden="true" /> Live data · Updated daily
          </span>
          <h2>Hyderabad Tech Statistics 2026</h2>
          <p>
            Startups by sector, stage and area, GCC count, hiring share and open roles by level. One citable page,
            with methodology.
          </p>
          <span className="stories-featured-cta">See the numbers →</span>
        </Link>

        <div className="stories-grid">
          {STORIES.map((s) => (
            <Link key={s.href} href={s.href} className="story-index-card">
              <span className="story-index-tag">{s.tag}</span>
              <h2>{s.title}</h2>
              <p>{s.blurb}</p>
              <span className="story-index-meta">
                {s.live ? (
                  <span className="story-index-live">
                    <span className="stories-live-dot" aria-hidden="true" /> Live
                  </span>
                ) : null}
                {s.date ? <time dateTime={s.date}>{fmtDate(s.date)}</time> : null}
                <span>{s.minutes} min read</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
