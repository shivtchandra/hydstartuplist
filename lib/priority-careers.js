import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { URL } from "url";
import { HYD_TG_LOC_RE } from "./ats/geo.js";
import { sanitizeJobHtml } from "./job-content.js";

const FILE = path.join(process.cwd(), "data", "priority-careers.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ROLE_RE =
  /(?:Engineer|Developer|Manager|Analyst|Lead|Specialist|Designer|Consultant|Architect|Intern|Director|Scientist|SRE|QA|Product|Sales|Marketing|Finance|Operations|Recruiter|Accountant|Officer|Executive|Coordinator|Technician|Welding|Avionics|Composites|Cryogenic|HR\b)/i;
const MAX_ROLES = 40;
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;
// Priority list is tiny (daily) — Firecrawl when HTML fails if Vercel has FIRECRAWL_API_KEY.
// Set PRIORITY_FIRECRAWL=0 to disable.
const FIRECRAWL_OK = !!FIRECRAWL_KEY && process.env.PRIORITY_FIRECRAWL !== "0";

export function loadPriorityCareers() {
  if (!fs.existsSync(FILE)) return [];
  try {
    const list = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(list) ? list.filter((e) => e?.id && e?.url && e?.name) : [];
  } catch {
    return [];
  }
}

function requestText(url, redirects = 0) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return resolve("");
    }
    const lib = parsed.protocol === "http:" ? http : https;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/json,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        rejectUnauthorized: false,
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          return resolve(requestText(next, redirects + 1));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("error", () => resolve(""));
    req.on("timeout", () => {
      req.destroy();
      resolve("");
    });
  });
}

async function getText(url) {
  return requestText(url);
}

async function getJson(url) {
  const text = await requestText(url);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanTitle(raw) {
  return String(raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromSlug(slug) {
  return String(slug || "")
    .replace(/\.[a-z]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function isoDate(value) {
  if (value == null || value === "") return null;
  const time = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(time)) return null;
  if (time > Date.now() + 60_000) return null;
  return new Date(time).toISOString();
}

function dedupeRoles(roles) {
  const seen = new Set();
  const out = [];
  for (const r of roles) {
    const title = cleanTitle(r.title);
    const url = r.url;
    if (!title || !url || title.length < 4 || title.length > 120) continue;
    if (/cookie|privacy|view open|submit resume|learn more|read more|apply now|see all|view all|glossary|helpdesk|hr suite|hr templates|hr analytics|chro|cfo finance/i.test(title)) continue;
    const key = `${title.toLowerCase()}|${String(url).split("?")[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const postedAt = isoDate(r.postedAt || r.createdAt || r.datePosted || null);
    out.push({
      title,
      url,
      description: r.description || null,
      ...(postedAt ? { postedAt } : {}),
    });
    if (out.length >= MAX_ROLES) break;
  }
  return out;
}

function pack(entry, source, url, roles) {
  const cleaned = dedupeRoles(roles);
  if (!cleaned.length) return null;
  return {
    active: true,
    count: cleaned.length,
    source,
    url,
    roles: cleaned,
    checkedAt: new Date().toISOString(),
  };
}

async function fetchLever(slug, boardUrl) {
  const data = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (!Array.isArray(data) || !data.length) return null;
  const hyd = data.filter((j) => HYD_TG_LOC_RE.test(j.categories?.location || j.location || ""));
  const picked = hyd.length ? hyd : data;
  const roles = picked.map((j) => ({
    title: j.text || j.title,
    url: j.hostedUrl || j.applyUrl || boardUrl,
    description: sanitizeJobHtml(j.descriptionPlain || j.description || "") || null,
    postedAt: isoDate(j.createdAt),
  }));
  return pack({ name: slug }, "lever", boardUrl || `https://jobs.lever.co/${slug}`, roles);
}

async function discoverAtsFromHtml(url) {
  const html = await getText(url);
  if (!html) return { html: "", hit: null };
  const patterns = [
    {
      source: "greenhouse",
      regex: /boards(?:-api)?\.greenhouse\.io\/(?:v1\/boards\/)?([a-z0-9_-]+)/i,
      api: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`,
      board: (s) => `https://boards.greenhouse.io/${s}`,
    },
    {
      source: "lever",
      regex: /jobs\.lever\.co\/([a-z0-9_-]+)/i,
      board: (s) => `https://jobs.lever.co/${s}`,
    },
    {
      source: "ashby",
      regex: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i,
      api: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}`,
      board: (s) => `https://jobs.ashbyhq.com/${s}`,
    },
  ];
  for (const p of patterns) {
    const m = html.match(p.regex);
    if (!m?.[1] || m[1].length < 2) continue;
    const slug = m[1].toLowerCase();
    if (p.source === "lever") {
      const hit = await fetchLever(slug, p.board(slug));
      if (hit) return { html, hit };
      continue;
    }
    const data = await getJson(p.api(slug));
    const jobs = p.source === "greenhouse" ? data?.jobs : data?.jobs;
    if (!Array.isArray(jobs) || !jobs.length) continue;
    const locOf = (j) =>
      p.source === "greenhouse" ? j.location?.name || "" : j.location || j.locationName || "";
    const hyd = jobs.filter((j) => HYD_TG_LOC_RE.test(locOf(j)));
    const picked = hyd.length ? hyd : jobs;
    const roles = picked.map((j) => ({
      title: j.title || j.text || j.name,
      url: j.absolute_url || j.hostedUrl || j.applyUrl || j.jobUrl || p.board(slug),
      description:
        sanitizeJobHtml(j.content || j.descriptionPlain || j.descriptionHtml || j.description || "") || null,
      postedAt: isoDate(
        j.updated_at || j.first_published || j.publishedAt || j.createdAt || j.created_at || null
      ),
    }));
    const hit = pack({ name: slug }, p.source, p.board(slug), roles);
    if (hit) return { html, hit };
  }
  return { html, hit: null };
}

function schemaOrgRoles(html, careersUrl) {
  const matches = [...html.matchAll(/"@type"\s*:\s*"JobPosting"[\s\S]{0,1200}?"title"\s*:\s*"([^"]+)"/gi)];
  if (!matches.length) return [];
  return matches.map((m) => {
    const chunk = m[0] || "";
    const urlMatch = chunk.match(/"url"\s*:\s*"([^"]+)"/i);
    const dateMatch = chunk.match(/"datePosted"\s*:\s*"([^"]+)"/i);
    let url = careersUrl;
    if (urlMatch) {
      try {
        url = JSON.parse(`"${urlMatch[1]}"`);
      } catch {
        url = urlMatch[1];
      }
    }
    const postedAt = isoDate(dateMatch?.[1] || null);
    return { title: m[1], url, ...(postedAt ? { postedAt } : {}) };
  });
}

function htmlLinkRoles(html, careersUrl) {
  const roles = [];
  for (const m of html.matchAll(/href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = cleanTitle(m[2]);
    if (!ROLE_RE.test(title)) continue;
    let url;
    try {
      url = new URL(m[1], careersUrl).href;
    } catch {
      continue;
    }
    if (/^(javascript:|mailto:)/i.test(m[1])) continue;
    roles.push({ title, url });
  }
  // /job/slug and /jobs/slug paths
  for (const m of html.matchAll(/href=["']([^"']*\/jobs?\/[^"'?#]+)["']/gi)) {
    let url;
    try {
      url = new URL(m[1], careersUrl).href;
    } catch {
      continue;
    }
    const slug = m[1].split(/\/jobs?\//i).pop() || "";
    const title = titleFromSlug(slug);
    if (title.length >= 4) roles.push({ title, url });
  }
  // Heading-ish job titles near apply links
  for (const m of html.matchAll(/<(?:h[1-4]|div|span|li)[^>]*>([^<]{6,90})<\/(?:h[1-4]|div|span|li)>/gi)) {
    const title = cleanTitle(m[1]);
    if (ROLE_RE.test(title)) roles.push({ title, url: careersUrl });
  }
  return roles;
}

async function firecrawlJobs(entry) {
  if (!FIRECRAWL_OK) return null;
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_KEY}`,
      },
      body: JSON.stringify({
        url: entry.url,
        formats: ["markdown", "html"],
        onlyMainContent: true,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const markdown = data.data?.markdown || "";
    const html = data.data?.html || "";
    const fromMd = [
      ...markdown.matchAll(
        /(?:###?\s*|[*•-]\s*)([A-Z][A-Za-z0-9\s/&,().-]{4,80}(?:Engineer|Developer|Manager|Analyst|Lead|Specialist|Designer|Consultant|Architect|Intern|Director|VP|Head|Executive|Officer|Coordinator))/g
      ),
    ].map((m) => ({ title: m[1].trim(), url: entry.url }));
    const fromHtml = html ? htmlLinkRoles(html, entry.url).concat(schemaOrgRoles(html, entry.url)) : [];
    return pack(entry, "firecrawl", entry.url, [...fromMd, ...fromHtml]);
  } catch {
    return null;
  }
}

/**
 * Scrape one priority employer careers page (or known ATS board).
 * Skips companies already covered by sync-ats-jobs.
 */
export async function scrapePriorityEmployer(entry) {
  if (entry.atsProvider === "lever" && entry.atsSlug) {
    const hit = await fetchLever(entry.atsSlug, entry.url);
    if (hit) return hit;
  }

  const { html, hit } = await discoverAtsFromHtml(entry.url);
  if (hit?.roles?.length) return hit;

  const page = html || (await getText(entry.url));
  if (page) {
    const schema = schemaOrgRoles(page, entry.url);
    const links = htmlLinkRoles(page, entry.url);
    const packed = pack(entry, schema.length ? "schema-org" : "careers-html", entry.url, [...schema, ...links]);
    if (packed) return packed;
  }

  return firecrawlJobs(entry);
}

export function hiringToPublicJobs(entry, hiring, fetchedAt) {
  if (!hiring?.roles?.length) return [];
  const checkedAt = hiring.checkedAt || fetchedAt;
  return hiring.roles.map((role) => {
    const postedAt = isoDate(role.postedAt || null);
    return {
      id: `priority-${entry.id}-${role.url}`,
      title: role.title,
      company: entry.name,
      location: "Hyderabad",
      url: role.url,
      postedAt,
      sourcePostedAt: postedAt,
      firstSeenAt: checkedAt,
      lastCheckedAt: checkedAt,
      fetchedAt: checkedAt,
      description: role.description || null,
      salary: null,
      source: "careers",
      startupId: entry.startupId || null,
      employerType: entry.employerType || null,
      website: entry.url,
      employerId: entry.id,
    };
  });
}

/**
 * Merge a fresh priority scrape with the previous snapshot.
 * - Preserves firstSeenAt for roles we already know (stops "all Discovered Nh ago" resets)
 * - Keeps employers that failed/timeouted this run (partial scrapes)
 * - Prefers fresh postedAt from ATS when present
 */
export function mergePriorityJobs(previous = [], incoming = [], { checkedAt, scrapedEmployerIds = [] } = {}) {
  const prevById = new Map((previous || []).map((j) => [j.id, j]));
  const scrapedIds = new Set(scrapedEmployerIds);
  const next = (incoming || []).map((job) => {
    const prev = prevById.get(job.id);
    const postedAt =
      isoDate(job.sourcePostedAt || job.postedAt) ||
      isoDate(prev?.sourcePostedAt || prev?.postedAt);
    return {
      ...job,
      postedAt,
      sourcePostedAt: postedAt,
      firstSeenAt: prev?.firstSeenAt || job.firstSeenAt || checkedAt,
      lastCheckedAt: checkedAt,
      lastSeenAt: checkedAt,
      status: "active",
      missingScans: 0,
    };
  });
  const nextIds = new Set(next.map((j) => j.id));
  // Keep roles from employers this run did not successfully scrape (timeouts / empties).
  const kept = (previous || [])
    .filter((j) => !nextIds.has(j.id))
    .filter((j) => !j.employerId || !scrapedIds.has(j.employerId))
    .map((j) => ({ ...j, lastCheckedAt: checkedAt }));
  return [...next, ...kept];
}
