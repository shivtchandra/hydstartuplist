import {
  ATS_PROVIDERS,
  boardMeta,
  extractRawJobs,
  HTML_ATS_PATTERNS,
} from "./providers.js";
import { normalizeAtsJob, toPublicJob } from "./normalize.js";
import { isHydOrTelanganaLocation, HYD_TG_LOC_RE } from "./geo.js";

export {
  ATS_PROVIDERS,
  boardMeta,
  isHydOrTelanganaLocation,
  HYD_TG_LOC_RE,
  normalizeAtsJob,
  toPublicJob,
};

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json,text/html,*/*",
};

export async function getJson(url, timeoutMs = 4500) {
  try {
    const resp = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export async function getText(url, timeoutMs = 4000) {
  try {
    const resp = await fetch(url, {
      redirect: "follow",
      headers: UA,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

export function slugCandidatesFromWebsite(website) {
  const slugs = new Set();
  if (!website) return [];
  try {
    const host = new URL(website).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    const label = parts[0]?.toLowerCase();
    if (label && label.length >= 3 && !["app", "get", "the", "use", "try"].includes(label)) {
      slugs.add(label);
      if (label.includes("-")) slugs.add(label.replace(/-/g, ""));
    } else if (parts.length > 2 && parts[1].length >= 3) {
      slugs.add(parts[1].toLowerCase());
    }
  } catch {
    /* ignore */
  }
  return [...slugs];
}

/**
 * Fetch + geo-filter jobs for one classified board.
 */
export async function fetchBoardJobs(provider, slug, { companyName = null, geoFilter = true, withContent = true } = {}) {
  const meta = boardMeta(provider, slug, { withContent });
  if (!meta) return { ok: false, jobs: [], boardUrl: null };

  const data = await getJson(meta.apiUrl, withContent ? 12000 : 4500);
  const raw = extractRawJobs(provider, data);
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: !!data, jobs: [], boardUrl: meta.boardUrl, totalRaw: 0 };
  }

  const jobs = [];
  for (const j of raw) {
    const n = normalizeAtsJob(provider, j, {
      boardUrl: meta.boardUrl,
      slug,
      companyName,
      geoFilter,
    });
    if (n) jobs.push(n);
  }
  return { ok: true, jobs, boardUrl: meta.boardUrl, totalRaw: raw.length };
}

/**
 * Probe whether a provider+slug board exists and has any jobs (any geo).
 */
export async function probeBoard(provider, slug) {
  const meta = boardMeta(provider, slug, { withContent: false });
  if (!meta) return null;
  const data = await getJson(meta.apiUrl, 4000);
  const raw = extractRawJobs(provider, data);
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return { provider, slug, boardUrl: meta.boardUrl, jobCount: raw.length };
}

/**
 * Try website-derived slugs against all ATS providers; return first hit
 * that has at least one Hyd/TG role (preferred) or any roles.
 */
export async function classifyBySlugProbes(website, { preferHyd = true } = {}) {
  const slugs = slugCandidatesFromWebsite(website);
  if (!slugs.length) return null;

  // Sequential provider probes with early exit — avoids stampeding 7×N fetches
  // per company (which hung/rate-limited the full classify run).
  let anyHit = null;
  for (const slug of slugs) {
    for (const provider of ATS_PROVIDERS) {
      const probed = await probeBoard(provider, slug);
      if (!probed) continue;
      // Confirm Hyd/TG presence cheaply via a second geo-filtered fetch only on hits
      const hyd = await fetchBoardJobs(provider, slug, { geoFilter: true, withContent: false });
      const hit = {
        provider,
        slug,
        boardUrl: probed.boardUrl,
        jobCount: probed.jobCount,
        hydCount: hyd.jobs.length,
      };
      if (preferHyd && hit.hydCount > 0) return hit;
      if (!anyHit || hit.jobCount > anyHit.jobCount) anyHit = hit;
    }
  }
  return anyHit;
}

/**
 * Discover ATS board from careers/website HTML, then confirm via API.
 */
export async function classifyFromHtml(entry) {
  const urls = new Set();
  if (entry.website) {
    const base = entry.website.replace(/\/$/, "");
    urls.add(entry.website);
    urls.add(`${base}/careers`);
    urls.add(`${base}/jobs`);
  }
  if (entry.careers && !String(entry.careers).includes("linkedin.com")) {
    urls.add(entry.careers);
  }

  const htmls = await Promise.all([...urls].map((u) => getText(u)));
  for (const html of htmls) {
    if (!html) continue;
    for (const { provider, regex } of HTML_ATS_PATTERNS) {
      const match = html.match(regex);
      if (!match?.[1] || match[1].length < 2) continue;
      const slug = match[1].toLowerCase();
      const probed = await probeBoard(provider, slug);
      if (probed) return probed;
    }
  }
  return null;
}

/**
 * Full classify for one startup-like entry.
 */
export async function classifyCompany(entry) {
  const fromHtml = await classifyFromHtml(entry);
  if (fromHtml) {
    return {
      atsProvider: fromHtml.provider,
      atsSlug: fromHtml.slug,
      atsBoardUrl: fromHtml.boardUrl,
      atsClassifiedAt: new Date().toISOString(),
    };
  }
  const fromProbe = await classifyBySlugProbes(entry.website);
  if (fromProbe) {
    return {
      atsProvider: fromProbe.provider,
      atsSlug: fromProbe.slug,
      atsBoardUrl: fromProbe.boardUrl,
      atsClassifiedAt: new Date().toISOString(),
    };
  }
  return {
    atsProvider: null,
    atsSlug: null,
    atsBoardUrl: null,
    atsClassifiedAt: new Date().toISOString(),
  };
}

export function boardRegistryId(provider, slug) {
  return `${provider}:${String(slug).toLowerCase()}`;
}
