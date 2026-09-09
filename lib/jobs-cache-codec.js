import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';

export const CACHE_SAFE_BYTES = 1_800_000;
export function encodeJobsSnapshot(snapshot) {
  const encoded = brotliCompressSync(JSON.stringify(snapshot), { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }).toString('base64');
  if (Buffer.byteLength(encoded) > CACHE_SAFE_BYTES) {
    const error = new Error('Jobs snapshot exceeded cache budget');
    error.snapshot = snapshot;
    throw error;
  }
  return encoded;
}
// A failed refresh must throw so Next retains the last successful cache entry.
export function encodeFreshJobsSnapshot(snapshot) {
  if (snapshot.sourceStale) {
    const error = new Error('Jobs source unavailable; retaining last successful snapshot');
    error.code = 'JOBS_SOURCE_STALE';
    error.snapshot = snapshot;
    throw error;
  }
  return encodeJobsSnapshot(snapshot);
}

export function decodeJobsSnapshot(encoded) {
  return JSON.parse(brotliDecompressSync(Buffer.from(encoded, 'base64')).toString('utf8'));
}

// Resolve once per distinct employer, then reuse across every SEO page.
export function companyResolutions(jobs, matcher) {
  return [...new Set(jobs.map(j => j.company).filter(Boolean))].map(name => {
    const hit = matcher?.resolve(name);
    if (!hit) return [name, null];
    const { id, name: startupName, area, sector } = hit.startup;
    return [name, { slug: hit.slug, startup: { id, name: startupName, area, sector } }];
  });
}
