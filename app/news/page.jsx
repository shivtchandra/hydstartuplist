import NewsClient from "./NewsClient.jsx";
import { getNewsFeed } from "../../lib/news.js";

export const revalidate = 1800;

export default async function NewsPage() {
  const items = await getNewsFeed();
  return <NewsClient initialItems={items} />;
}
