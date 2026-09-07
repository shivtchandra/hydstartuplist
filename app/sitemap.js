import fs from "fs";
import path from "path";
import { getSiteUrl } from "../lib/site-url.js";
import { startupSlug } from "../lib/slug.js";
import { JOB_SECTOR_LANDINGS, JOB_AREA_LANDINGS, JOB_ROLE_LANDINGS } from "../lib/jobs-seo.js";
import { INDUSTRY_LANDINGS } from "../lib/industries.js";
import { AREA_LANDINGS } from "../lib/areas.js";

// Static sitemap — no Firestore. Live job URLs churn hourly and were timing out
// Hobby SSG workers; startups come from the committed JSON seed.
export const revalidate = 86400;

const SITE_URL = getSiteUrl();

const STATIC_ROUTES = [
  { path: "",         priority: 1.0, changeFrequency: "hourly"  },
  { path: "/jobs/fresher", priority: 0.9, changeFrequency: "daily" },
  { path: "/jobs",    priority: 0.95, changeFrequency: "hourly" },
  { path: "/feed",    priority: 0.9, changeFrequency: "hourly"  },
  { path: "/news",    priority: 0.8, changeFrequency: "daily"   },
  { path: "/product-companies", priority: 0.85, changeFrequency: "weekly" },
  { path: "/gccs",    priority: 0.7, changeFrequency: "weekly"  },
  { path: "/industries", priority: 0.85, changeFrequency: "daily" },
  { path: "/areas", priority: 0.85, changeFrequency: "daily" },
  { path: "/insights",priority: 0.7, changeFrequency: "weekly"  },
  { path: "/stories", priority: 0.7, changeFrequency: "weekly"  },
  { path: "/newsletter", priority: 0.6, changeFrequency: "monthly" },
  { path: "/submit",  priority: 0.5, changeFrequency: "monthly" },
];

const STORY_SLUGS = [
  "bengaluru-vs-hyderabad-startup-limelight",
  "hyderabad-startup-hiring-report-2026",
  "space-startups-hyderabad",
  "t-hub-hyderabad",
];

function readStartupSlugs() {
  try {
    const file = path.join(process.cwd(), "data", "startups.json");
    const all = JSON.parse(fs.readFileSync(file, "utf-8"));
    return all.filter((s) => s.active !== false).map(startupSlug);
  } catch {
    return [];
  }
}

export default function sitemap() {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map(({ path: p, priority, changeFrequency }) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const startupEntries = readStartupSlugs().map((slug) => ({
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

  const industryEntries = INDUSTRY_LANDINGS.map((s) => ({
    url: `${SITE_URL}/industries/${s.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const techAreaEntries = AREA_LANDINGS.map((a) => ({
    url: `${SITE_URL}/areas/${a.slug}`,
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

  return [
    ...staticEntries,
    ...startupEntries,
    ...storyEntries,
    ...industryEntries,
    ...techAreaEntries,
    ...sectorEntries,
    ...areaEntries,
    ...roleEntries,
  ];
}
