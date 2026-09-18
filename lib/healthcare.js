/**
 * Healthcare and Nutrition job scrapers for Hyderabad (Docthub & Swaasa).
 * Normalizes postings into standard job schema for Hyderabad Startup Map.
 */

import { sanitizeJobHtml } from "./job-content.js";
import { inferRoleType } from "./job-facets.js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function cleanString(str) {
  return String(str || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanJobTitle(raw) {
  let t = cleanString(raw);
  t = t.replace(/\s+Jobs?\s+in\s+.*$/i, "");
  t = t.replace(/\s+Job\s+Vacancy.*$/i, "");
  t = t.replace(/\s*-\s*(?:Hyderabad|Telangana|Bengaluru|Bangalore|Mumbai|Delhi|India).*$/i, "");
  return t.trim() || cleanString(raw);
}

function isoDate(value) {
  if (value == null || value === "") return null;
  const time = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(time)) return null;
  if (time > Date.now() + 60_000) return null;
  return new Date(time).toISOString();
}

/**
 * Extract experience string or range from job data or text.
 */
export function formatExperienceRange(startYear, endYear, expText) {
  const hasStart = startYear != null && startYear !== "" && !Number.isNaN(Number(startYear));
  const hasEnd = endYear != null && endYear !== "" && !Number.isNaN(Number(endYear));
  const start = hasStart ? Number(startYear) : null;
  const end = hasEnd ? Number(endYear) : null;

  if (start === 0 && (end === 0 || end === null)) {
    return "Fresher (0–1y)";
  }
  if (start !== null && end !== null && end > 0) {
    if (start === end) return `${start} yrs`;
    return `${start}–${end} yrs`;
  }
  if (start !== null && start > 0 && (end === null || end === 0)) {
    return `${start}+ yrs`;
  }

  if (expText && typeof expText === "string") {
    const t = expText.trim();
    if (/fresh/i.test(t)) return "Fresher (0–1y)";
    const match = t.match(/(\d+)\s*(?:[-–—]|to)\s*(\d+)\s*\+?\s*(?:years?|yrs?)/i);
    if (match) return `${match[1]}–${match[2]} yrs`;
    const plusMatch = t.match(/(\d+)\s*\+\s*(?:years?|yrs?)/i);
    if (plusMatch) return `${plusMatch[1]}+ yrs`;
    if (/experienced/i.test(t)) return "Experienced";
    return t;
  }

  return null;
}

const DIETETICS_ROLE_RE =
  /\b(dietitian|dietician|nutritionist|nutrition|health coach|wellness coach|diet counselor|metabolic coach|sports nutritionist|lifestyle consultant|clinical nutrition|dietary)\b/i;

/**
 * Fetch Docthub Dietitian & Nutritionist jobs.
 * Queries search terms (dietitian, dietician, nutritionist, nutrition, etc.)
 * and fetches details, filtering strictly for Dietitian & Nutrition roles.
 */
export async function fetchDocthubHyderabadJobs() {
  const jobs = [];
  const seenIds = new Set();
  const searchTerms = [
    "dietitian",
    "dietician",
    "nutritionist",
    "nutrition",
    "clinical-nutrition",
    "health-coach",
  ];

  const targetUrls = [];
  for (const term of searchTerms) {
    targetUrls.push(`https://jobs.docthub.com/latest-jobs?cities=Hyderabad%7E2926&searchText=${term}`);
    targetUrls.push(`https://jobs.docthub.com/latest-jobs?searchText=${term}`);
  }

  const pageJobItems = [];
  for (const url of targetUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) continue;
      const html = await res.text();

      // Extract job slugs and IDs: e.g. /dietician-jobs-in-maharaja-agrasen-hospital-J125234
      const matches = [...html.matchAll(/https:\/\/jobs\.docthub\.com\/([a-z0-9-]+-J(\d+))/gi)];
      for (const m of matches) {
        const route = m[1];
        const jobId = m[2];
        if (!seenIds.has(jobId)) {
          // Check route for relevant keywords before detail fetch
          if (DIETETICS_ROLE_RE.test(route.replace(/-/g, " "))) {
            seenIds.add(jobId);
            pageJobItems.push({ id: jobId, route, url: `https://jobs.docthub.com/${route}` });
          }
        }
      }
    } catch (err) {
      console.error(`Docthub search fetch error for ${url}:`, err?.message || err);
    }
  }

  // Concurrently fetch details for matched jobs (batch size 5)
  const BATCH_SIZE = 5;
  for (let i = 0; i < pageJobItems.length; i += BATCH_SIZE) {
    const chunk = pageJobItems.slice(i, i + BATCH_SIZE);
    await Promise.all(
      chunk.map(async (item) => {
        try {
          const detailRes = await fetch(`https://jobsapi.docthub.com/api/v1/job/${item.id}`, {
            headers: {
              "User-Agent": UA,
              Origin: "https://jobs.docthub.com",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(8000),
          });

          if (detailRes.ok) {
            const json = await detailRes.json();
            const d = json?.data;
            if (d && d.title) {
              const title = cleanJobTitle(d.title);
              if (!DIETETICS_ROLE_RE.test(title) && !DIETETICS_ROLE_RE.test(d.title)) return;

              const company = cleanString(d.organization?.name || d.organizationName || "Healthcare Provider");
              const location = cleanString(
                [d.cityName || "Hyderabad", d.stateName || "Telangana", d.countryName || "India"]
                  .filter(Boolean)
                  .join(", ")
              );
              const postedAt = isoDate(d.publishedDate);
              const expText = formatExperienceRange(d.startYear, d.endYear, d.experience);

              let salary = null;
              if (d.minAmount || d.maxAmount) {
                const min = d.minAmount ? Number(d.minAmount) : null;
                const max = d.maxAmount ? Number(d.maxAmount) : null;
                const isMonthly = d.salaryType === "Monthly";
                const mult = isMonthly ? 12 : 1;
                salary = {
                  min: min ? min * mult : null,
                  max: max ? max * mult : null,
                };
              }

              jobs.push({
                id: `docthub-${d.id}`,
                title,
                company,
                location: location || "Hyderabad, Telangana",
                url: item.url,
                postedAt,
                sourcePostedAt: postedAt,
                firstSeenAt: new Date().toISOString(),
                lastCheckedAt: new Date().toISOString(),
                description: sanitizeJobHtml(d.description || d.about || "") || null,
                salary,
                source: "docthub",
                experience: expText,
                startYear: Number.isFinite(Number(d.startYear)) ? Number(d.startYear) : null,
                endYear: Number.isFinite(Number(d.endYear)) ? Number(d.endYear) : null,
                sector: "Healthtech",
                category: "other",
                keySkills: Array.isArray(d.keySkills) ? d.keySkills : [],
              });
              return;
            }
          }
        } catch {}

        const slugTitle = item.route
          .replace(/-jobs-in-.*/i, "")
          .replace(/-J\d+$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        if (DIETETICS_ROLE_RE.test(slugTitle)) {
          jobs.push({
            id: `docthub-${item.id}`,
            title: slugTitle || "Dietitian / Nutritionist",
            company: "Healthcare Provider",
            location: "Hyderabad, Telangana",
            url: item.url,
            postedAt: new Date().toISOString(),
            sourcePostedAt: new Date().toISOString(),
            firstSeenAt: new Date().toISOString(),
            lastCheckedAt: new Date().toISOString(),
            description: null,
            salary: null,
            source: "docthub",
            experience: null,
            sector: "Healthtech",
            category: "other",
          });
        }
      })
    );
  }

  return jobs;
}

/**
 * Fetch Swaasa Dietitian & Nutritionist jobs.
 * Parses Phenom People data feed embedded in Swaasa.
 */
export async function fetchSwaasaDietitianJobs() {
  const urls = [
    "https://www.swaasa.com/in/en/c/dietitiannutritionist-jobs",
    "https://www.swaasa.com/in/en/c/dietitiannutritionist-jobs?from=10&s=1",
  ];

  const jobs = [];
  const seenIds = new Set();

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;
      const html = await res.text();

      const ddoMatch = html.match(/phApp\.ddo\s*=\s*({[\s\S]*?});\s*phApp\./);
      if (!ddoMatch) continue;

      let ddo;
      try {
        ddo = JSON.parse(ddoMatch[1]);
      } catch {
        continue;
      }

      const rawJobs = ddo?.eagerLoadRefineSearch?.data?.jobs || [];
      for (const r of rawJobs) {
        const id = r.jobId || r.reqId || r.jobSeqNo;
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        const title = cleanJobTitle(r.title || r.roleName);
        const company = cleanString(r.jobCompanyName || "Healthcare Organization");
        const location = cleanString(r.location || r.cityStateCountry || r.cityState || "Hyderabad, Telangana");
        const postedAt = isoDate(r.postedDate || r.dateCreated);

        const desc = cleanString(
          r.descriptionTeaser ||
            r.ml_job_parser?.descriptionTeaser ||
            r.ml_job_parser?.descriptionTeaser_ats ||
            ""
        );

        // Parse salary if present e.g. "600000 to 800000 per year"
        let salary = null;
        if (r.salary && typeof r.salary === "string") {
          const salMatch = r.salary.match(/(\d[\d,]*)\s*(?:to|-)\s*(\d[\d,]*)/i);
          if (salMatch) {
            salary = {
              min: Number(salMatch[1].replace(/,/g, "")),
              max: Number(salMatch[2].replace(/,/g, "")),
            };
          }
        }

        // Parse experience if mentioned in description teaser
        let expText = null;
        const expMatch = desc.match(/(?:experience|exp\.?)\s*[:.-]?\s*([0-9]+(?:\s*[-–to]\s*[0-9]+)?\s*\+?\s*years?)/i);
        if (expMatch) {
          expText = cleanString(expMatch[1]);
        } else if (/fresher|entry[\s-]*level|intern/i.test(desc) || /fresher/i.test(title)) {
          expText = "Fresher (0–1y)";
        }

        const jobUrl = r.jobId
          ? `https://www.swaasa.com/in/en/job/${r.jobId}`
          : url;

        jobs.push({
          id: `swaasa-${id}`,
          title,
          company,
          location: location || "Hyderabad, Telangana",
          url: jobUrl,
          postedAt,
          sourcePostedAt: postedAt,
          firstSeenAt: new Date().toISOString(),
          lastCheckedAt: new Date().toISOString(),
          description: desc || null,
          salary,
          source: "swaasa",
          experience: expText,
          sector: "Healthtech",
          category: "other",
          keySkills: Array.isArray(r.ml_skills) ? r.ml_skills : [],
        });
      }
    } catch (err) {
      console.error(`Swaasa scrape error for ${url}:`, err?.message || err);
    }
  }

  return jobs;
}

/**
 * Combined healthcare jobs fetcher.
 * Returns aggregated, deduplicated jobs and employer names.
 */
export async function fetchHealthcareJobs() {
  const [docthubJobs, swaasaJobs] = await Promise.all([
    fetchDocthubHyderabadJobs().catch(() => []),
    fetchSwaasaDietitianJobs().catch(() => []),
  ]);

  const all = [...docthubJobs, ...swaasaJobs];
  const byId = new Map();
  const companies = new Set();

  for (const job of all) {
    if (job.company) companies.add(job.company);
    byId.set(job.id, job);
  }

  const sorted = [...byId.values()].sort((a, b) => {
    const ta = new Date(a.postedAt || a.firstSeenAt || 0).getTime();
    const tb = new Date(b.postedAt || b.firstSeenAt || 0).getTime();
    return tb - ta;
  });

  return {
    jobs: sorted,
    companies: [...companies],
    sources: {
      docthub: docthubJobs.length,
      swaasa: swaasaJobs.length,
    },
  };
}
