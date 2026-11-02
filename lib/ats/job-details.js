// Workday, Eightfold and SmartRecruiters list endpoints carry no description, which left
// 42% of the feed with an empty job page. Each role needs one extra request, so a
// description is fetched once and then carried over from the previous feed.
const DETAIL_PROVIDERS = new Set(["workday", "eightfold", "smartrecruiters"]);
const REQUEST_TIMEOUT_MS = 12_000;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

export function supportsJobDetails(provider) {
  return DETAIL_PROVIDERS.has(provider);
}

/** Detail endpoint for one raw list row, or null when the row lacks what it needs. */
export function jobDetailUrl(provider, meta, slug, raw) {
  if (provider === "workday") {
    const path = raw.externalPath;
    if (!path || !meta.apiUrl) return null;
    return `${meta.apiUrl.replace(/\/jobs\/?$/, "")}${path}`;
  }
  if (provider === "eightfold") {
    if (!raw.id || !meta.apiUrl) return null;
    const list = new URL(meta.apiUrl);
    const domain = list.searchParams.get("domain");
    // Tenants on the newer PCSX API (Qualcomm, BMS) have a separate details route.
    if (list.pathname.includes("/api/pcsx/")) {
      return `${list.origin}/api/pcsx/position_details?position_id=${encodeURIComponent(raw.id)}&domain=${encodeURIComponent(domain || "")}&hl=en`;
    }
    list.pathname = `${list.pathname.replace(/\/+$/, "")}/${raw.id}`;
    list.search = domain ? `?domain=${encodeURIComponent(domain)}` : "";
    return list.toString();
  }
  if (provider === "smartrecruiters") {
    if (!raw.id) return null;
    return `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings/${encodeURIComponent(raw.id)}`;
  }
  return null;
}

/** Copies the description into the raw row, in the field normalize.js reads for that provider. */
export function applyJobDetail(provider, raw, detail) {
  if (provider === "workday") {
    const text = detail?.jobPostingInfo?.jobDescription;
    return text ? { ...raw, description: text } : null;
  }
  if (provider === "eightfold") {
    const text = detail?.job_description || detail?.jobDescription || detail?.data?.jobDescription || detail?.data?.job_description;
    return text ? { ...raw, description: text } : null;
  }
  if (provider === "smartrecruiters") {
    const sections = detail?.jobAd?.sections;
    // Years and degree requirements live in qualifications, not jobDescription.
    const text = [sections?.jobDescription?.text, sections?.qualifications?.text].filter(Boolean).join("\n");
    return text ? { ...raw, jobAd: { sections: { jobDescription: { text } } } } : null;
  }
  return null;
}

/**
 * Fetches descriptions for up to `limit` rows, stopping at `deadline`.
 * Returns Map(row -> enriched raw row); a failed request just leaves that row for the next run.
 */
export async function fetchJobDetails(provider, meta, slug, rows, { limit = 40, concurrency = provider === "eightfold" ? 1 : 4, deadline = Infinity, fetchImpl = fetch } = {}) {
  const enriched = new Map();
  const queue = rows.slice(0, limit);
  let next = 0;

  async function worker() {
    while (next < queue.length && Date.now() < deadline) {
      const raw = queue[next++];
      const url = jobDetailUrl(provider, meta, slug, raw);
      if (!url) continue;
      try {
        const resp = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        // Rate limited: stop for this board and let the next run pick up the rest.
        if (resp.status === 429) return;
        if (!resp.ok) continue;
        const merged = applyJobDetail(provider, raw, await resp.json());
        if (merged) enriched.set(raw, merged);
      } catch {
        // Retried on the next scan.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => worker()));
  return enriched;
}
