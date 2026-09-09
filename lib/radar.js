import fs from "fs";
import path from "path";
import { getApproved } from "./store.js";
import { startupSlug } from "./slug.js";
import { getJobsForStartupSlug } from "./jobs.js";

const FILE = path.join(process.cwd(), "data", "radar.json");

const JOB_MODE_LABEL = {
  "remote-india": "Remote India",
  "hyd-office": "Hyderabad office",
  remote: "Remote",
  us: "US / remote",
};

function loadRadar() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

export function radarMeta() {
  const radar = loadRadar();
  return {
    updatedAt: radar.updatedAt,
    headline: radar.headline,
    blurb: radar.blurb,
    count: (radar.entries || []).length,
  };
}

/** Raw curated rows (no joins). Useful for admin / future auth gate. */
export function radarEntriesRaw() {
  return loadRadar().entries.slice();
}

/** Join curated Radar entries with map startups + live job counts. */
export async function getRadarEntries() {
  const radar = loadRadar();
  const startups = await getApproved();
  const byId = new Map(startups.map((s) => [s.id, s]));

  const rows = [];
  for (const entry of radar.entries || []) {
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
      id: entry.startupId || `radar-${name}`,
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
