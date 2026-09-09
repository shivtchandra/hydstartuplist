import fs from "fs";
import path from "path";
import { getApproved } from "./store.js";
import { startupSlug } from "./slug.js";
import { getJobsForStartupSlug } from "./jobs.js";

const FILE = path.join(process.cwd(), "data", "radar.json");

const JOB_MODE_LABEL = {
  "remote-india": "Remote India",
  "hyd-office": "Hyderabad office",
  remote: "Full remote",
  us: "US / SF",
};

const GEO_LABEL = {
  hyd: "Hyderabad",
  sf: "San Francisco",
  remote: "Full remote",
};

/** Fallback copy if radar.json missReasons map is missing. */
export const DEFAULT_MISS_REASONS = {
  gem: "Careers on Gem (no public directory; not Greenhouse/Ashby)",
  zoho: "Careers on Zoho Recruit (long-tail ATS)",
  "remote-india": "Roles labeled Remote India / SF — fail Hyd city filters",
  "us-hq-hyd-office": "US/global brand; Hyd office under India entity name",
  incubator: "Incubator / CIE / T-Hub / D-Labs pin — easy to miss outside cohort lists",
  outskirts: "Office outside HITEC/Gachibowli corridor",
  "funding-list": "Small/early raise — below Inc42 Top-N paywall cutoff",
  "marketing-careers": "Careers buried on marketing site (no known ATS board)",
  keka: "Careers on Keka",
  rippling: "Careers on Rippling",
};

function loadRadar() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

export function missReasonCatalog() {
  const radar = loadRadar();
  return radar.missReasons || DEFAULT_MISS_REASONS;
}

export function radarIntake() {
  return loadRadar().intake || null;
}

export function radarMeta(geo) {
  const radar = loadRadar();
  const entries = radar.entries || [];
  const filtered = geo ? entries.filter((e) => e.geo === geo) : entries;
  const byGeo = { hyd: 0, sf: 0, remote: 0 };
  for (const e of entries) {
    if (byGeo[e.geo] != null) byGeo[e.geo] += 1;
  }
  const missCounts = {};
  for (const e of filtered) {
    for (const m of e.missReasons || []) {
      missCounts[m] = (missCounts[m] || 0) + 1;
    }
  }
  const exclusive = radar.exclusiveList || {};
  const exclusiveCore = exclusive.core || [];
  const exclusiveWatch = exclusive.watch || [];
  return {
    updatedAt: radar.updatedAt,
    headline: radar.headline,
    blurb: radar.blurb,
    geos: radar.geos || GEO_LABEL,
    missReasons: radar.missReasons || DEFAULT_MISS_REASONS,
    intake: radar.intake || null,
    schema: radar.schema || null,
    curationBar: radar.curationBar || null,
    discoveryQueue: radar.discoveryQueue || null,
    exclusiveList: {
      status: exclusive.status || null,
      coreCount: exclusiveCore.length,
      watchCount: exclusiveWatch.length,
      total: exclusiveCore.length + exclusiveWatch.length,
    },
    count: filtered.length,
    byGeo,
    missCounts,
    depthEnriched: filtered.filter((e) => e.depth && (e.depth.founders || []).length).length,
  };
}

/** Raw curated rows. Pass geo = "hyd" | "sf" | "remote" to filter. */
export function radarEntriesRaw(geo) {
  const entries = loadRadar().entries || [];
  return geo ? entries.filter((e) => e.geo === geo) : entries.slice();
}

/**
 * Public-safe founder teaser (names/roles only — no LinkedIn URLs).
 * Full depth (LinkedIns, sources, researchNotes) stays behind includeDepth.
 */
export function publicFounderTeaser(entry) {
  const founders = entry?.depth?.founders || [];
  if (founders.length) {
    return founders.map((f) => ({ name: f.name, role: f.role || null }));
  }
  return (entry?.founderNames || []).map((name) => ({ name, role: null }));
}

/** Join curated Radar entries with map startups + live job counts.
 *  @param {string} [geo]
 *  @param {{ includeDepth?: boolean }} [opts] — set includeDepth for login-gated research fields later
 */
export async function getRadarEntries(geo, opts = {}) {
  const includeDepth = !!opts.includeDepth;
  const includeJobs = opts.includeJobs !== false;
  const exclusiveOnly = !!opts.exclusiveOnly;
  const radar = loadRadar();
  const catalog = radar.missReasons || DEFAULT_MISS_REASONS;
  const startups = await getApproved();
  const byId = new Map(startups.map((s) => [s.id, s]));

  let source = geo
    ? (radar.entries || []).filter((e) => e.geo === geo)
    : radar.entries || [];
  if (exclusiveOnly) {
    source = source.filter((e) => e.exclusiveTier === "core" || e.exclusiveTier === "watch");
  }

  const rows = [];
  for (const entry of source) {
    const startup = entry.startupId ? byId.get(entry.startupId) : null;
    const name = startup?.name || entry.name;
    if (!name) continue;

    const slug = startup ? startupSlug(startup) : null;
    let jobs = [];
    if (includeJobs && slug) {
      try {
        jobs = (await getJobsForStartupSlug(slug)) || [];
      } catch {
        jobs = [];
      }
    }

    const missReasons = entry.missReasons || [];
    const careers = entry.careers || startup?.careers || null;
    const row = {
      id: entry.startupId || `radar-${entry.geo || "x"}-${name}`,
      name,
      website: startup?.website || entry.website || null,
      sector: startup?.sector || null,
      area: startup?.area || null,
      slug,
      onMap: entry.onMap !== false && !!startup,
      careers,
      tags: entry.tags || [],
      why: entry.why || "",
      missReasons,
      missReasonLabels: missReasons.map((m) => catalog[m] || m),
      jobMode: entry.jobMode || null,
      jobModeLabel: JOB_MODE_LABEL[entry.jobMode] || null,
      geo: entry.geo || "hyd",
      geoLabel: GEO_LABEL[entry.geo] || entry.geo || "Hyderabad",
      aliases: entry.aliases || [],
      exclusiveTier: entry.exclusiveTier || null,
      tierNote: entry.tierNote || null,
      founders: publicFounderTeaser(entry),
      hasDepth: !!(entry.depth && (entry.depth.founders || []).length),
      liveJobs: jobs.length,
      sampleRoles: jobs.slice(0, 3).map((j) => ({
        id: j.id,
        title: j.title,
        work: j.work,
        url: j.url,
      })),
    };
    if (includeDepth && entry.depth) {
      row.depth = entry.depth;
    }
    rows.push(row);
  }

  const tierRank = { core: 0, watch: 1 };
  rows.sort((a, b) => {
    const ta = tierRank[a.exclusiveTier] ?? 9;
    const tb = tierRank[b.exclusiveTier] ?? 9;
    if (ta !== tb) return ta - tb;
    return String(a.name).localeCompare(String(b.name));
  });
  return rows;
}

/** Classify a careers URL host into an ATS / miss-reason hint. */
export function classifyCareersHost(url) {
  if (!url) return "other";
  const u = String(url).toLowerCase();
  if (u.includes("jobs.gem.com")) return "gem";
  if (u.includes("zohorecruit") || u.includes("zoho.com/recruit")) return "zoho";
  if (u.includes("keka.com")) return "keka";
  if (u.includes("rippling.com")) return "rippling";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (u.includes("greenhouse.io") || u.includes("boards.greenhouse")) return "greenhouse";
  if (u.includes("lever.co")) return "lever";
  if (u.includes("myworkdayjobs.com") || u.includes("workday.com")) return "workday";
  if (u.includes("jobs.lever.co")) return "lever";
  return "other";
}
