import { unstable_cache } from "next/cache";
import LandingExposure from "../components/LandingExposure.jsx";
import HomeClient from "./HomeClient.jsx";
import LegacyQueryRedirect from "../components/LegacyQueryRedirect.jsx";
import { getPublicStartups } from "../../lib/startups-public.js";

// No searchParams/headers() here on purpose: reading them made this ~920KB
// page render dynamically on every visit. `?job=` and `?view=jobs` are handled
// in middleware.js; `?startup=` selection is read client-side by HomeClient.
// Freshness comes from tag busts (twice-daily bump-cache, admin revalidatePath).
export const revalidate = 86400;

const getCachedStartups = unstable_cache(
  async () => getPublicStartups(),
  ["home-public-startups"],
  { revalidate: 86400, tags: ["startups-dynamic"] }
);

export default async function HomePage() {
  const startups = await getCachedStartups();
  return <><LegacyQueryRedirect /><LandingExposure variant="control" /><HomeClient initialStartups={startups} /></>;
}
