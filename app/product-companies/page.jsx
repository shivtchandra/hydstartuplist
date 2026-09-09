import SiteNav from "../components/SiteNav.jsx";
import ProductCompaniesClient from "../components/ProductCompaniesClient.jsx";
import { getApproved, visibleHiring } from "../../lib/store.js";
import { startupSlug } from "../../lib/slug.js";

export const revalidate = 86400;

export default async function ProductCompaniesPage() {
  const all = (await getApproved()).filter((s) => s.active !== false && s.name);
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

  return (
    <div className="page-with-nav">
      <SiteNav active="" />
      <div className="feed-page">
        <ProductCompaniesClient startups={startups} />
      </div>
</div>
  );
}
