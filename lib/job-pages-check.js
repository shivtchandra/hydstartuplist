import { jobUrlId } from "./jobs-seo.js";

/** URL ids of listed jobs whose static page does not exist. */
export function missingJobPages(jobs, pageExists) {
  return jobs.map((job) => jobUrlId(job)).filter((id) => !pageExists(id));
}
