import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { Suspense } from "react";
import OpportunityExplorer from "../components/OpportunityExplorer.jsx";
import LandingExposure from "../components/LandingExposure.jsx";
import { searchOpportunities } from "../../lib/opportunity-store.js";
import HomeClient from "./HomeClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

export const dynamic = "force-dynamic";

const getCachedStartups = unstable_cache(
  async () => getPublicStartups(),
  ["home-public-startups"],
  { revalidate: 300 }
);

export default async function HomePage({ searchParams = {} }) {
  const control = process.env.LANDING_EXPERIMENT === "1" && headers().get("x-hyd-landing") === "control";
  if (searchParams.startup || (!searchParams.job && searchParams.view !== "jobs") || process.env.LANDING_V2 === "0" || (control && !searchParams.view && !searchParams.job)) {
    const startups = await getCachedStartups();
    return <><LandingExposure variant="control" /><HomeClient initialStartups={startups} /></>;
  }
  const initial = await searchOpportunities(searchParams).catch(() => ({ jobs: [], total: 0, stale: true }));
  return <Suspense fallback={<p>Loading opportunities…</p>}><OpportunityExplorer initial={initial} /></Suspense>;
}
