import SiteNav from "../components/SiteNav.jsx";
import ProductCompaniesClient from "../components/ProductCompaniesClient.jsx";
import { getApproved, visibleHiring } from "../../lib/store.js";
import { getAllJobs } from "../../lib/jobs.js";
import { startupSlug } from "../../lib/slug.js";
import { getSiteUrl } from "../../lib/site-url.js";

export const revalidate = 86400;

export default async function ProductCompaniesPage() {
  const [all, allJobs] = await Promise.all([
    getApproved().then((list) => list.filter((s) => s.active !== false && s.name)),
    getAllJobs().catch(() => []),
  ]);

  const startups = all.map((s) => ({
    id: s.id,
    name: s.name,
    slug: startupSlug(s),
    website: s.website || null,
    sector: s.sector || null,
    area: s.area || null,
    stage: s.fundingStage || s.stage || null,
    fundingStage: s.fundingStage || null,
    oneLiner: s.oneLiner || null,
    description: s.description || null,
    hiring: !!(visibleHiring(s)?.active || s.hiring),
    careers: s.careers || null,
  }));

  const startupNameSet = new Set(startups.map((s) => s.name.toLowerCase()));
  const productJobs = allJobs
    .filter((j) => j && j.company && (startupNameSet.has(j.company.toLowerCase()) || j.category === "startup"))
    .map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location || "Hyderabad",
      level: j.level || "mid",
      sector: j.sector || null,
      source: j.source || "careers",
      applyUrl: j.url || null,
      postedAt: j.postedAt || j.sourcePostedAt || null,
    }));

  // Answer-first summary from live counts.
  const tally = (key) => {
    const m = new Map();
    for (const s of startups) {
      const k = key(s);
      if (k) m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  };
  const topSectors = tally((s) => s.sector);
  const topAreas = tally((s) => {
    const a = String(s.area || "").replace(/,\s*(Hyderabad|Telangana|India)\b.*$/i, "").trim();
    return a && a.toLowerCase() !== "hyderabad" ? a : null;
  });
  const hiringCount = startups.filter((s) => s.hiring).length;
  const summary = `Hyderabad has ${startups.length.toLocaleString()} product based companies and startups on this map. ${hiringCount.toLocaleString()} are hiring now${productJobs.length ? `, with ${productJobs.length.toLocaleString()} open roles` : ""}. The biggest sectors are ${topSectors.join(", ")}, and most are based in ${topAreas.join(", ")}.`;
  const updatedAt = new Date().toISOString().slice(0, 10);
  const site = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${site}/product-companies#page`,
        url: `${site}/product-companies`,
        name: "Product Based Companies in Hyderabad",
        description: summary,
        dateModified: updatedAt,
        spatialCoverage: { "@type": "City", name: "Hyderabad" },
      },
      {
        "@type": "ItemList",
        "@id": `${site}/product-companies#companies`,
        name: "Product based companies in Hyderabad",
        numberOfItems: startups.length,
        itemListElement: startups.slice(0, 100).map((startup, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: startup.name,
          url: `${site}/startups/${startup.slug}`,
        })),
      },
    ],
  };

  return (
    <div className="page-with-nav">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav active="" />
      <div className="feed-page">
        <ProductCompaniesClient startups={startups} jobs={productJobs} summary={summary} updatedAt={updatedAt} />
      </div>
    </div>
  );
}
