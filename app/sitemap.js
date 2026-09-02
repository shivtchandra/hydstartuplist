import { getSiteUrl } from "../lib/site-url.js";
import { getAllStartupSlugs } from "../lib/store.js";
import { getAllJobs, getCompaniesWithJobs } from "../lib/jobs.js";
import { jobUrlId, JOB_SECTOR_LANDINGS, JOB_AREA_LANDINGS, JOB_ROLE_LANDINGS } from "../lib/jobs-seo.js";

const SITE_URL = getSiteUrl();

const STATIC_ROUTES = [
  { path: "",         priority: 1.0, changeFrequency: "hourly"  },
  { path: "/feed",    priority: 0.9, changeFrequency: "hourly"  },
  { path: "/jobs",    priority: 0.9, changeFrequency: "hourly"  },
  { path: "/news",    priority: 0.8, changeFrequency: "daily"   },
  { path: "/product-companies", priority: 0.85, changeFrequency: "weekly" },
  { path: "/gccs",    priority: 0.7, changeFrequency: "weekly"  },
  { path: "/insights",priority: 0.7, changeFrequency: "weekly"  },
  { path: "/stories", priority: 0.7, changeFrequency: "weekly"  },
  { path: "/newsletter", priority: 0.6, changeFrequency: "monthly" },
  { path: "/submit",  priority: 0.5, changeFrequency: "monthly" },
];

const STORY_SLUGS = [
  "bengaluru-vs-hyderabad-startup-limelight",
  "hyderabad-startup-hiring-report-2026",
];

export default async function sitemap() {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const slugs = await getAllStartupSlugs();
  const startupEntries = slugs.map((slug) => ({
    url: `${SITE_URL}/startups/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const storyEntries = STORY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/stories/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const jobs = await getAllJobs();
  const jobEntries = jobs.map((job) => ({
    url: `${SITE_URL}/jobs/${jobUrlId(job.id)}`,
    lastModified: job.postedAt ? new Date(job.postedAt) : now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const companies = await getCompaniesWithJobs();
  const companyJobEntries = companies.map((c) => ({
    url: `${SITE_URL}/jobs/company/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.75,
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

  return [...staticEntries, ...startupEntries, ...storyEntries, ...sectorEntries, ...areaEntries, ...roleEntries, ...companyJobEntries, ...jobEntries];
}
