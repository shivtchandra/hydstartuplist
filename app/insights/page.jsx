import InsightsClient from "./InsightsClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

// getPublicStartups() is tagged "startups-dynamic", so the daily bump-cache
// bust refreshes this page. Hourly re-renders of a ~1.2MB page were large
// ISR writes for data that changes about once a day.
export const revalidate = 86400;

export default async function InsightsPage() {
  const startups = await getPublicStartups();
  // InsightsClient only aggregates these four fields; shipping the full public
  // list (~1,200 startups with every field) made the page ~1.2MB.
  const slim = startups.map((s) => ({
    sector: s.sector,
    area: s.area,
    fundingStage: s.fundingStage,
    hiring: s.hiring ? true : undefined,
  }));
  return <InsightsClient initialStartups={slim} />;
}
