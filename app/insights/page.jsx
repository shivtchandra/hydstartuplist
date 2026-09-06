import InsightsClient from "./InsightsClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

export const revalidate = 3600;

export default async function InsightsPage() {
  const startups = await getPublicStartups();
  return <InsightsClient initialStartups={startups} />;
}
