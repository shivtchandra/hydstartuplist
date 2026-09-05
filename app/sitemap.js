import { getSiteUrl } from "../lib/site-url.js";
import { getAllStartupSlugs } from "../lib/store.js";
import { getCompaniesWithJobs } from "../lib/jobs.js";
import { JOB_SECTOR_LANDINGS, JOB_AREA_LANDINGS, JOB_ROLE_LANDINGS } from "../lib/jobs-seo.js";
import { INDUSTRY_LANDINGS } from "../lib/industries.js";

// Request-time sitemap — avoid build-time Firestore (was timing out Hobby SSG).
export const dynamic = "force-dynamic";

const SITE_URL = getSiteUrl();

const STATIC_ROUTES = [
  { path: "",         priority: 1.0, changeFrequency: "hourly"  },
  { path: "/jobs",    priority: 0.95, changeFrequency: "hourly" },
  { path: "/feed",    priority: 0.9, changeFrequency: "hourly"  },
  { path: "/news",    priority: 0.8, changeFrequency: "daily"   },
  { path: "/product-companies", priority: 0.85, changeFrequency: "weekly" },
  { path: "/gccs",    priority: 0.7, changeFrequency: "weekly"  },
  { path: "/industries", priority: 0.85, changeFrequency: "daily" },
  { path: "/insights",priority: 0.7, changeFrequency: "weekly"  },
  { path: "/stories", priority: 0.7, changeFrequency: "weekly"  },
  { path: "/newsletter", priority: 0.6, changeFrequency: "monthly" },
  { path: "/submit",  priority: 0.5, changeFrequency: "monthly" },
];

const STORY_SLUGS = [
  "bengaluru-vs-hyderabad-startup-limelight",
  "hyderabad-startup-hiring-report-2026",
  "space-startups-hyderabad",
];

export default async function sitemap() {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const storyEntries = STORY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/stories/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const industryEntries = INDUSTRY_LANDINGS.map((s) => ({
    url: `${SITE_URL}/industries/${s.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const sectorEntries = JOB_SECTOR_LANDINGS.map((s) => ({
    url: `${SITE_URL}/jobs/sector/${s.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const roleEntries = JOB_ROLE_LANDINGS.map((r) => ({
    url: `${SITE_URL}/jobs/role/${r.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const areaEntries = JOB_AREA_LANDINGS.map((a) => ({
    url: `${SITE_URL}/jobs/in/${a.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Live data: startups + company job hubs only (skip per-job URLs — they churn
  // hourly and were doubling Firestore work via getAllJobs + getCompaniesWithJobs).
  let startupEntries = [];
  let companyJobEntries = [];
  try {
    const [slugs, companies] = await Promise.all([
      getAllStartupSlugs(),
      getCompaniesWithJobs(),
    ]);
    startupEntries = slugs.map((slug) => ({
      url: `${SITE_URL}/startups/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    companyJobEntries = companies.map((c) => ({
      url: `${SITE_URL}/jobs/company/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    }));
  } catch (err) {
    console.error("sitemap live entries failed:", err);
  }

  return [
    ...staticEntries,
    ...startupEntries,
    ...storyEntries,
    ...industryEntries,
    ...sectorEntries,
    ...areaEntries,
    ...roleEntries,
    ...companyJobEntries,
  ];
}
