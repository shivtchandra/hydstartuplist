// Daily hiring check: for each startup, detect known ATS platforms (Greenhouse,
// Lever, Ashby, Recruitee, Workable, Breezy HR, SmartRecruiters, BambooHR, Freshteam)
// via domain probes AND HTML careers-page link discovery, then pull live roles.
// Manual "we're hiring" flags (hiring.source === "manual") are preserved.
//
// Run: node scripts/check-hiring.mjs   (optional LIMIT=50 to sample)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const DB = path.join(__dirname, "..", "data", "startups.json");
const LIMIT = parseInt(process.env.LIMIT || "0", 10);
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;
const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function getJson(url) {
  try {
    const resp = await fetch(url, { headers: UA, signal: AbortSignal.timeout(4500) });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function getText(url) {
  try {
    const resp = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

// Generate intelligent slug candidates from company domain & name
function slugCandidates(entry) {
  const slugs = new Set();
  if (entry.website) {
    try {
      const host = new URL(entry.website).hostname.replace(/^www\./, "");
      const parts = host.split(".");
      const label = parts[0]?.toLowerCase();
      if (label && label.length >= 3 && !["app", "get", "the", "use", "try"].includes(label)) {
        slugs.add(label);
        if (label.includes("-")) slugs.add(label.replace(/-/g, ""));
      } else if (parts.length > 2 && parts[1].length >= 3) {
        slugs.add(parts[1].toLowerCase());
      }
    } catch {}
  }
  return [...slugs];
}

// Expanded ATS Probes covering Greenhouse, Lever, Ashby, Recruitee, Workable, BreezyHR, SmartRecruiters
function atsProbes(slug) {
  return [
    { source: "greenhouse", url: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, boardUrl: `https://boards.greenhouse.io/${slug}` },
    { source: "lever", url: `https://api.lever.co/v0/postings/${slug}?mode=json`, boardUrl: `https://jobs.lever.co/${slug}` },
    { source: "ashby", url: `https://api.ashbyhq.com/posting-api/job-board/${slug}`, boardUrl: `https://jobs.ashbyhq.com/${slug}` },
    { source: "recruitee", url: `https://${slug}.recruitee.com/api/offers/`, boardUrl: `https://${slug}.recruitee.com/` },
    { source: "workable", url: `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`, boardUrl: `https://apply.workable.com/${slug}/` },
    { source: "breezy", url: `https://${slug}.breezy.hr/api/v1/jobs`, boardUrl: `https://${slug}.breezy.hr/` },
    { source: "smartrecruiters", url: `https://api.smartrecruiters.com/v1/companies/${slug}/postings`, boardUrl: `https://jobs.smartrecruiters.com/${slug}` },
  ];
}

function extractJobs(source, d) {
  if (!d) return null;
  if (source === "greenhouse") return d.jobs || null;
  if (source === "lever") return Array.isArray(d) ? d : null;
  if (source === "ashby") return d.jobs || null;
  if (source === "recruitee") return d.offers || null;
  if (source === "workable") return d.jobs || null;
  if (source === "breezy") return Array.isArray(d) ? d : null;
  if (source === "smartrecruiters") return d.content || null;
  return null;
}

function locOf(source, j) {
  if (source === "greenhouse") return j.location?.name || "";
  if (source === "lever") return j.categories?.location || "";
  if (source === "ashby") return j.location || "";
  if (source === "recruitee") return `${j.city || ""} ${j.country || ""} ${j.location || ""}`;
  if (source === "workable") return `${j.city || ""} ${j.country || ""} ${j.location?.city || ""}`;
  if (source === "breezy") return `${j.location?.city || ""} ${j.location?.country?.name || ""}`;
  if (source === "smartrecruiters") return `${j.location?.city || ""} ${j.location?.country || ""}`;
  return "";
}

function roleOf(source, j, boardUrl) {
  const title = j.title || j.text || j.name || "Open Role";
  const url = j.absolute_url || j.hostedUrl || j.applyUrl || j.jobUrl || j.url || j.ref || boardUrl;
  return { title, url };
}

// Auto-discover embedded ATS links from company HTML homepage & careers page
async function discoverAtsFromHtml(entry) {
  const urlsToFetch = new Set();
  if (entry.website) urlsToFetch.add(entry.website);
  if (entry.careers) urlsToFetch.add(entry.careers);
  if (entry.website) {
    const base = entry.website.replace(/\/$/, "");
    urlsToFetch.add(`${base}/careers`);
    urlsToFetch.add(`${base}/jobs`);
  }

  for (const pageUrl of urlsToFetch) {
    const html = await getText(pageUrl);
    if (!html) continue;

    // Pattern matches for ATS URLs embedded in href or iframe attributes
    const patterns = [
      { source: "greenhouse", regex: /boards\.greenhouse\.io\/([a-z0-9_-]+)/i },
      { source: "lever", regex: /jobs\.lever\.co\/([a-z0-9_-]+)/i },
      { source: "ashby", regex: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i },
      { source: "recruitee", regex: /([a-z0-9_-]+)\.recruitee\.com/i },
      { source: "workable", regex: /apply\.workable\.com\/([a-z0-9_-]+)/i },
      { source: "breezy", regex: /([a-z0-9_-]+)\.breezy\.hr/i },
      { source: "smartrecruiters", regex: /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/i },
    ];

    for (const { source, regex } of patterns) {
      const match = html.match(regex);
      if (match && match[1] && match[1].length > 2) {
        const slug = match[1].toLowerCase();
        // Probe this discovered slug directly!
        const probes = atsProbes(slug).filter((p) => p.source === source);
        for (const probe of probes) {
          const d = await getJson(probe.url);
          const jobs = extractJobs(source, d);
          if (Array.isArray(jobs) && jobs.length > 0) {
            const locRegex = /hyderabad|secunderabad|telangana|hitec|hitech\s*city|gachibowli|madhapur|financial\s*district|kondapur|kukatpally|raidurg|nanakramguda|remote.{0,40}(hyderabad|telangana)/i;
            const matched = jobs.filter((j) => locRegex.test(locOf(source, j)));
            if (matched.length > 0) {
              const roles = matched.slice(0, 5).map((j) => roleOf(source, j, probe.boardUrl));
              return {
                active: true,
                count: matched.length,
                source: probe.source,
                slug,
                url: probe.boardUrl,
                roles,
                checkedAt: new Date().toISOString(),
              };
            }
          }
        }
      }
    }
  }
  return null;
}

// Fallback JobPosting JSON-LD schema parsing
async function schemaOrgJobs(entry) {
  if (!entry.careers || entry.careers.includes("linkedin.com")) return null;
  const html = await getText(entry.careers);
  if (!html) return null;

  const matches = [...html.matchAll(/"@type"\s*:\s*"JobPosting"[\s\S]{0,300}?"title"\s*:\s*"([^"]+)"/gi)];
  const allMatches = [...html.matchAll(/"@type"\s*:\s*"JobPosting"/gi)];
  if (allMatches.length === 0) return null;
  const roles = matches.slice(0, 5).map((m) => ({ title: m[1], url: entry.careers }));
  return {
    active: true,
    count: allMatches.length,
    source: "schema-org",
    url: entry.careers,
    roles,
    checkedAt: new Date().toISOString(),
  };
}

// Deep Scraping Fallback using Firecrawl API (.env.local FIRECRAWL_API_KEY)
async function firecrawlJobs(entry) {
  if (!FIRECRAWL_KEY || (!entry.careers && !entry.website)) return null;
  const targetUrl = entry.careers || `${entry.website.replace(/\/$/, "")}/careers`;
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const markdown = data.data?.markdown || "";
    if (!markdown) return null;

    const roleMatches = [...markdown.matchAll(/(?:###?\s*|[*•-]\s*)([A-Z][A-Za-z0-9\s/&,.-]{4,50}(?:Engineer|Developer|Manager|Analyst|Lead|Specialist|Designer|Consultant|Architect|Intern|Director|VP|Head|Representative|Executive))/g)];
    if (roleMatches.length === 0) return null;

    const roles = roleMatches.slice(0, 5).map((m) => ({ title: m[1].trim(), url: targetUrl }));
    return {
      active: true,
      count: roleMatches.length,
      source: "firecrawl",
      url: targetUrl,
      roles,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

const SRC_ORDER = { greenhouse: 0, lever: 1, ashby: 2, recruitee: 3, workable: 4, breezy: 5, smartrecruiters: 6 };

async function checkOne(entry) {
  if (!entry.website) return null;

  // 1. Direct ATS API Probes by slug
  const tasks = [];
  for (const slug of slugCandidates(entry)) {
    for (const probe of atsProbes(slug)) {
      tasks.push(
        (async () => {
          const d = await getJson(probe.url);
          const jobs = extractJobs(probe.source, d);
          if (!Array.isArray(jobs) || jobs.length === 0) return null;
          const locRegex = /hyderabad|secunderabad|telangana|hitec|hitech\s*city|gachibowli|madhapur|financial\s*district|kondapur|kukatpally|raidurg|nanakramguda|remote.{0,40}(hyderabad|telangana)/i;
          const matched = jobs.filter((j) => locRegex.test(locOf(probe.source, j)));
          if (matched.length === 0) return null;
          const roles = matched.slice(0, 5).map((j) => roleOf(probe.source, j, probe.boardUrl));
          return {
            active: true,
            count: matched.length,
            source: probe.source,
            slug,
            url: probe.boardUrl,
            roles,
            checkedAt: new Date().toISOString(),
          };
        })()
      );
    }
  }

  const results = (await Promise.all(tasks)).filter(Boolean);
  if (results.length) {
    results.sort((a, b) => (SRC_ORDER[a.source] ?? 99) - (SRC_ORDER[b.source] ?? 99));
    return results[0];
  }

  // 2. HTML Careers Page Auto-Discovery (Extracts embedded ATS URLs)
  const discovered = await discoverAtsFromHtml(entry);
  if (discovered) return discovered;

  // 3. Schema.org JobPosting Fallback
  const schemaHit = await schemaOrgJobs(entry);
  if (schemaHit) return schemaHit;

  // 4. Firecrawl AI Deep Scraping Fallback
  return firecrawlJobs(entry);
}

// Execution Loop
const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
const targets = LIMIT ? data.slice(0, LIMIT) : data;
let hits = 0, checked = 0;

console.log(`Starting enhanced hiring check for ${targets.length} startups...`);

for (const entry of targets) {
  if (entry.hiring?.source === "manual") continue;
  checked++;
  let h = null;
  try {
    h = await checkOne(entry);
  } catch {
    h = null;
  }

  if (h) {
    entry.hiring = h;
    hits++;
    console.log(`  HIRING ${entry.name}: ${h.count} role(s) via ${h.source}`);
  } else if (entry.hiring && entry.hiring.source !== "manual") {
    delete entry.hiring;
  }

  if (checked % 100 === 0) console.log(`…checked ${checked}, hiring ${hits}`);
}

fs.writeFileSync(DB, JSON.stringify(data, null, 2));
console.log(`\nDone. Checked ${checked}, currently hiring ${hits}.`);
