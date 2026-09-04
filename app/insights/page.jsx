import InsightsClient from "./InsightsClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const startups = await getPublicStartups();
  return <InsightsClient initialStartups={startups} />;
}
