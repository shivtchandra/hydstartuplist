import Link from "next/link";
import SiteNav from "../components/SiteNav.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export const metadata = { title: "Explore more of Hyderabad | Mapping HYD" };

export default function MorePage() {
  const links = [
    ["/?view=companies", "All companies"],
    ["/areas", "Tech areas"],
    ["/industries", "Industries"],
    ["/gccs", "Global capability centres"],
    ["/feed", "Company feed"],
    ["/news", "News"],
    ["/stories", "Stories"],
    ["/insights", "Ecosystem insights"],
    ["/newsletter", "Newsletter"],
    ["/submit", "Submit a company"],
  ];
  return (
    <>
      <SiteNav />
      <main className="op-shell">
        <h1>More of Hyderabad.</h1>
        <p>Explore the companies and stories behind the opportunities.</p>
        <div className="op-saved-searches">
          {links.map(([url, label]) => (
            <p key={url}>
              <Link href={url}>{label} ↗</Link>
            </p>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
