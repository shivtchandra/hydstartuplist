import { AsyncLocalStorage } from "node:async_hooks";
const scanContext = new AsyncLocalStorage();
const fetch = async (...args) => {
  try { const response = await globalThis.fetch(...args); if (!response.ok && scanContext.getStore()) scanContext.getStore().failed = true; return response; }
  catch (error) { if (scanContext.getStore()) scanContext.getStore().failed = true; throw error; }
};
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
export async function fetchBoardJobs(provider, slug, options = {}) {
  return scanContext.run({ failed: false }, () => fetchBoardComplete(provider, slug, options));
}
async function fetchBoardComplete(provider, slug, { companyName = null, geoFilter = true, withContent = true } = {}) {
  const meta = boardMeta(provider, slug, { withContent });
  if (!meta) return { ok: false, jobs: [], boardUrl: null };

  let raw = [];
  let complete = false;
  if (provider === "radancy") {
    raw = await fetchRadancyJobs(meta);
  } else if (meta.paginate === "phenom-page") {
    raw = await fetchPhenomPaged(meta);
  } else if (meta.paginate === "phenom-widgets") {
    raw = await fetchPhenomWidgets(meta);
  } else if (meta.paginate === "eightfold-start") {
    raw = await fetchEightfoldPaged(meta);
  } else if (meta.paginate === "workday-cxs") {
    raw = await fetchWorkdayPaged(meta);
  } else if (meta.paginate === "gr8people-graphql") {
    raw = await fetchGr8PeoplePaged(meta);
  } else if (meta.paginate === "html-careers") {
    raw = await fetchHtmlCareers(meta);
    if (Array.isArray(raw)) raw.complete = true;
  } else if (meta.paginate === "linkedin-guest") {
    raw = await fetchLinkedInGuest(meta);
    if (Array.isArray(raw)) raw.complete = true;
  } else if (meta.paginate === "zoho-recruit") {
    raw = await fetchZohoRecruit(meta);
  } else if (meta.paginate === "successfactors-jobs2web") {
    raw = await fetchSuccessFactorsJobs(meta);
  } else if (meta.paginate === "jobs2web-html") {
    raw = await fetchJobs2webHtml(meta);
  } else if (meta.paginate === "accufy-config") {
    raw = await fetchAccufyJobs(meta);
  } else if (meta.paginate === "keka-embed") {
    raw = await fetchKekaEmbedJobs(meta);
  } else if (meta.paginate === "jobsyn-solr") {
    raw = await fetchJobsynSolr(meta);
  } else if (meta.paginate === "freshteam-json") {
    raw = await fetchFreshteamJobs(meta);
  } else {
    const data = await getJson(meta.apiUrl, withContent ? 12000 : 4500);
    const extracted = extractRawJobs(provider, data);
    const advertisedTotal = data?.total ?? data?.totalCount;
    complete = Array.isArray(extracted) && (typeof advertisedTotal !== "number" || extracted.length >= advertisedTotal);
    raw = extracted || [];
  }

  const singlePage = ["keka-embed", "accufy-config", "zoho-recruit", "freshteam-json"].includes(meta.paginate);
  complete = (complete || raw?.complete === true || (singlePage && raw.length > 0)) && !scanContext.getStore()?.failed;
  if (!Array.isArray(raw) || !complete) {
    return { ok: false, complete: false, jobs: [], boardUrl: meta.boardUrl, totalRaw: raw?.length || 0 };
  }

  const jobs = [];
  const effectiveGeo = meta.prefilteredHyd ? false : geoFilter;
  for (const j of raw) {
    const n = normalizeAtsJob(provider, j, {
      boardUrl: meta.boardUrl,
      slug,
      companyName,
      geoFilter: effectiveGeo,
      jobUrlBase: meta.jobUrlBase || null,
      defaultLocation: meta.defaultLocation || null,
    });
    if (n) jobs.push(n);
  }
  return { ok: true, complete: true, jobs, boardUrl: meta.boardUrl, totalRaw: raw.length };
}



async function fetchJobsynSolr(meta) {
  const out = [];
  const pageSize = meta.pageSize || 10;
  const xOrigin = meta.xOrigin || (() => {
    try {
      return new URL(meta.boardUrl).hostname;
    } catch {
      return null;
    }
  })();
  let page = 1;
  let totalPages = Infinity;
  const maxPages = Number(meta.maxPages) > 0 ? Number(meta.maxPages) : 40;
  for (; page <= maxPages && page <= totalPages; page++) {
    const url = meta.apiUrl.includes("page=")
      ? meta.apiUrl.replace(/page=\d+/, `page=${page}`)
      : `${meta.apiUrl}${meta.apiUrl.includes("?") ? "&" : "?"}page=${page}`;
    let data = null;
    try {
      const headers = {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: meta.boardUrl || "https://ibm.dejobs.org/",
      };
      if (xOrigin) {
        headers["X-Origin"] = xOrigin;
        headers.Origin = `https://${xOrigin}`;
      }
      const resp = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(20000),
      });
      if (resp.ok) data = await resp.json();
    } catch {
      data = null;
    }
    const batch = extractRawJobs("jobsyn", data) || [];
    if (!Array.isArray(batch) || !batch.length) {
      out.complete = out.length > 0;
      break;
    }
    out.push(...batch);
    const pag = data?.pagination || {};
    totalPages = Number(pag.total_pages || totalPages);
    const total = Number(pag.total || 0);
    if (batch.length < pageSize || (total && out.length >= total) || page >= totalPages) {
      out.complete = true;
      break;
    }
  }
  return out;
}

async function fetchPhenomWidgets(meta) {
  const out = [];
  const pageSize = meta.pageSize || 20;
  const baseBody = meta.widgetsBody || {};
  let from = 0;
  let total = Infinity;
  for (let page = 0; page < 25 && from < total; page++) {
    const body = {
      ...baseBody,
      from,
      size: pageSize,
      keywords: baseBody.keywords || "",
      location: baseBody.location || "",
      locationData: baseBody.locationData || {},
      clearAll: false,
      isSliderEnable: false,
      sortBy: "",
      subsearch: "",
      all_fields: baseBody.all_fields || ["category", "country", "state", "city", "type", "scheduleType"],
    };
    let data = null;
    try {
      const resp = await fetch(meta.apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: (() => {
            try {
              return new URL(meta.boardUrl || meta.apiUrl).origin;
            } catch {
              return "https://careers.roche.com";
            }
          })(),
          Referer: meta.boardUrl || meta.apiUrl || "https://careers.roche.com/global/en/search-results",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      if (resp.ok) data = await resp.json();
    } catch {
      data = null;
    }
    const refine = data?.refineSearch || data;
    const batch = refine?.data?.jobs || refine?.jobs || [];
    if (!Array.isArray(batch) || !batch.length) {
      out.complete = out.length > 0;
      break;
    }
    out.push(...batch);
    total = Number(refine?.totalHits ?? refine?.total ?? total);
    from += batch.length;
    if (batch.length < pageSize || out.length >= total) {
      out.complete = true;
      break;
    }
  }
  return out;
}

async function fetchPhenomPaged(meta) {
  const out = [];
  const pageSize = meta.pageSize || 10;
  for (let page = 1; page <= 25; page++) {
    const url = meta.apiUrl.includes("page=")
      ? meta.apiUrl.replace(/page=\d+/, `page=${page}`)
      : `${meta.apiUrl}&page=${page}`;
    const data = await getJson(url, 15000);
    const batch = extractRawJobs("phenom", data) || [];
    out.push(...batch);
    if (!data || !Array.isArray(extractRawJobs("phenom", data))) return out;
    if (batch.length < pageSize) { out.complete = true; break; }
    const total = data?.totalCount || data?.count;
    if (total && out.length >= total) { out.complete = true; break; }
  }
  return out;
}

async function fetchEightfoldPaged(meta) {
  const out = [];
  let pageSize = meta.pageSize || 50;
  let start = 0;
  let total = Infinity;
  while (start < 500 && out.length < total) {
    const url = meta.apiUrl.includes("start=")
      ? meta.apiUrl.replace(/start=\d+/, `start=${start}`)
      : `${meta.apiUrl}${meta.apiUrl.includes("?") ? "&" : "?"}start=${start}`;
    const data = await getJson(url, 15000);
    const batch = extractRawJobs("eightfold", data) || [];
    if (!data || !Array.isArray(extractRawJobs("eightfold", data))) return out;
    if (!batch.length) { out.complete = true; break; }
    out.push(...batch);
    total = data?.data?.count ?? data?.count ?? Infinity;
    // Eightfold sometimes ignores num= and returns ~10; advance by actual batch size
    pageSize = batch.length;
    start += pageSize;
    if (out.length >= total) { out.complete = true; break; }
  }
  return out;
}


async function fetchWorkdayPaged(meta) {
  const out = [];
  const pageSize = meta.pageSize || 20;
  let offset = 0;
  let total = Infinity;
  while (offset < total && offset < 500) {
    try {
      const resp = await fetch(meta.apiUrl, {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appliedFacets: meta.appliedFacets || {},
          limit: pageSize,
          offset,
          searchText: meta.searchText || "",
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!resp.ok) break;
      const data = await resp.json();
      if (!Array.isArray(data.jobPostings) || typeof data.total !== "number") return out;
      const batch = data.jobPostings;
      out.push(...batch);
      total = typeof data.total === "number" ? data.total : out.length;
      if (!batch.length) { out.complete = offset >= total; break; }
      offset += batch.length;
      if (offset >= total) out.complete = true;
    } catch {
      break;
    }
  }
  return out;
}


async function fetchGr8PeoplePaged(meta) {
  const out = [];
  const pageSize = meta.pageSize || 50;
  const locationFilter = meta.locationFilter || { lat: 17.385, lng: 78.4867, radius: 50 };
  const query = `query searchJobs($query: String, $start: Int, $first: Int, $filters: JobPostingSearchFiltersInput) {
    searchJobPostings(query: $query, start: $start, first: $first, filters: $filters) {
      results { totalCount nodes { id title url number isRemote places { nodes { name } } } }
    }
  }`;
  let start = 0;
  let total = Infinity;
  while (start < total && start < 500) {
    try {
      const resp = await fetch(meta.apiUrl, {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationName: "searchJobs",
          query,
          variables: {
            query: meta.searchText || "",
            start,
            first: pageSize,
            filters: { location: [locationFilter] },
          },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!resp.ok) break;
      const data = await resp.json();
      const results = data?.data?.searchJobPostings?.results;
      if (!Array.isArray(results?.nodes) || typeof results.totalCount !== "number") return out;
      const batch = results.nodes;
      out.push(...batch);
      total = results.totalCount;
      if (!batch.length) { out.complete = out.length >= total; break; }
      start += batch.length;
      if (out.length >= total) out.complete = true;
    } catch {
      break;
    }
  }
  return out;
}


async function fetchLinkedInGuest(meta) {
  const out = [];
  const seen = new Set();
  const companyId = meta.companyId || "74974362";
  const geoId = meta.geoId || "102713980";
  const decode = (s) =>
    String(s || "")
      .replace(/&amp;/g, "&")
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
      .replace(/\s+/g, " ")
      .trim();

  for (let start = 0; start < 200; start += 10) {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?f_C=${companyId}&geoId=${geoId}&start=${start}`;
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) break;
      const html = await resp.text();
      const cards = html.split('data-entity-urn="urn:li:jobPosting:').slice(1);
      let found = 0;
      for (const card of cards) {
        const id = card.slice(0, card.indexOf('"'));
        if (!id || seen.has(id)) continue;
        const titleM = card.match(/base-search-card__title[^>]*>\s*([^<]+)/i);
        const locM = card.match(/job-search-card__location[^>]*>\s*([^<]+)/i);
        const hrefM = card.match(/href="(https:\/\/[^"]*linkedin\.com\/jobs\/view\/[^"]+)"/i);
        if (!titleM || !hrefM) continue;
        seen.add(id);
        found++;
        out.push({
          id,
          title: decode(titleM[1]),
          location: decode(locM?.[1] || ""),
          url: decode(hrefM[1]).split("?")[0],
        });
      }
      if (!found) break;
    } catch {
      break;
    }
  }
  return out;
}




async function fetchKekaEmbedJobs(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: meta.boardUrl || "https://www.ideyalabs.com/careers/",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : data?.data || [];
  } catch {
    return [];
  }
}

async function fetchAccufyJobs(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const jobs = Array.isArray(data?.value) ? data.value : [];
    return jobs.filter((j) => j && j.isActive !== false);
  } catch {
    return [];
  }
}

async function fetchZohoRecruit(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

async function fetchFreshteamJobs(meta) {
  try {
    const data = await getJson(meta.apiUrl, 15000);
    if (!data) return [];
    return Array.isArray(data) ? data : data?.jobs || [];
  } catch {
    return [];
  }
}

async function fetchJobs2webHtml(meta) {
  // SuccessFactors Job2Web HTML search (JSON /services/recruiting often 401s).
  const out = [];
  const pageSize = meta.pageSize || 25;
  const base = String(meta.apiUrl || "").replace(/&?startrow=\d+/i, "").replace(/[?&]$/, "");
  const location = meta.defaultLocation || meta.searchLocation || "Hyderabad";
  const origin = (() => {
    try { return new URL(meta.boardUrl || meta.apiUrl).origin; } catch { return ""; }
  })();
  let start = 0;
  const seen = new Set();
  for (let page = 0; page < 40; page++) {
    const sep = base.includes("?") ? "&" : "?";
    const url = `${base}${sep}startrow=${start}`;
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!resp.ok) break;
      const html = await resp.text();
      const re = /class="jobTitle-link"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      let m;
      let pageCount = 0;
      while ((m = re.exec(html))) {
        let href = m[1].replace(/&amp;/g, "&");
        const title = m[2].replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim();
        const idMatch = href.match(/\/(\d+)\/?$/);
        const id = idMatch?.[1] || href;
        if (seen.has(id)) continue;
        seen.add(id);
        pageCount += 1;
        const abs = href.startsWith("http") ? href : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
        out.push({ id, title, url: abs, location, name: title });
      }
      if (pageCount === 0) break;
      start += pageSize;
      // "Page X of Y" in SF markup
      const pages = html.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
      if (pages && Number(pages[1]) >= Number(pages[2])) {
        out.complete = true;
        break;
      }
      if (pageCount < pageSize) {
        out.complete = true;
        break;
      }
    } catch {
      break;
    }
  }
  if (out.length) out.complete = true;
  return out;
}

async function fetchSuccessFactorsJobs(meta) {
  const out = [];
  const pageSize = meta.pageSize || 10;
  const locale = meta.locale || "en_US";
  const location = meta.searchLocation || "Hyderabad";
  let pageNumber = 0;
  let total = Infinity;
  while (pageNumber < 40 && out.length < total) {
    try {
      const resp = await fetch(meta.apiUrl, {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          keyword: "",
          location,
          pageSize,
          pageNumber,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!resp.ok) break;
      const data = await resp.json();
      if (!Array.isArray(data.jobSearchResult) || typeof data.totalJobs !== "number") return out;
      const batch = data.jobSearchResult;
      out.push(...batch);
      total = data.totalJobs;
      if (!batch.length) { out.complete = out.length >= total; break; }
      pageNumber += 1;
      if (out.length >= total) out.complete = true;
    } catch {
      break;
    }
  }
  return out;
}

async function fetchHtmlCareers(meta) {
  const mode = meta.scrapeMode || "wordpress-jobs";
  if (mode === "brillio") return fetchBrillioListing(meta);
  if (mode === "wise") return fetchWiseJobs(meta);
  if (mode === "avature") return fetchAvatureSearch(meta);
  if (mode === "tetrasoft") return fetchTetrasoftCareers(meta);
  if (mode === "keystone") return fetchKeystoneCareers(meta);
  if (mode === "gaudium") return fetchGaudiumCareers(meta);
  return fetchWordpressJobsListing(meta);
}




async function fetchGaudiumCareers(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const board = meta.boardUrl || meta.apiUrl;
    const location = meta.defaultLocation || "Hyderabad";
    const jobs = [];
    const seen = new Set();
    // Table: S.No | Function | Designation | Curriculum
    for (const m of html.matchAll(
      /<tr>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*([^<]+)<\/td>\s*<td[^>]*>\s*([^<]+)<\/td>\s*<td[^>]*>\s*([^<]+)<\/td>\s*<\/tr>/gi
    )) {
      const sno = m[1];
      const fn = m[2].replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();
      const designation = m[3].replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();
      const curriculum = m[4].replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();
      if (!designation || /designation/i.test(designation)) continue;
      const title =
        curriculum && curriculum !== "-"
          ? `${designation} (${curriculum})`
          : designation;
      const id = `gaudium-${sno}-${designation}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (seen.has(id)) continue;
      seen.add(id);
      jobs.push({
        id,
        title,
        location,
        url: `${board}#${id}`,
        team: fn,
      });
    }
    return jobs;
  } catch {
    return [];
  }
}

async function fetchKeystoneCareers(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const board = meta.boardUrl || meta.apiUrl;
    const defaultLoc = meta.defaultLocation || "Hyderabad";
    const jobs = [];
    const seen = new Set();
    for (const m of html.matchAll(
      /<tr class="[^"]*wixui-table__row"[^>]*>[\s\S]*?<div class="g0q0vK">([^<]+)<\/div>[\s\S]*?<div class="g0q0vK">([\s\S]*?)<\/div>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?JOB DESCRIPTION/gi
    )) {
      const title = m[1].replace(/\s+/g, " ").trim();
      if (!title || /job description/i.test(title)) continue;
      const details = m[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const href = m[3];
      let location = defaultLoc;
      const locM = details.match(/Location:\s*([^]+?)(?:Employment Type:|$)/i);
      if (locM) location = locM[1].replace(/\s+/g, " ").trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (seen.has(id)) continue;
      seen.add(id);
      jobs.push({ id, title, location, url: href || board });
    }
    return jobs;
  } catch {
    return [];
  }
}

async function fetchTetrasoftCareers(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const board = meta.boardUrl || meta.apiUrl;
    const jobs = [];
    for (const m of html.matchAll(
      /<div class="faq-item">[\s\S]*?<h4>([^<]+)<\/h4>[\s\S]*?<strong>Location:<\/strong>\s*([^<]+)[\s\S]*?(?:mailto:([^"']+))?[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi
    )) {
      const title = m[1].replace(/\s+/g, " ").trim();
      const location = m[2].replace(/\s+/g, " ").trim();
      const email = m[3] || null;
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      jobs.push({
        id,
        title,
        location,
        url: email ? `mailto:${email}?subject=${encodeURIComponent(title)}` : `${board}#${id}`,
      });
    }
    return jobs;
  } catch {
    return [];
  }
}

async function fetchWordpressJobsListing(meta) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html",
  };
  try {
    const base = meta.jobUrlBase || meta.boardUrl || "";
    const listUrls = [];
    const seenList = new Set();
    const queue = [meta.apiUrl];
    while (queue.length && listUrls.length < 8) {
      const listUrl = queue.shift();
      if (!listUrl || seenList.has(listUrl)) continue;
      seenList.add(listUrl);
      listUrls.push(listUrl);
      try {
        const resp = await fetch(listUrl, {
          headers,
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) continue;
        const html = await resp.text();
        for (const m of html.matchAll(/href=["']((?:https?:\/\/[^"'\s]+)?\/careers\/page\/\d+\/?)["']/gi)) {
          let next = m[1];
          if (next.startsWith("/")) {
            try {
              next = new URL(next, listUrl).href;
            } catch {
              continue;
            }
          }
          if (!seenList.has(next)) queue.push(next);
        }
      } catch {
        /* skip list page */
      }
    }

    const seen = new Set();
    const jobs = [];
    for (const listUrl of listUrls) {
      let html = "";
      try {
        const resp = await fetch(listUrl, {
          headers,
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) continue;
        html = await resp.text();
      } catch {
        continue;
      }
      for (const m of html.matchAll(/href=["']((?:https?:\/\/[^"'\s]+)?\/jobs\/[^"'#?]+\/?)["']/gi)) {
        let path = m[1];
        if (path.startsWith("http")) {
          try {
            path = new URL(path).pathname;
          } catch {
            continue;
          }
        }
        path = path.replace(/\/?$/, "/");
        if (!path.startsWith("/jobs/")) continue;
        if (seen.has(path)) continue;
        seen.add(path);
        const url = `${base}${path}`;
        let title = path
          .replace(/^\/jobs\//, "")
          .replace(/\/$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        let location = "";
        try {
          const jr = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(12000),
          });
          if (jr.ok) {
            const jhtml = await jr.text();
            const clean = (s) =>
              String(s || "")
                .replace(/<[^>]+>/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&#038;/g, "&")
                .replace(/\s+/g, " ")
                .trim();
            const titleTag = jhtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const h2 = jhtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
            const h1 = jhtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const fromTitle = titleTag
              ? clean(titleTag[1]).replace(/\s*[-|].*$/, "").trim()
              : "";
            const fromH2 = h2 ? clean(h2[1]) : "";
            const fromH1 = h1 ? clean(h1[1]) : "";
            const pick =
              (fromTitle && !/^careers?$/i.test(fromTitle) && fromTitle) ||
              (fromH2 && !/^careers?$/i.test(fromH2) && fromH2) ||
              (fromH1 && !/^careers?$/i.test(fromH1) && fromH1) ||
              "";
            if (pick) title = pick;
            const locM =
              jhtml.match(/spanlocation[^>]*>\s*Location:\s*<\/span>\s*([^<]+)/i) ||
              jhtml.match(/Location:\s*<\/span>\s*([^<]+)/i) ||
              jhtml.match(/Location[^<]{0,40}<\/[^>]+>\s*<[^>]+>([^<]+)/i) ||
              jhtml.match(/(Hyderabad[^<",]{0,40}|Telangana[^<",]{0,40}|Remote)/i);
            if (locM) location = String(locM[1] || locM[0] || "").replace(/\s+/g, " ").replace(/["']+$/g, "").trim();
            if (!location && /hyderabad/i.test(jhtml)) location = "Hyderabad";
          }
        } catch {
          /* keep list-page title */
        }
        jobs.push({ id: path, title, url, location });
      }
    }
    return jobs;
  } catch {
    return [];
  }
}

async function fetchBrillioListing(meta) {
  const out = [];
  const seen = new Set();
  const base = meta.jobUrlBase || "https://careers.brillio.com";
  for (let page = 1; page <= 20; page++) {
    const url =
      page === 1
        ? meta.apiUrl
        : `${meta.apiUrl}${meta.apiUrl.includes("?") ? "&" : "?"}paged=${page}`;
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) break;
      const html = await resp.text();
      let found = 0;
      for (const m of html.matchAll(
        /<div class="job-listing__item">[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<p class="location">([^<]*)<\/p>[\s\S]*?job-id=(\d+)/gi
      )) {
        const id = m[3];
        if (seen.has(id)) continue;
        seen.add(id);
        found++;
        out.push({
          id,
          title: m[1]
            .replace(/&#8211;/g, "–")
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim(),
          location: m[2].replace(/\s+/g, " ").trim(),
          url: `${base}/job-details?job-id=${id}`,
        });
      }
      if (!found) break;
    } catch {
      break;
    }
  }
  return out;
}

async function fetchWiseJobs(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const base = meta.jobUrlBase || "https://wise.jobs";
    const seen = new Set();
    const jobs = [];
    for (const m of html.matchAll(/href="(\/job\/[^"]+-jid-\d+)"[^>]*>\s*([^<]{4,120})/gi)) {
      const path = m[1];
      const title = m[2].replace(/\s+/g, " ").trim();
      if (/read more/i.test(title)) continue;
      if (seen.has(path)) continue;
      seen.add(path);
      const id = path.match(/jid-(\d+)/)?.[1] || path;
      jobs.push({
        id,
        title,
        location: /hyderabad/i.test(path) ? "Hyderabad" : "",
        url: `${base}${path}`,
      });
    }
    return jobs;
  } catch {
    return [];
  }
}

async function fetchAvatureSearch(meta) {
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const base = meta.jobUrlBase || "https://careers.loreal.com";
    const byId = new Map();
    for (const m of html.matchAll(/\/en_US\/jobs\/JobDetail\/([^"/]+)\/(\d+)/g)) {
      const id = m[2];
      if (byId.has(id)) continue;
      const slug = m[1];
      const title = decodeURIComponent(slug.replace(/-/g, " "));
      byId.set(id, {
        id,
        title,
        // Search URL is already location-faceted (Hyderabad)
        location: "Hyderabad, Telangana",
        url: `${base}/en_US/jobs/JobDetail/${slug}/${id}`,
      });
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}


async function fetchRadancyJobs(meta) {
  // Radancy returns HTML blobs inside JSON { results }
  try {
    const resp = await fetch(meta.apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    const html = json.results || "";
    const base = meta.jobUrlBase || "https://www.synchronycareers.com";
    const jobs = [];
    const seen = new Set();
    for (const m of html.matchAll(/href="(\/job\/hyderabad\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const path = m[1];
      const url = `${base}${path}`;
      if (seen.has(url)) continue;
      seen.add(url);
      let title = String(m[2] || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      title = title
        .replace(/\s+\d{2}\/\d{2}\/\d{4}\s*$/, "")
        .replace(/\s+Hyderabad.*$/i, "")
        .replace(/\s+Telangana.*$/i, "")
        .trim();
      if (!title || title.length < 4) continue;
      jobs.push({
        id: path,
        title,
        url,
        location: "Hyderabad, India",
      });
    }
    return jobs;
  } catch {
    return [];
  }
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
 * Match a direct careers / website URL against known ATS patterns.
 */
export function classifyFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  for (const { provider, regex } of HTML_ATS_PATTERNS) {
    const match = url.match(regex);
    if (match?.[1] && match[1].length >= 2) {
      const slug = match[1].toLowerCase();
      const meta = boardMeta(provider, slug, { withContent: false });
      if (meta) {
        return {
          provider,
          slug,
          boardUrl: meta.boardUrl,
        };
      }
    }
  }
  return null;
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
  if (entry.careers) {
    const fromUrl = classifyFromUrl(entry.careers);
    if (fromUrl) {
      return {
        atsProvider: fromUrl.provider,
        atsSlug: fromUrl.slug,
        atsBoardUrl: fromUrl.boardUrl,
        atsClassifiedAt: new Date().toISOString(),
      };
    }
  }
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
