import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import OpportunityExplorer from "../components/OpportunityExplorer.jsx";
import LandingExposure from "../components/LandingExposure.jsx";
import { searchOpportunities } from "../../lib/opportunity-store.js";
import HomeClient from "./HomeClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";
import { jobUrlId } from "../../lib/jobs-seo.js";

export const revalidate = 300;

const getCachedStartups = unstable_cache(
  async () => getPublicStartups(),
  ["home-public-startups"],
  { revalidate: 300 }
);

export default async function HomePage({ searchParams = {} }) {
  // Crawlable job URLs are /jobs/[id] — never serve unique ?job= shells on the homepage.
  if (searchParams.job) {
    redirect(`/jobs/${jobUrlId(String(searchParams.job))}`);
  }
  let control = false;
  if (process.env.LANDING_EXPERIMENT === "1") {
    control = (await headers()).get("x-hyd-landing") === "control";
  }
  if (
    searchParams.startup ||
    searchParams.view !== "jobs" ||
    process.env.LANDING_V2 === "0" ||
    (control && !searchParams.view)
  ) {
    const startups = await getCachedStartups();
    return <><LandingExposure variant="control" /><HomeClient initialStartups={startups} /></>;
  }
  const initial = await searchOpportunities(searchParams).catch(() => ({ jobs: [], total: 0, stale: true }));
  return <Suspense fallback={<p>Loading opportunities…</p>}><OpportunityExplorer initial={initial} /></Suspense>;
}
