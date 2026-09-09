import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeFreshJobsSnapshot, decodeJobsSnapshot } from '../lib/jobs-cache-codec.js';

test('failed source refresh cannot replace a healthy shared snapshot', () => {
  const healthy = { jobs: [{ id: 'full-feed' }], sourceStale: false, resolutions: [] };
  let cached = encodeFreshJobsSnapshot(healthy);
  const fallback = { jobs: [], sourceStale: true, resolutions: [] };
  assert.throws(() => { cached = encodeFreshJobsSnapshot(fallback); }, error =>
    error.code === 'JOBS_SOURCE_STALE' && error.snapshot === fallback);
  assert.deepEqual(decodeJobsSnapshot(cached), healthy);
  const recovered = { ...healthy, jobs: [{ id: 'new-job' }] };
  cached = encodeFreshJobsSnapshot(recovered);
  assert.deepEqual(decodeJobsSnapshot(cached), recovered);
});
