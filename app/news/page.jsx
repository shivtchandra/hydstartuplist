import NewsClient from "./NewsClient.jsx";
import { getNewsFeed } from "../../lib/news.js";

// The feed comes from getApproved(), tagged "startups-dynamic", so the daily
// bump-cache bust refreshes it. A 30-minute window re-rendered this page
// (~930KB) up to 48 times a day, each one a large ISR write.
export const revalidate = 86400;

// The full feed was every article for every startup with every field. Ship
// the newest items and only the fields NewsRow renders.
const MAX_ITEMS = 120;

export default async function NewsPage() {
  const feed = await getNewsFeed();
  const items = feed
    .slice(0, MAX_ITEMS)
    .map(({ url, title, source, publishedAt, companyName, website, logoUrl, sector }) => ({
      url, title, source, publishedAt, companyName, website, logoUrl, sector,
    }));
  return <NewsClient initialItems={items} />;
}
