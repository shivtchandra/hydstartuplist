import { getSiteUrl } from "../lib/site-url.js";
import { JOB_SECTOR_LANDINGS, JOB_AREA_LANDINGS, JOB_ROLE_LANDINGS } from "../lib/jobs-seo.js";
import { FRESHER_CATEGORIES } from "../lib/fresher-seo.js";
import { TELANGANA_COLLEGES } from "../lib/colleges.js";
import { INDUSTRY_LANDINGS } from "../lib/industries.js";
import { AREA_LANDINGS } from "../lib/areas.js";
import { TECH_PARKS } from "../lib/parks.js";
import { STAGE_LANDINGS } from "../lib/stages.js";

/**
 * Hub sitemap only. Individual job URLs live in /sitemap-jobs.xml (recent-only).
 * Startup profile URLs stay crawlable via the map + internal links but are
 * omitted here while GSC reports mass "Discovered – currently not indexed".
 */
export const revalidate = 86400;

const SITE_URL = getSiteUrl();

const STATIC_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "hourly" },
  { path: "/jobs/fresher", priority: 0.95, changeFrequency: "daily" },
  { path: "/colleges", priority: 0.9, changeFrequency: "daily" },
  { path: "/jobs", priority: 0.95, changeFrequency: "hourly" },
  { path: "/feed", priority: 0.9, changeFrequency: "hourly" },
  { path: "/news", priority: 0.8, changeFrequency: "daily" },
  { path: "/product-companies", priority: 0.85, changeFrequency: "weekly" },
  { path: "/gccs", priority: 0.7, changeFrequency: "weekly" },
  { path: "/industries", priority: 0.85, changeFrequency: "daily" },
  { path: "/areas", priority: 0.85, changeFrequency: "daily" },
  { path: "/parks", priority: 0.85, changeFrequency: "daily" },
  { path: "/stage", priority: 0.85, changeFrequency: "daily" },
  { path: "/insights", priority: 0.7, changeFrequency: "weekly" },
  { path: "/stories", priority: 0.7, changeFrequency: "weekly" },
  { path: "/stories/hyderabad-fresher-tech-hiring-guide-2026", priority: 0.85, changeFrequency: "monthly" },
  { path: "/stories/top-product-companies-hyderabad", priority: 0.8, changeFrequency: "monthly" },
  { path: "/stories/hyderabad-tech-parks-guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/stories/hyderabad-startup-hiring-report-2026", priority: 0.75, changeFrequency: "monthly" },
  { path: "/stories/t-hub-hyderabad", priority: 0.8, changeFrequency: "monthly" },
  { path: "/newsletter", priority: 0.6, changeFrequency: "monthly" },
  { path: "/submit", priority: 0.5, changeFrequency: "monthly" },
];

const STORY_SLUGS = [
  "hyderabad-fresher-tech-hiring-guide-2026",
  "top-product-companies-hyderabad",
  "hyderabad-tech-parks-guide",
  "bengaluru-vs-hyderabad-startup-limelight",
  "hyderabad-startup-hiring-report-2026",
  "space-startups-hyderabad",
  "t-hub-hyderabad",
];

export default function sitemap() {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map(({ path: p, priority, changeFrequency }) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const storyEntries = STORY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/stories/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.65,
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

  const techParkEntries = TECH_PARKS.map((p) => ({
    url: `${SITE_URL}/parks/${p.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const stageEntries = STAGE_LANDINGS.map((s) => ({
    url: `${SITE_URL}/stage/${s.slug}`,
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

  const fresherCategoryEntries = FRESHER_CATEGORIES.map((c) => ({
    url: `${SITE_URL}/jobs/fresher/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const collegeEntries = TELANGANA_COLLEGES.map((c) => ({
    url: `${SITE_URL}/colleges/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  // Dedupe story paths that also appear in STATIC_ROUTES
  const seen = new Set();
  return [
    ...staticEntries,
    ...fresherCategoryEntries,
    ...collegeEntries,
    ...storyEntries,
    ...industryEntries,
    ...techAreaEntries,
    ...techParkEntries,
    ...stageEntries,
    ...sectorEntries,
    ...areaEntries,
    ...roleEntries,
  ].filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
