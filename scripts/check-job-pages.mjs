// Fails the static build when the jobs board links to pages that were not exported.
// Cloudflare Pages has no server fallback, so every such link is a live 404.
import { existsSync, readFileSync } from "node:fs";
import { missingJobPages } from "../lib/job-pages-check.js";

const MAX_MISSING_SHARE = 0.01;

const { jobs } = JSON.parse(readFileSync("out/data/jobs-index.json", "utf8"));
const missing = missingJobPages(jobs, (id) => existsSync(`out/jobs/${id}.html`));
const share = jobs.length ? missing.length / jobs.length : 0;

console.log(`job pages: ${jobs.length - missing.length}/${jobs.length} listed roles have a page`);
if (share > MAX_MISSING_SHARE) {
  console.error(`Too many listed roles have no page (${missing.length}). First few:`);
  for (const id of missing.slice(0, 5)) console.error(`  /jobs/${id}`);
  process.exit(1);
}
