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

function loadRadar() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

export function radarMeta(geo) {
  const radar = loadRadar();
  const entries = radar.entries || [];
  const filtered = geo ? entries.filter((e) => e.geo === geo) : entries;
  const byGeo = { hyd: 0, sf: 0, remote: 0 };
  for (const e of entries) {
    if (byGeo[e.geo] != null) byGeo[e.geo] += 1;
  }
  return {
    updatedAt: radar.updatedAt,
    headline: radar.headline,
    blurb: radar.blurb,
    geos: radar.geos || GEO_LABEL,
    count: filtered.length,
    byGeo,
  };
}

/** Raw curated rows. Pass geo = "hyd" | "sf" | "remote" to filter. */
export function radarEntriesRaw(geo) {
  const entries = loadRadar().entries || [];
  return geo ? entries.filter((e) => e.geo === geo) : entries.slice();
}

/** Join curated Radar entries with map startups + live job counts. */
export async function getRadarEntries(geo) {
  const radar = loadRadar();
  const startups = await getApproved();
  const byId = new Map(startups.map((s) => [s.id, s]));

  const source = geo
    ? (radar.entries || []).filter((e) => e.geo === geo)
    : radar.entries || [];

  const rows = [];
  for (const entry of source) {
    const startup = entry.startupId ? byId.get(entry.startupId) : null;
    const name = startup?.name || entry.name;
    if (!name) continue;

    const slug = startup ? startupSlug(startup) : null;
    let jobs = [];
    if (slug) {
      try {
        jobs = (await getJobsForStartupSlug(slug)) || [];
      } catch {
        jobs = [];
      }
    }

    const careers = entry.careers || startup?.careers || null;
    rows.push({
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
      jobMode: entry.jobMode || null,
      jobModeLabel: JOB_MODE_LABEL[entry.jobMode] || null,
      geo: entry.geo || "hyd",
      geoLabel: GEO_LABEL[entry.geo] || entry.geo || "Hyderabad",
      liveJobs: jobs.length,
      sampleRoles: jobs.slice(0, 3).map((j) => ({
        id: j.id,
        title: j.title,
        work: j.work,
        url: j.url,
      })),
    });
  }
  return rows;
}
