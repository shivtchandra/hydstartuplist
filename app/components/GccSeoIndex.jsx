// Server-rendered SEO index for the GCCs page.
//
// app/gccs/page.jsx is a client component, so the crawlable HTML ships no GCC
// company names — the same empty-shell problem the homepage had. This block
// renders the full list in the server HTML, targeting "GCC companies in
// Hyderabad" (880/mo, low competition, rising). Mirrors HomeSeoIndex.
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

function readGccs() {
  const file = path.join(process.cwd(), "data", "gccs.json");
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function safeCareers(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

export default function GccSeoIndex() {
  let gccs = [];
  try {
    gccs = readGccs();
  } catch {
    return null; // never let an SEO block break the page
  }
  if (!gccs.length) return null;

  // Group by industry, most-populated first.
  const groups = new Map();
  for (const g of gccs) {
    const key = g.industry || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }
  const byIndustry = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const total = gccs.length;

  return (
    <section className="home-seo" aria-label="GCC companies in Hyderabad">
      <div className="home-seo-inner">
        <header className="home-seo-head">
          <h1>GCC Hyderabad — Global Capability Centres</h1>
          <p>
            A directory of <strong>{total}+ GCC companies in Hyderabad</strong> — Global Capability Centres
            running engineering, product and operations out of HITEC City, Gachibowli and the Financial
            District. Browse the GCC Hyderabad list by industry and jump to careers pages.
          </p>
          <nav className="home-seo-sections" aria-label="Sections">
            <Link href="/jobs">Startup &amp; GCC Jobs</Link>
            <Link href="/">Startup Map</Link>
            <Link href="/product-companies">Product Companies</Link>
            <Link href="/insights">Ecosystem Insights</Link>
          </nav>
        </header>

        <div className="home-seo-sectors">
          {byIndustry.map(([industry, list]) => (
            <div className="home-seo-col" key={industry}>
              <h3>
                {industry} <span className="home-seo-count">{list.length}</span>
              </h3>
              <ul>
                {list.map((g) => {
                  const careers = safeCareers(g.careers);
                  return (
                    <li key={g.id}>
                      {careers ? (
                        <a href={careers} target="_blank" rel="noopener noreferrer">
                          {g.name}
                        </a>
                      ) : (
                        g.name
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="home-seo-foot">
          Hiring in Hyderabad? <Link href="/jobs">Browse open GCC &amp; startup roles →</Link>
        </p>
      </div>
    </section>
  );
}
