// Browser stand-in for the /api/v2 jobs endpoints. The site is a static export
// on Cloudflare Pages, so the jobs board loads /data/jobs-index.json once and
// filters, sorts, pages and groups it here with the same functions the API used.
import { filterJobs, isHydArea, jobDetailShard, mapGroups, readFilters } from './opportunities.js';

const PAGE = 30;
const REFRESH_MS = 5 * 60 * 1000;
let index = null;
let loadedAt = 0;
let pending = null;
const shards = new Map();

function loadIndex() {
  if (index && Date.now() - loadedAt < REFRESH_MS) return Promise.resolve(index);
  if (!pending) {
    pending = fetch('/data/jobs-index.json', { cache: index ? 'no-cache' : 'default' })
      .then((r) => { if (!r.ok) throw new Error('Jobs index unavailable'); return r.json(); })
      .then((d) => { index = d; loadedAt = Date.now(); return d; })
      .finally(() => { pending = null; });
  }
  return pending;
}

function loadShard(n) {
  if (!shards.has(n)) {
    shards.set(n, fetch(`/data/job-details/${n}.json`)
      .then((r) => (r.ok ? r.json() : { jobs: {} }))
      .catch(() => { shards.delete(n); return { jobs: {} }; }));
  }
  return shards.get(n);
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const encode = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decode = (s) => JSON.parse(decodeURIComponent(escape(atob(s))));

function search(data, params) {
  const filters = readFilters(params);
  const signature = JSON.stringify(filters);
  const jobs = filterJobs(data.jobs, filters);
  let offset = 0;
  const cursor = params.get('cursor');
  if (cursor) {
    let c;
    try { c = decode(cursor); } catch { return json({ error: 'Invalid cursor' }, 400); }
    if (c.version !== data.version || c.signature !== signature) return json({ reset: true, version: data.version });
    offset = Number.isSafeInteger(c.offset) && c.offset >= 0 ? c.offset : 0;
  }
  const next = offset + PAGE;
  const active = data.jobs.filter((j) => j.status !== 'closed');
  const unique = (key) => [...new Set(active.map((j) => j[key]).filter(Boolean))].sort();
  return json({
    jobs: jobs.slice(offset, next).map(({ searchText, ...j }) => j),
    total: jobs.length,
    employers: mapGroups(jobs).length,
    version: data.version,
    stale: data.stale,
    nextCursor: next < jobs.length ? encode({ version: data.version, signature, offset: next }) : null,
    facets: { roles: unique('role'), areas: [...new Set(active.map((j) => j.area).filter((a) => a && isHydArea(a)))].sort(), levels: unique('level'), types: unique('category') },
    shortcuts: {
      today: active.some((j) => j.firstSeenAt && Date.now() - Date.parse(j.firstSeenAt) < 86400000),
      early: active.some((j) => ['intern', 'junior'].includes(j.level)),
    },
  });
}

/** fetch() replacement for /api/v2/{jobs,map,jobs/detail,jobs/status}; anything else goes to the network. */
export async function jobsFetch(url, init = {}) {
  const u = new URL(url, location.origin);
  try {
    if (u.pathname === '/api/v2/jobs') return search(await loadIndex(), u.searchParams);
    if (u.pathname === '/api/v2/map') {
      const data = await loadIndex();
      const jobs = filterJobs(data.jobs, readFilters(u.searchParams));
      const work = jobs.reduce((out, j) => { out[j.work] = (out[j.work] || 0) + 1; return out; }, {});
      return json({ companies: mapGroups(jobs), total: jobs.length, version: data.version, stale: data.stale, work });
    }
    if (u.pathname === '/api/v2/jobs/detail') {
      const id = u.searchParams.get('id') || '';
      const job = (await loadShard(jobDetailShard(id))).jobs[id];
      return job ? json({ job }) : json({ error: 'Listing no longer available' }, 404);
    }
    if (u.pathname === '/api/v2/jobs/status') {
      const ids = JSON.parse(init.body || '{}').ids || [];
      const data = await loadIndex();
      const byId = new Map(data.jobs.map((j) => [j.id, j]));
      // A saved role missing from the current index has been taken down.
      return json({ jobs: ids.map((id) => ({ id, status: byId.get(id)?.status || 'closed' })), stale: data.stale });
    }
  } catch {
    return json({ error: 'Jobs temporarily unavailable' }, 503);
  }
  return fetch(url, init);
}
