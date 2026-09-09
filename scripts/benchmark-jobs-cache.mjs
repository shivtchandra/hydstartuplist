import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { buildCompanyMatcher } from '../lib/jobs-match.js';
import { companyResolutions, encodeJobsSnapshot, decodeJobsSnapshot } from '../lib/jobs-cache-codec.js';

const { jobs } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const startups = JSON.parse(fs.readFileSync('data/startups.json', 'utf8'));
const start = performance.now();
const resolutions = companyResolutions(jobs, buildCompanyMatcher(startups));
const resolveMs = performance.now() - start;
for (const multiplier of [1, 5, 10]) {
  const expanded = Array.from({ length: multiplier }, (_, copy) => jobs.map(j => ({ ...j, id: `${copy}:${j.id}` }))).flat();
  const snapshot = { jobs: expanded, resolutions, sourceStale: false };
  const t = performance.now();
  const encoded = encodeJobsSnapshot(snapshot);
  const decoded = decodeJobsSnapshot(encoded);
  const index = new Map(decoded.resolutions);
  const lookupStart = performance.now();
  for (const j of expanded) index.get(j.company);
  console.log(JSON.stringify({ jobs: expanded.length, employers: resolutions.length, rawBytes: Buffer.byteLength(JSON.stringify(snapshot)), cacheBytes: Buffer.byteLength(encoded), roundTripMs: Math.round(lookupStart-t), indexedLookupMs: +(performance.now()-lookupStart).toFixed(2), initialResolveMs: Math.round(resolveMs) }));
}
