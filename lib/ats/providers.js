/** Board URL builders and raw list extractors per ATS provider. */

export const ATS_PROVIDERS = [
  "greenhouse",
  "lever",
  "ashby",
  "recruitee",
  "workable",
  "breezy",
  "smartrecruiters",
];

export function boardMeta(provider, slug, { withContent = true } = {}) {
  const s = String(slug || "").toLowerCase();
  switch (provider) {
    case "greenhouse":
      return {
        apiUrl: withContent
          ? `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`
          : `https://boards-api.greenhouse.io/v1/boards/${s}/jobs`,
        boardUrl: `https://boards.greenhouse.io/${s}`,
      };
    case "lever":
      return {
        apiUrl: `https://api.lever.co/v0/postings/${s}?mode=json`,
        boardUrl: `https://jobs.lever.co/${s}`,
      };
    case "ashby":
      return {
        apiUrl: `https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`,
        boardUrl: `https://jobs.ashbyhq.com/${s}`,
      };
    case "recruitee":
      return {
        apiUrl: `https://${s}.recruitee.com/api/offers/`,
        boardUrl: `https://${s}.recruitee.com/`,
      };
    case "workable":
      return {
        apiUrl: `https://apply.workable.com/api/v1/widget/accounts/${s}?details=true`,
        boardUrl: `https://apply.workable.com/${s}/`,
      };
    case "breezy":
      return {
        apiUrl: `https://${s}.breezy.hr/api/v1/jobs`,
        boardUrl: `https://${s}.breezy.hr/`,
      };
    case "smartrecruiters":
      return {
        apiUrl: `https://api.smartrecruiters.com/v1/companies/${s}/postings`,
        boardUrl: `https://jobs.smartrecruiters.com/${s}`,
      };
    default:
      return null;
  }
}

export function extractRawJobs(provider, data) {
  if (!data) return null;
  if (provider === "greenhouse") return data.jobs || null;
  if (provider === "lever") return Array.isArray(data) ? data : null;
  if (provider === "ashby") return data.jobs || null;
  if (provider === "recruitee") return data.offers || null;
  if (provider === "workable") return data.jobs || null;
  if (provider === "breezy") return Array.isArray(data) ? data : null;
  if (provider === "smartrecruiters") return data.content || null;
  return null;
}

export function locationOf(provider, job) {
  if (provider === "greenhouse") return job.location?.name || "";
  if (provider === "lever") return job.categories?.location || "";
  if (provider === "ashby") {
    return (
      job.location ||
      job.locationName ||
      (Array.isArray(job.addressLocality) ? job.addressLocality.join(" ") : "") ||
      ""
    );
  }
  if (provider === "recruitee") return `${job.city || ""} ${job.country || ""} ${job.location || ""}`;
  if (provider === "workable") return `${job.city || ""} ${job.country || ""} ${job.location?.city || ""}`;
  if (provider === "breezy") return `${job.location?.city || ""} ${job.location?.country?.name || ""}`;
  if (provider === "smartrecruiters") return `${job.location?.city || ""} ${job.location?.country || ""}`;
  return "";
}

export const HTML_ATS_PATTERNS = [
  { provider: "greenhouse", regex: /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/([a-z0-9_-]+)/i },
  { provider: "lever", regex: /jobs\.lever\.co\/([a-z0-9_-]+)/i },
  { provider: "ashby", regex: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i },
  { provider: "recruitee", regex: /([a-z0-9_-]+)\.recruitee\.com/i },
  { provider: "workable", regex: /apply\.workable\.com\/([a-z0-9_-]+)/i },
  { provider: "breezy", regex: /([a-z0-9_-]+)\.breezy\.hr/i },
  { provider: "smartrecruiters", regex: /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/i },
];
