import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";

export const metadata = {
  title: "Stories | Hyderabad Startup Map",
  description:
    "Research notes on the Hyderabad startup ecosystem — funding, GCCs, deeptech, and how Hyd compares to Bengaluru.",
  openGraph: {
    title: "Stories | Hyderabad Startup Map",
    description:
      "Research notes on the Hyderabad startup ecosystem — funding, GCCs, deeptech, and how Hyd compares to Bengaluru.",
    type: "website",
  },
};

const STORIES = [
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
