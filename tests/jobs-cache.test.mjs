import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encodeJobsSnapshot, decodeJobsSnapshot, companyResolutions } from '../lib/jobs-cache-codec.js';
import { buildCompanyMatcher, jobMatchesStartup } from '../lib/jobs-match.js';

test('compressed snapshot preserves all jobs, unicode, nulls and stale status', () => {
  const snapshot = { jobs: Array.from({ length: 20000 }, (_, i) => ({ id: String(i), company: `Employer ${i % 2000}`, title: 'Engineer — హైదరాబాద్', description: 'Full job description '.repeat(100), salary: null })), sourceStale: true, resolutions: [] };
  const encoded = encodeJobsSnapshot(snapshot);
  assert.deepEqual(decodeJobsSnapshot(encoded), snapshot);
  assert.ok(Buffer.byteLength(encoded) < 1800000);
});

test('20,000 jobs at 2,000 distinct companies resolve once per employer', () => {
  const startups = Array.from({ length: 2000 }, (_, i) => ({ id: String(i), name: `Employer ${i}`, area: 'Madhapur', sector: 'SaaS' }));
  const jobs = Array.from({ length: 20000 }, (_, i) => ({ id: String(i), company: startups[i % startups.length].name }));
  const matcher = buildCompanyMatcher(startups);
  let calls = 0;
  const resolved = companyResolutions(jobs, { resolve(name) { calls++; return matcher.resolve(name); } });
  assert.equal(calls, 2000);
  const snapshot = decodeJobsSnapshot(encodeJobsSnapshot({ jobs, resolutions: resolved }));
  assert.equal(snapshot.jobs.length, 20000);
  assert.equal(snapshot.resolutions.length, 2000);
  for (const [name, hit] of snapshot.resolutions) assert.equal(hit.startup.name, name);
});

test('oversized incompressible data returns the entire snapshot for fallback, never truncates', () => {
  const snapshot = { jobs: [{ id: 'large', description: randomBytes(1800000).toString('base64') }] };
  assert.throws(() => encodeJobsSnapshot(snapshot), error => error.snapshot === snapshot);
});

test('persisted employer resolutions preserve legacy company-page membership', () => {
  const startups = [
    { id: 'a', name: 'Acme Labs', area: 'Madhapur', sector: 'SaaS' },
    { id: 'b', name: 'Acme', area: 'Gachibowli', sector: 'Fintech' },
    { id: 'c', name: 'Zenith', active: false },
  ];
  const jobs = ['Acme Labs', 'Acme', 'Acme Labs India', 'Unknown employer', '', 'Zenith'].flatMap(company => [{ company }, { company }]);
  const legacy = buildCompanyMatcher(startups);
  let calls = 0;
  const resolutions = companyResolutions(jobs, { resolve(name) { calls++; return legacy.resolve(name); } });
  assert.equal(calls, 5);
  const restored = new Map(decodeJobsSnapshot(encodeJobsSnapshot({ resolutions })).resolutions);
  const indexed = { resolve: name => restored.get(name) || null };
  for (const startup of startups) {
    assert.deepEqual(jobs.filter(j => jobMatchesStartup(j, startup, indexed)), jobs.filter(j => jobMatchesStartup(j, startup, legacy)));
  }
  assert.equal(indexed.resolve('Unknown employer'), null);
});
