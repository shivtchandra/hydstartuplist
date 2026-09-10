import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import AuthButton from "../components/AuthButton.jsx";

export const metadata = { title: "Explore more of Hyderabad | Mapping HYD" };

const FEATURED = [
  {
    href: "/jobs",
    kicker: "Hiring",
    title: "Jobs in Hyderabad",
    blurb: "Live roles across mapped startups and product companies.",
  },
  {
    href: "/?view=companies",
    kicker: "Map",
    title: "All companies",
    blurb: "The full directory — filter by sector, stage, and area.",
  },
  {
    href: "/gccs",
    kicker: "Employers",
    title: "Global capability centres",
    blurb: "Big-company Hyderabad engineering and ops hubs.",
  },
  {
    href: "/stories",
    kicker: "Read",
    title: "Stories",
    blurb: "Longer pieces on the ecosystem, hiring, and places.",
  },
  {
    href: "/radar",
    kicker: "Members",
    title: "Radar",
    blurb: "Exclusive research: founder LinkedIns, miss reasons, careers quirks. Sign in to unlock depth.",
  },
];

const STRIPS = [
  {
    title: "Places & industries",
    items: [
      ["/areas", "Tech areas"],
      ["/industries", "Industries"],
      ["/product-companies", "Product companies"],
      ["/jobs/fresher", "Fresher jobs"],
    ],
  },
  {
    title: "Signal",
    items: [
      ["/feed", "Company feed"],
      ["/news", "News"],
      ["/insights", "Ecosystem insights"],
      ["/newsletter", "Newsletter"],
    ],
  },
];

export default function MorePage() {
  return (
    <>
      <SiteNav active="more" />
      <main className="more-page">
        <div className="more-account">
          <span className="more-account-label">Account</span>
          <AuthButton />
        </div>
        <header className="more-hero">
          <p className="more-kicker">Mapping HYD</p>
          <h1>More of Hyderabad.</h1>
          <p className="more-lede">
            Beyond the map pin — hiring, capability centres, and the stories that make the city readable.
          </p>
        </header>

        <section className="more-featured" aria-label="Featured destinations">
          {FEATURED.map((f) => (
            <Link key={f.href} href={f.href} className="more-feature">
              <span className="more-feature-kicker">{f.kicker}</span>
              <span className="more-feature-title">{f.title}</span>
              <span className="more-feature-blurb">{f.blurb}</span>
              <span className="more-feature-go" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </section>

        <div className="more-strips">
          {STRIPS.map((s) => (
            <section key={s.title} className="more-strip">
              <h2>{s.title}</h2>
              <ul>
                {s.items.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="more-strip more-strip-cta">
            <h2>Contribute</h2>
            <p>Know a Hyd team that should be on the map?</p>
            <Link href="/submit" className="more-submit">
              Submit a company →
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
