#!/usr/bin/env node
/**
 * Check every Radar careers link (data/radar.json + data/under-the-radar-watchlist.json).
 *
 * ATS boards are checked through their public APIs, because jobs.ashbyhq.com
 * and friends return 200 for boards that don't exist. Everything else is a
 * plain browser-like GET.
 *
 *   node scripts/verify-radar-links.mjs          # report, exit 1 on DEAD
 *   node scripts/verify-radar-links.mjs --json   # machine-readable
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const asJson = process.argv.includes("--json");

// Sites that block bots or ship a broken TLS chain but load in a browser.
const BROWSER_ONLY = [/blaize\.com/i, /mapmygenome\.in/i];

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  Accept: "text/html,application/json",
  "Accept-Language": "en",
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "data", file), "utf8"));
}

function arrayOf(doc) {
  return Array.isArray(doc) ? doc : Object.values(doc).find(Array.isArray) || [];
}

function collectLinks() {
  const radar = arrayOf(readJson("radar.json")).map((e) => ({
    source: "radar.json",
    name: e.name || e.aliases?.[0] || e.startupId,
    url: typeof e.careers === "string" ? e.careers : "",
  }));
  const watch = arrayOf(readJson("under-the-radar-watchlist.json")).map((e) => ({
    source: "watchlist",
    name: e.name || e.id,
    url: e.careersUrl || "",
  }));
  return [...radar, ...watch];
}

const ATS_API = [
  [/^https:\/\/jobs\.ashbyhq\.com\/([^/?#]+)/, (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}`, (j) => j.jobs?.length || 0],
  [/^https:\/\/jobs\.gem\.com\/([^/?#]+)/, (s) => `https://api.gem.com/job_board/v0/${s}/job_posts/`, (j) => (Array.isArray(j) ? j.length : 0)],
  [/^https:\/\/jobs\.lever\.co\/([^/?#]+)/, (s) => `https://api.lever.co/v0/postings/${s}?mode=json`, (j) => (Array.isArray(j) ? j.length : 0)],
  [/^https:\/\/(?:job-)?boards\.greenhouse\.io\/([^/?#]+)/, (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`, (j) => j.jobs?.length || 0],
];

async function check(url) {
  if (!url) return { status: "MISSING" };
  try {
    for (const [re, api, count] of ATS_API) {
      const m = url.match(re);
      if (!m) continue;
      const res = await fetch(api(m[1]), { headers: UA, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return { status: "DEAD", detail: `board API ${res.status}` };
      // A board can exist in the API while its public page is gone (Gem does this).
      const page = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000) });
      if (!page.ok) return { status: "DEAD", detail: `board page ${page.status}` };
      const n = count(await res.json());
      return n ? { status: "OK", detail: `${n} jobs` } : { status: "EMPTY", detail: "board has 0 jobs" };
    }
    const res = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (res.ok) return { status: "OK", detail: String(res.status) };
    return { status: "DEAD", detail: String(res.status) };
  } catch (err) {
    return { status: "DEAD", detail: err.cause?.code || err.name };
  }
}

const links = collectLinks();
const results = [];
for (let i = 0; i < links.length; i += 8) {
  const chunk = links.slice(i, i + 8);
  results.push(...(await Promise.all(chunk.map(async (l) => ({ ...l, ...(await check(l.url)) })))));
}
for (const r of results) {
  if (r.status === "DEAD" && BROWSER_ONLY.some((re) => re.test(r.url))) r.status = "BROWSER_ONLY";
}

const bad = results.filter((r) => r.status === "DEAD" || r.status === "MISSING");
if (asJson) {
  console.log(JSON.stringify({ total: results.length, bad: bad.length, results }, null, 2));
} else {
  const counts = results.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
  console.log(`radar links: ${results.length}`, counts);
  for (const r of results.filter((r) => r.status !== "OK")) {
    console.log(`${r.status.padEnd(12)} ${r.source.padEnd(10)} ${r.name} — ${r.url} (${r.detail || ""})`);
  }
}
process.exit(bad.length ? 1 : 0);
