// Recent news per company, via Google News RSS — free, no API key, stable
// query URLs (unlike guessing article slugs, which 404 unpredictably).
//
// Scope: ONLY the curated/well-known companies (locSource !==
// "startupindia+places"), not the ~1,000 bulk-registry entries — many of
// those have generic single-word names (Adya, Nova, Vids) that would
// false-match unrelated news stories. Curated names are specific enough
// (Zenoti, Darwinbox, Skyroot Aerospace) that a name+"Hyderabad" query is a
// reliable match.
//
// Run: node scripts/fetch-news.mjs   (optional LIMIT=20 to sample)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");
const LIMIT = parseInt(process.env.LIMIT || "0", 10);
const UA = { "User-Agent": "Mozilla/5.0 (news-fetch)" };

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "");
}

// Google News RSS <item> blocks are consistent enough for a light regex parse
// (no extra XML-parser dependency, matches this project's lean-deps pattern).
function parseItems(xml) {
  const items = [];
  const blocks = xml.split("<item>").slice(1);
  for (const block of blocks) {
    const titleM = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkM = block.match(/<link>([\s\S]*?)<\/link>/);
    const pubM = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceM = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    if (!titleM || !linkM) continue;
    items.push({
      title: decodeEntities(titleM[1]).trim(),
      url: decodeEntities(linkM[1]).trim(),
      source: sourceM ? decodeEntities(sourceM[1]).trim() : null,
      publishedAt: pubM ? new Date(pubM[1]).toISOString() : null,
    });
  }
  return items;
}

// Data-broker SEO pages ("X Number of Employees 2026 | ...") aren't news —
// filter them out even though they technically mention the company.
const JUNK_TITLE = /number of employees|employee count|headcount data|zoominfo|rocketreach/i;

// Short/generic names (Adya, Nova, Vids…) risk name-collision matches (e.g.
// "Adya Singh", a person). Require a business-context keyword in the title
// for names ≤5 chars so a person/place/product name-clash doesn't slip in.
function looksRelevant(name, title) {
  if (JUNK_TITLE.test(title)) return false;
  if (name.replace(/\s/g, "").length > 5) return true;
  return /startup|funding|raised|raises\b|hyderabad|hiring|acqui|funding round|invest(or|ment|s in)|founder|series [a-e]\b/i.test(title);
}

async function newsFor(name) {
  const q = encodeURIComponent(`"${name}" Hyderabad`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseItems(xml)
      .filter((item) => looksRelevant(name, item.title))
      .slice(0, 2);
  } catch {
    return [];
  }
}

// Names too generic for a reliable name-collision-free news match, even
// within the curated set (e.g. "Adya" collides with unrelated people/places
// named Adya — no keyword filter fixes an entity-disambiguation problem).
const TOO_GENERIC = new Set(["Adya"]);

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
const curated = data.filter((x) => x.locSource !== "startupindia+places" && !TOO_GENERIC.has(x.name));
const targets = LIMIT ? curated.slice(0, LIMIT) : curated;
let hits = 0;

for (const entry of targets) {
  const items = await newsFor(entry.name);
  if (items.length) {
    entry.news = items;
    hits++;
    console.log(`  NEWS ${entry.name}: ${items[0].title.slice(0, 70)}`);
  } else {
    delete entry.news;
  }
}

fs.writeFileSync(DB, JSON.stringify(data, null, 2));
console.log(`\nDone. checked ${targets.length} curated companies, ${hits} have recent news.`);
