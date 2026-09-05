import HomeClient from "./HomeClient.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

export const revalidate = 300;

export default async function HomePage() {
  const startups = await getPublicStartups();
  return <HomeClient initialStartups={startups} />;
}
