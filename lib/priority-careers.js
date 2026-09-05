import fs from "fs";
import path from "path";
import { HYD_TG_LOC_RE } from "./ats/geo.js";
import { sanitizeJobHtml } from "./job-content.js";

const FILE = path.join(process.cwd(), "data", "priority-careers.json");
const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};
const ROLE_RE =
  /(?:Engineer|Developer|Manager|Analyst|Lead|Specialist|Designer|Consultant|Architect|Intern|Director|Scientist|SRE|QA|Product|Sales|Marketing|Finance|Operations|HR|Recruiter|Accountant)/i;
const MAX_ROLES = 25;

export function loadPriorityCareers() {
  if (!fs.existsSync(FILE)) return [];
  try {
    const list = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return Array.isArray(list) ? list.filter((e) => e?.id && e?.url && e?.name) : [];
  } catch {
    return [];
  }
}

async function getText(url) {
  try {
    const resp = await fetch(url, { redirect: "follow", headers: UA, signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

async function getJson(url) {
  try {
    const resp = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function cleanTitle(raw) {
  return String(raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeRoles(roles) {
  const seen = new Set();
  const out = [];
  for (const r of roles) {
    const title = cleanTitle(r.title);
    const url = r.url;
    if (!title || title.length < 4 || title.length > 120) continue;
    if (/cookie|privacy|view open|submit resume|learn more|read more/i.test(title)) continue;
    const key = `${title.toLowerCase()}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url, description: r.description || null });
    if (out.length >= MAX_ROLES) break;
  }
  return out;
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
  }));
  return {
    active: true,
    count: roles.length,
    source: "lever",
    url: boardUrl || `https://jobs.lever.co/${slug}`,
    roles: dedupeRoles(roles),
    checkedAt: new Date().toISOString(),
  };
}

async function discoverAtsFromHtml(url) {
  const html = await getText(url);
  if (!html) return null;
  const patterns = [
    { source: "greenhouse", regex: /boards\.greenhouse\.io\/([a-z0-9_-]+)/i, api: (s) => `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`, board: (s) => `https://boards.greenhouse.io/${s}` },
    { source: "lever", regex: /jobs\.lever\.co\/([a-z0-9_-]+)/i, api: (s) => `https://api.lever.co/v0/postings/${s}?mode=json`, board: (s) => `https://jobs.lever.co/${s}` },
    { source: "ashby", regex: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i, api: (s) => `https://api.ashbyhq.com/posting-api/job-board/${s}`, board: (s) => `https://jobs.ashbyhq.com/${s}` },
  ];
  for (const p of patterns) {
    const m = html.match(p.regex);
    if (!m?.[1] || m[1].length < 2) continue;
    const slug = m[1].toLowerCase();
    if (p.source === "lever") return fetchLever(slug, p.board(slug));
    const data = await getJson(p.api(slug));
    let jobs = null;
    if (p.source === "greenhouse") jobs = data?.jobs || null;
    if (p.source === "ashby") jobs = data?.jobs || null;
    if (!Array.isArray(jobs) || !jobs.length) continue;
    const locOf = (j) =>
      p.source === "greenhouse"
        ? j.location?.name || ""
        : j.location || j.locationName || "";
    const hyd = jobs.filter((j) => HYD_TG_LOC_RE.test(locOf(j)));
    const picked = hyd.length ? hyd : jobs;
    const roles = picked.map((j) => ({
      title: j.title || j.text || j.name,
      url: j.absolute_url || j.hostedUrl || j.applyUrl || j.jobUrl || p.board(slug),
      description: sanitizeJobHtml(j.content || j.descriptionPlain || j.descriptionHtml || j.description || "") || null,
    }));
    return {
      active: true,
      count: roles.length,
      source: p.source,
      url: p.board(slug),
      roles: dedupeRoles(roles),
      checkedAt: new Date().toISOString(),
    };
  }
  return null;
}

function schemaOrgRoles(html, careersUrl) {
  const matches = [...html.matchAll(/"@type"\s*:\s*"JobPosting"[\s\S]{0,400}?"title"\s*:\s*"([^"]+)"/gi)];
  if (!matches.length) return null;
  const roles = matches.map((m) => ({ title: m[1], url: careersUrl }));
  return dedupeRoles(roles);
}

function htmlLinkRoles(html, careersUrl) {
  const roles = [];
  for (const m of html.matchAll(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = cleanTitle(m[2]);
    if (!ROLE_RE.test(title)) continue;
    let url;
    try {
      url = new URL(m[1], careersUrl).href;
    } catch {
      continue;
    }
    if (/^(#|javascript:|mailto:)/i.test(m[1])) continue;
    roles.push({ title, url });
  }
  // MapmyGenome-style /job/slug links
  for (const m of html.matchAll(/href=["'](\/job\/[^"']+)["']/gi)) {
    let url;
    try {
      url = new URL(m[1], careersUrl).href;
    } catch {
      continue;
    }
    const slug = m[1].split("/job/")[1] || "";
    const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (title.length >= 4) roles.push({ title, url });
  }
  return dedupeRoles(roles);
}

/**
 * Scrape one priority employer careers page (or known ATS board).
 * Not for companies already on sync-ats-jobs real ATS boards.
 */
export async function scrapePriorityEmployer(entry) {
  if (entry.atsProvider === "lever" && entry.atsSlug) {
    return fetchLever(entry.atsSlug, entry.url);
  }

  const discovered = await discoverAtsFromHtml(entry.url);
  if (discovered?.roles?.length) return discovered;

  const html = await getText(entry.url);
  if (!html) return null;

  const schema = schemaOrgRoles(html, entry.url);
  if (schema?.length) {
    return {
      active: true,
      count: schema.length,
      source: "schema-org",
      url: entry.url,
      roles: schema,
      checkedAt: new Date().toISOString(),
    };
  }

  const links = htmlLinkRoles(html, entry.url);
  if (!links.length) return null;
  return {
    active: true,
    count: links.length,
    source: "careers-html",
    url: entry.url,
    roles: links,
    checkedAt: new Date().toISOString(),
  };
}

export function hiringToPublicJobs(entry, hiring, fetchedAt) {
  if (!hiring?.roles?.length) return [];
  return hiring.roles.map((role) => ({
    id: `priority-${entry.id}-${role.url}`,
    title: role.title,
    company: entry.name,
    location: "Hyderabad",
    url: role.url,
    postedAt: null,
    sourcePostedAt: null,
    firstSeenAt: hiring.checkedAt || fetchedAt,
    lastCheckedAt: hiring.checkedAt || fetchedAt,
    fetchedAt: hiring.checkedAt || fetchedAt,
    description: role.description || null,
    salary: null,
    source: "careers",
    startupId: entry.startupId || null,
    employerType: entry.employerType || null,
    website: entry.url,
  }));
}
