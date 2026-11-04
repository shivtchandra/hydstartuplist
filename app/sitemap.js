import { getSiteUrl } from "../lib/site-url.js";
import {
  JOB_SECTOR_LANDINGS,
  JOB_AREA_LANDINGS,
  JOB_ROLE_LANDINGS,
  FRESHER_JOBS_LANDING,
  thinListingRobots,
} from "../lib/jobs-seo.js";
import { FRESHER_CATEGORIES, filterFresherJobsByCategory } from "../lib/fresher-seo.js";
import { REMOTE_CATEGORIES, filterRemoteJobsByCategory } from "../lib/remote-seo.js";
import { getJobsByArea, getJobsByRole, getJobsBySector, getFresherJobs, getRemoteJobs } from "../lib/jobs.js";
import { TELANGANA_COLLEGES } from "../lib/colleges.js";
import { INDUSTRY_LANDINGS } from "../lib/industries.js";
import { AREA_LANDINGS } from "../lib/areas.js";
import { TECH_PARKS } from "../lib/parks.js";
import { STAGE_LANDINGS } from "../lib/stages.js";
import { verifiedGccProfiles } from "../lib/gccs.js";

/**
 * Hub sitemap only. Individual job URLs live in /sitemap-jobs.xml (recent-only).
 * Startup profile URLs stay crawlable via the map + internal links but are
 * omitted here while GSC reports mass "Discovered – currently not indexed".
 * Role x area pages are also omitted: their job counts move between build workers,
 * so a listed pair could render noindex. lastModified appears only where a real
 * change date exists; a build timestamp on every URL tells Google nothing.
 */
export const revalidate = 3600;

const SITE_URL = getSiteUrl();

const STATIC_ROUTES = [
  // "/" so the homepage entry matches the URL Google indexes (GSC showed
  // "No referring sitemaps" for https://startups.mapmyhyd.com/).
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/career", priority: 0.95, changeFrequency: "daily" },
  { path: "/jobs/fresher", priority: 0.95, changeFrequency: "daily" },
  { path: "/jobs/remote", priority: 0.95, changeFrequency: "daily" },
  { path: "/colleges", priority: 0.9, changeFrequency: "daily" },
  { path: "/jobs", priority: 0.95, changeFrequency: "hourly" },
  { path: "/how-we-verify", priority: 0.6, changeFrequency: "monthly" },
  { path: "/feed", priority: 0.9, changeFrequency: "hourly" },
  { path: "/news", priority: 0.8, changeFrequency: "daily" },
  { path: "/product-companies", priority: 0.85, changeFrequency: "weekly" },
  { path: "/gccs", priority: 0.7, changeFrequency: "weekly" },
  { path: "/industries", priority: 0.85, changeFrequency: "daily" },
  { path: "/areas", priority: 0.85, changeFrequency: "daily" },
  { path: "/parks", priority: 0.85, changeFrequency: "daily" },
  { path: "/stage", priority: 0.85, changeFrequency: "daily" },
  { path: "/insights", priority: 0.7, changeFrequency: "weekly" },
  { path: "/hyderabad-tech-statistics", priority: 0.9, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/radar", priority: 0.7, changeFrequency: "weekly" },
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

// Same test the hub pages use for their robots tag, so the sitemap never submits
// a noindex URL. A failed lookup keeps the hub rather than dropping it.
async function indexableHubs(hubs, countJobs, min) {
  const flags = await Promise.all(
    hubs.map((hub) =>
      countJobs(hub)
        .then((count) => thinListingRobots(count, { min }).index)
        .catch(() => true)
    )
  );
  return hubs.filter((_, i) => flags[i]);
}

export default async function sitemap() {
  const staticEntries = STATIC_ROUTES.map(({ path: p, priority, changeFrequency }) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency,
    priority,
  }));

  const storyEntries = STORY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/stories/${slug}`,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const industryEntries = INDUSTRY_LANDINGS.map((s) => ({
    url: `${SITE_URL}/industries/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const techAreaEntries = AREA_LANDINGS.map((a) => ({
    url: `${SITE_URL}/areas/${a.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const techParkEntries = TECH_PARKS.map((p) => ({
    url: `${SITE_URL}/parks/${p.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const stageEntries = STAGE_LANDINGS.map((s) => ({
    url: `${SITE_URL}/stage/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const sectorEntries = (await indexableHubs(JOB_SECTOR_LANDINGS, async (s) => (await getJobsBySector(s.sector)).length)).map((s) => ({
    url: `${SITE_URL}/jobs/sector/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const roleEntries = (await indexableHubs(JOB_ROLE_LANDINGS, async (r) => (await getJobsByRole(r)).length)).map((r) => ({
    url: `${SITE_URL}/jobs/role/${r.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const areaEntries = (await indexableHubs(JOB_AREA_LANDINGS, async (a) => (await getJobsByArea(a.area)).length)).map((a) => ({
    url: `${SITE_URL}/jobs/in/${a.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const fresherJobs = await getFresherJobs(FRESHER_JOBS_LANDING.experienceLevels).catch(() => null);
  const fresherCategories = fresherJobs
    ? FRESHER_CATEGORIES.filter((c) => filterFresherJobsByCategory(fresherJobs, c.slug).length > 0)
    : FRESHER_CATEGORIES;
  const fresherCategoryEntries = fresherCategories.map((c) => ({
    url: `${SITE_URL}/jobs/fresher/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const remoteJobs = await getRemoteJobs().catch(() => null);
  const remoteCategories = remoteJobs
    ? REMOTE_CATEGORIES.filter((c) => filterRemoteJobsByCategory(remoteJobs, c.slug).length > 0)
    : REMOTE_CATEGORIES;
  const remoteCategoryEntries = remoteCategories.map((c) => ({
    url: `${SITE_URL}/jobs/remote/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const collegeEntries = TELANGANA_COLLEGES.map((c) => ({
    url: `${SITE_URL}/colleges/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const gccProfileEntries = verifiedGccProfiles().map((gcc) => ({
    url: `${SITE_URL}/gccs/${gcc.id}`,
    ...(gcc.verifiedAt ? { lastModified: new Date(gcc.verifiedAt) } : {}),
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  // Dedupe story paths that also appear in STATIC_ROUTES
  const seen = new Set();
  return [
    ...staticEntries,
    ...fresherCategoryEntries,
    ...remoteCategoryEntries,
    ...collegeEntries,
    ...storyEntries,
    ...industryEntries,
    ...techAreaEntries,
    ...techParkEntries,
    ...stageEntries,
    ...sectorEntries,
    ...areaEntries,
    ...roleEntries,
    ...gccProfileEntries,
  ].filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
