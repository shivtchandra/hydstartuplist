import { unstable_cache } from "next/cache";
import HomeClient from "./HomeClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

export const revalidate = 300;

const getCachedStartups = unstable_cache(
  async () => getPublicStartups(),
  ["home-public-startups"],
  { revalidate: 300 }
);

export default async function HomePage() {
  const startups = await getCachedStartups();
  return <HomeClient initialStartups={startups} />;
}
