import HomeClient from "./HomeClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const startups = await getPublicStartups();
  return <HomeClient initialStartups={startups} />;
}
