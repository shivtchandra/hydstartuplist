import NewsClient from "./NewsClient.jsx";
import { getNewsFeed } from "../../lib/news.js";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const items = await getNewsFeed();
  return <NewsClient initialItems={items} />;
}
