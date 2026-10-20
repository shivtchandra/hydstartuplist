import { getJobsByArea, getJobsByRole } from "./jobs.js";
import {
  JOB_AREA_LANDINGS,
  JOB_ROLE_LANDINGS,
  areaLanding,
  jobShouldIndex,
  roleLanding,
} from "./jobs-seo.js";

export const ROLE_AREA_MIN_JOBS = 5;
export const ROLE_AREA_MIN_EMPLOYERS = 3;

export function roleAreaQualifies(jobCount, employerCount) {
  return jobCount >= ROLE_AREA_MIN_JOBS && employerCount >= ROLE_AREA_MIN_EMPLOYERS;
}

const jobKey = (job) =>
  String(job?.id || `${job?.company || ""}\u0000${job?.title || ""}\u0000${job?.location || ""}`);

function buildRoleAreaData(area, role, areaJobs, roleJobs) {
  const roleIds = new Set(roleJobs.map(jobKey));
  const jobs = areaJobs.filter((job) => roleIds.has(jobKey(job)) && jobShouldIndex(job));
  const employers = [...new Map(
    jobs
      .filter((job) => job.company)
      .map((job) => [String(job.company).trim().toLowerCase(), String(job.company).trim()])
  ).values()].sort((a, b) => a.localeCompare(b));
  const timestamps = jobs
    .map((job) => Date.parse(job.postedAt || job.sourcePostedAt || job.fetchedAt || ""))
    .filter(Number.isFinite);
  const updatedAt = timestamps.length
    ? new Date(Math.max(...timestamps)).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const indexable = roleAreaQualifies(jobs.length, employers.length);

  return {
    area,
    role,
    jobs,
    employers,
    employerCount: employers.length,
    indexable,
    updatedAt,
    title: `${role.role} Jobs in ${area.area}, Hyderabad`,
    description: `${jobs.length} current ${role.role.toLowerCase()} opening${jobs.length === 1 ? "" : "s"} in or near ${area.area}, Hyderabad across ${employers.length} employer${employers.length === 1 ? "" : "s"}, with direct job and careers links.`,
  };
}

export async function getRoleAreaData(areaSlug, roleSlug) {
  const area = areaLanding(areaSlug);
  const role = roleLanding(roleSlug);
  if (!area || !role) return null;
  const [areaJobs, roleJobs] = await Promise.all([
    getJobsByArea(area.area),
    getJobsByRole(role),
  ]);
  return buildRoleAreaData(area, role, areaJobs, roleJobs);
}

export async function getQualifiedRoleAreaPairs() {
  const [areaRows, roleRows] = await Promise.all([
    Promise.all(JOB_AREA_LANDINGS.map(async (area) => [area, await getJobsByArea(area.area)])),
    Promise.all(JOB_ROLE_LANDINGS.map(async (role) => [role, await getJobsByRole(role)])),
  ]);
  const qualified = [];
  for (const [area, areaJobs] of areaRows) {
    for (const [role, roleJobs] of roleRows) {
      const data = buildRoleAreaData(area, role, areaJobs, roleJobs);
      if (data.indexable) qualified.push(data);
    }
  }
  return qualified;
}

export async function getQualifiedRolesForArea(areaSlug) {
  const rows = await Promise.all(JOB_ROLE_LANDINGS.map((role) => getRoleAreaData(areaSlug, role.slug)));
  return rows.filter((row) => row?.indexable);
}

export async function getQualifiedAreasForRole(roleSlug) {
  const rows = await Promise.all(JOB_AREA_LANDINGS.map((area) => getRoleAreaData(area.slug, roleSlug)));
  return rows.filter((row) => row?.indexable);
}
