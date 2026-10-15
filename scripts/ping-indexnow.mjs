// Submit sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver; Bing feeds ChatGPT search).
//
//   INDEXNOW_KEY=<key> node scripts/ping-indexnow.mjs          # read out/sitemap*.xml (after static build)
//   INDEXNOW_KEY=<key> node scripts/ping-indexnow.mjs --live   # fetch sitemaps from the live site
//   ... --startups                                             # also submit every /startups/<slug> page
//   ... --dry-run                                              # print URLs, send nothing
//
// --startups: company profiles are kept out of sitemap.xml for Google crawl
// budget (see app/sitemap.js), but Bing/IndexNow should still get them.
//
// The key must also be served at https://<host>/<key>.txt (public/<key>.txt).
import { readFile, access } from "node:fs/promises";
import path from "node:path";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://startups.mapmyhyd.com").replace(/\/$/, "");
const HOST = new URL(SITE).hostname;
const KEY = process.env.INDEXNOW_KEY;
const SITEMAPS = ["sitemap.xml", "sitemap-jobs.xml"];
const BATCH = 10000; // IndexNow max URLs per request
const live = process.argv.includes("--live");
const dryRun = process.argv.includes("--dry-run");
const root = process.cwd();

if (!KEY) {
  console.error("INDEXNOW_KEY not set");
  process.exit(1);
}
try {
  await access(path.join(root, "public", `${KEY}.txt`));
} catch {
  console.error(`public/${KEY}.txt missing — IndexNow verifies the key at ${SITE}/${KEY}.txt`);
  process.exit(1);
}

async function loadSitemap(name) {
  if (live) {
    const res = await fetch(`${SITE}/${name}`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.text();
  }
  return readFile(path.join(root, "out", name), "utf8");
}

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

const urls = new Set();
for (const name of SITEMAPS) {
  let xml;
  try {
    xml = await loadSitemap(name);
  } catch (err) {
    console.warn(`skip ${name}: ${err.message}`);
    continue;
  }
  for (const u of locs(xml)) if (new URL(u).hostname === HOST) urls.add(u);
}

if (process.argv.includes("--startups")) {
  const { startupSlug } = await import("../lib/slug.js");
  const startups = JSON.parse(await readFile(path.join(root, "data", "startups.json"), "utf8"));
  for (const s of startups) if (s.active !== false && s.name) urls.add(`${SITE}/startups/${startupSlug(s)}`);
}

const list = [...urls];
if (!list.length) {
  console.error(live ? "no URLs found in live sitemaps" : "no URLs found — run the static build first or pass --live");
  process.exit(1);
}
if (dryRun) {
  console.log(list.join("\n"));
  console.log(`\n${list.length} URLs (dry run, nothing sent)`);
  process.exit(0);
}

for (let i = 0; i < list.length; i += BATCH) {
  const urlList = list.slice(i, i + BATCH);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  });
  // 200/202 = accepted; 403 = key file not reachable yet; 422 = URLs not on host.
  console.log(`[IndexNow] ${urlList.length} URLs -> HTTP ${res.status}`);
  if (!res.ok) process.exitCode = 1;
}
