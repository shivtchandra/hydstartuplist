import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";

export const metadata = { title: "Explore more of Hyderabad | Mapping HYD" };

const GROUPS = [
  {
    title: "Directory",
    links: [
      ["/?view=companies", "All companies"],
      ["/areas", "Tech areas"],
      ["/industries", "Industries"],
      ["/gccs", "Global capability centres"],
      ["/product-companies", "Product companies"],
    ],
  },
  {
    title: "Hiring",
    links: [
      ["/jobs", "Jobs in Hyderabad"],
      ["/jobs/fresher", "Fresher jobs"],
      ["/saved", "Saved roles"],
    ],
  },
  {
    title: "Stories & signal",
    links: [
      ["/feed", "Company feed"],
      ["/news", "News"],
      ["/stories", "Stories"],
      ["/insights", "Ecosystem insights"],
      ["/newsletter", "Newsletter"],
    ],
  },
  {
    title: "Contribute",
    links: [["/submit", "Submit a company"]],
  },
];

export default function MorePage() {
  return (
    <>
      <SiteNav active="more" />
      <main className="more-page">
        <header className="more-hero">
          <h1>More of Hyderabad.</h1>
          <p>Companies, hiring, and stories behind the map — one place to keep exploring.</p>
        </header>
        <div className="more-grid">
          {GROUPS.map((g) => (
            <section key={g.title} className="more-col">
              <h2>{g.title}</h2>
              <ul>
                {g.links.map(([url, label]) => (
                  <li key={url}>
                    <Link href={url}>{label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
