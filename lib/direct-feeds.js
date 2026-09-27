import { stripHtml } from "./job-content.js";
import { inferRoleType, inferExperienceLevel } from "./job-facets.js";

/**
 * Large employers whose career sites are JS-rendered SPAs (so the priority-careers
 * HTML scraper finds nothing or junk links) but expose a public JSON search API.
 * Each feed is stored in its own job_board doc so one big employer cannot push
 * another past Firestore's 1MB doc cap. `priorityId` drops the stale scraper rows
 * from priority_careers_latest for the same employer.
 */
export const DIRECT_FEEDS = [
  {
    id: "amazon",
    company: "Amazon",
    adapter: "amazon",
    website: "https://www.amazon.jobs/",
    priorityId: "amazon",
    // Adzuna lists some Amazon roles under its Indian legal entity (Amazon Development Centre India).
    aliases: ["ADCI"],
  },
  {
    id: "jpmorgan",
    company: "JPMorgan Chase",
    adapter: "oracleHcm",
    host: "jpmc.fa.oraclecloud.com",
    siteNumber: "CX_1001",
    locationId: "300000081155702",
    website: "https://careers.jpmorgan.com/",
    priorityId: "jpmorgan",
  },
];

export const directFeedDocId = (feed) => `direct_${feed.id}_latest`;

const MAX_PAGES = 10;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isoDate(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} returned HTTP ${res.status}`);
  return res.json();
}

function toJob(feed, { sourceId, title, location, url, applyUrl, postedAt, description, now }) {
  const clean = String(title).trim();
  // Trimmed so ~500+ roles stay well under the 1MB doc cap.
  const blurb = description ? stripHtml(String(description)).slice(0, 400) : null;
  return {
    id: `${feed.id}-${sourceId}`,
    title: clean,
    company: feed.company,
    location: location || "Hyderabad, Telangana, India",
    area: "Hyderabad",
    url,
    applyUrl: applyUrl || url,
    postedAt: isoDate(postedAt) || now,
    sourcePostedAt: isoDate(postedAt) || now,
    firstSeenAt: now,
    fetchedAt: now,
    description: blurb,
    salary: null,
    website: feed.website,
    employerType: "enterprise",
    employerId: feed.id,
    source: feed.id,
    isDirect: true,
    experienceLevel: inferExperienceLevel(clean, blurb || ""),
    role: inferRoleType(clean) || "Other",
  };
}

// The Hyderabad city search also returns roles based elsewhere that merely list
// Hyderabad as an option, and "<City> - Virtual" roles that are remote but bound
// to that state. Keep Hyderabad-based roles plus remote roles open to Telangana.
const isAmazonVirtual = (r) => /\b(virtual|remote)\b/i.test(r.location || "");
function isAmazonHydOrRemote(r) {
  if (/hyderabad/i.test(r.normalized_location || "")) return true;
  return isAmazonVirtual(r) && (!r.state || r.state === "TS");
}

async function fetchAmazon(feed, now) {
  const pageSize = 100;
  const raw = [];
  let hits = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ result_limit: String(pageSize), offset: String(page * pageSize), sort: "recent" });
    params.append("normalized_city_name[]", "Hyderabad");
    const data = await getJson(`https://www.amazon.jobs/en/search.json?${params}`);
    hits = data.hits || 0;
    const batch = Array.isArray(data.jobs) ? data.jobs : [];
    raw.push(...batch);
    if (batch.length < pageSize || raw.length >= hits) break;
  }
  return {
    hits,
    jobs: raw
      .filter((r) => r?.title && r.id_icims && isAmazonHydOrRemote(r))
      .map((r) => {
        const url = `https://www.amazon.jobs${r.job_path || `/en/jobs/${r.id_icims}`}`;
        return toJob(feed, {
          sourceId: r.id_icims,
          title: r.title,
          location: isAmazonVirtual(r) ? `Remote · ${r.normalized_location || "India"}` : r.normalized_location,
          url,
          applyUrl: r.url_next_step,
          postedAt: r.posted_date,
          description: r.description_short,
          now,
        });
      }),
  };
}

// Oracle Recruiting Cloud (Candidate Experience) public REST API.
async function fetchOracleHcm(feed, now) {
  const pageSize = 100;
  const raw = [];
  let hits = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const finder = [
      `siteNumber=${feed.siteNumber}`,
      `locationId=${feed.locationId}`,
      "radius=25",
      "radiusUnit=MI",
      `limit=${pageSize}`,
      `offset=${page * pageSize}`,
      "sortBy=POSTING_DATES_DESC",
    ].join(",");
    const data = await getJson(
      `https://${feed.host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;${finder}`
    );
    const result = data.items?.[0] || {};
    hits = result.TotalJobsCount || 0;
    const batch = Array.isArray(result.requisitionList) ? result.requisitionList : [];
    raw.push(...batch);
    if (batch.length < pageSize || raw.length >= hits) break;
  }
  return {
    hits,
    jobs: raw
      .filter((r) => r?.Title && r.Id)
      .map((r) =>
        toJob(feed, {
          sourceId: r.Id,
          title: r.Title,
          location: r.PrimaryLocation,
          url: `https://${feed.host}/hcmUI/CandidateExperience/en/sites/${feed.siteNumber}/job/${r.Id}`,
          postedAt: r.PostedDate,
          description: r.ShortDescriptionStr,
          now,
        })
      ),
  };
}

const ADAPTERS = { amazon: fetchAmazon, oracleHcm: fetchOracleHcm };

/** Fetch and normalize one feed's live Hyderabad roles, deduped by id. */
export async function fetchDirectFeed(feed) {
  const now = new Date().toISOString();
  const { jobs, hits } = await ADAPTERS[feed.adapter](feed, now);
  const byId = new Map();
  for (const job of jobs) if (!byId.has(job.id)) byId.set(job.id, job);
  return { jobs: [...byId.values()], hits };
}
