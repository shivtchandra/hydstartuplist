import SiteNav from "../components/SiteNav.jsx";
import ProductCompaniesClient from "../components/ProductCompaniesClient.jsx";
import { getApproved, visibleHiring } from "../../lib/store.js";
import { getAllJobs } from "../../lib/jobs.js";
import { startupSlug } from "../../lib/slug.js";

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

  return (
    <div className="page-with-nav">
      <SiteNav active="" />
      <div className="feed-page">
        <ProductCompaniesClient startups={startups} jobs={productJobs} />
      </div>
    </div>
  );
}
