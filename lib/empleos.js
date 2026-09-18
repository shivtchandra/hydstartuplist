import {
  normalizeSalary,
  stripHtml,
  isSpamOrConsultancyJob,
} from "./job-content.js";
import { inferRoleType, inferExperienceLevel, normalizeSector } from "./job-facets.js";

const EMPLEOS_HYD_URL = "https://in.empleos.io/jobs/city/hyderabad-telangana";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Extract the embedded jobs array from in.empleos.io SvelteKit SSR HTML.
 */
export function extractEmpleosJobsFromHtml(html) {
  const marker = "jobs:[{";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return [];

  const arrayStart = startIdx + 5;
  let depth = 0;
  let endIdx = -1;

  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  if (endIdx === -1) return [];

  try {
    const rawJobsStr = html.slice(arrayStart, endIdx);
    const parseJobs = new Function(`return ${rawJobsStr};`);
    const raw = parseJobs();
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error("Failed to parse Empleos jobs payload:", err);
    return [];
  }
}

/**
 * Fetch and normalize live Hyderabad jobs from in.empleos.io.
 */
export async function fetchEmpleosHyderabadJobs() {
  try {
    const res = await fetch(EMPLEOS_HYD_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`in.empleos.io returned HTTP ${res.status}`);
      return { jobs: [], companies: [] };
    }

    const html = await res.text();
    const rawJobs = extractEmpleosJobsFromHtml(html);
    const now = new Date().toISOString();

    const normalizedJobs = [];
    const companies = new Set();

    for (const r of rawJobs) {
      if (!r || !r.position) continue;

      const title = String(r.position || "").trim();
      const company = String(r.companyName || "").trim();
      if (company) companies.add(company);

      const postedAt = r.updatedAt || r.createdAt || now;
      const salaryMin = parseFloat(r.salaryMin) || 0;
      const salaryMax = parseFloat(r.salaryMax) || 0;
      const salary = salaryMin > 0 || salaryMax > 0 ? normalizeSalary(salaryMin, salaryMax) : null;
      const description = r.shortDescription ? stripHtml(String(r.shortDescription)) : null;

      const job = {
        id: `empleos-${r.id}`,
        title,
        company: company || "Hyderabad Employer",
        location: r.cityTitle ? `${r.cityTitle}, Telangana` : "Hyderabad, Telangana",
        area: r.cityTitle || "Hyderabad",
        url: `https://in.empleos.io/jobs/view/${r.id}`,
        applyUrl: `https://in.empleos.io/jobs/view/${r.id}`,
        postedAt,
        sourcePostedAt: postedAt,
        firstSeenAt: now,
        fetchedAt: now,
        description,
        salary,
        logoUrl: r.companyLogo || null,
        employerType: "startup",
        source: "empleos",
        isDirect: true,
        experienceLevel: inferExperienceLevel(title, description || ""),
        role: inferRoleType(title) || "Other",
      };

      if (!isSpamOrConsultancyJob(job)) {
        normalizedJobs.push(job);
      }
    }

    return {
      jobs: normalizedJobs,
      companies: [...companies],
    };
  } catch (err) {
    console.error("fetchEmpleosHyderabadJobs error:", err);
    return { jobs: [], companies: [] };
  }
}
