export function validDate(value, now = Date.now()) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now ? new Date(time).toISOString() : null;
}

const POSTED_AFTER_DISCOVERY_TOLERANCE_MS = 12 * 60 * 60 * 1000;

/**
 * A role cannot be posted after we already discovered it. Some ATS feeds expose an updated-at
 * value as their published date, which made old roles jump back to the top after every scan.
 */
export function crediblePostedAt(job, now = Date.now()) {
  const posted = validDate(job?.sourcePostedAt || job?.postedAt, now);
  const discovered = validDate(job?.firstSeenAt, now);
  if (
    posted &&
    discovered &&
    Date.parse(posted) > Date.parse(discovered) + POSTED_AFTER_DISCOVERY_TOLERANCE_MS
  ) return null;
  return posted;
}

/** Keep the earliest credible source date for a stable requisition id. */
export function stableSourcePostedAt(previous, incoming, firstSeenAt, now = Date.now()) {
  const previousDate = validDate(previous?.sourcePostedAt || previous?.postedAt, now);
  const incomingDate = validDate(incoming?.sourcePostedAt || incoming?.postedAt, now);
  const candidate = [previousDate, incomingDate]
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0] || null;
  return crediblePostedAt({ sourcePostedAt: candidate, firstSeenAt }, now);
}

export function reconcileBoard(previous, incoming, { complete, checkedAt, baseline = false }) {
  if (!complete) return { jobs: previous, events: [] };
  const old = new Map(previous.map(j => [j.id, j]));
  const checkedTime = Date.parse(checkedAt) || Date.now();
  const jobs = incoming.map(job => {
    const prev = old.get(job.id);
    old.delete(job.id);
    const firstSeenAt = prev ? (prev.firstSeenAt || null) : (baseline ? null : checkedAt);
    const sourcePostedAt = stableSourcePostedAt(prev, job, firstSeenAt, checkedTime);
    return { ...job, sourcePostedAt,
      postedAt: sourcePostedAt,
      firstSeenAt,
      lastSeenAt: checkedAt, lastCheckedAt: checkedAt, missingScans: 0, status: 'active' };
  });
  const events = baseline ? [] : jobs.filter(j => !previous.some(p => p.id === j.id))
    .map(j => ({ jobId: j.id, type: 'discovered', at: checkedAt }));
  for (const prev of old.values()) {
    const missingScans = (prev.missingScans || 0) + 1;
    const status = missingScans >= 2 ? 'closed' : (prev.status || 'active');
    jobs.push({ ...prev, missingScans, status, lastCheckedAt: checkedAt });
    if (!baseline && status === 'closed' && prev.status !== 'closed') events.push({ jobId: prev.id, type: 'closed', at: checkedAt });
  }
  return { jobs, events };
}

function relativeAge(value, now) {
  const mins = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  return mins < 60
    ? `${mins}m ago`
    : mins < 1440
      ? `${Math.floor(mins / 60)}h ago`
      : `${Math.floor(mins / 1440)}d ago`;
}

export function freshnessLabel(job, now = Date.now()) {
  const posted = crediblePostedAt(job, now);
  const discovered = validDate(job.firstSeenAt, now);
  const value = posted || discovered;
  if (!value) return 'Posting date unavailable';
  return `${posted ? 'Posted' : 'Discovered'} ${relativeAge(value, now)}`;
}

export function verificationLabel(job, now = Date.now()) {
  const verified = validDate(job?.lastSeenAt || job?.lastCheckedAt || job?.fetchedAt, now);
  return verified ? `Verified open ${relativeAge(verified, now)}` : null;
}

export function canonicalJobUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href;
  } catch { return ''; }
}

export function deduplicateJobs(jobs) {
  const ids = new Set(), urls = new Set();
  return jobs.filter(job => {
    const url = canonicalJobUrl(job.url);
    if (ids.has(job.id) || (url && urls.has(url))) return false;
    ids.add(job.id); if (url) urls.add(url); return true;
  });
}

export function duplicatePostingKey(job) {
  const title = String(job?.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${String(job?.company || '').toLowerCase().trim()}|${title}`;
}

// Employers post one role as many requisitions (10x the same Wells Fargo row). Keep the
// freshest as the visible entry and carry the count, so a board of 68 rows is not really 55.
// The other requisitions stay in the store, so their job pages and inbound links still resolve.
export function collapseDuplicatePostings(jobs) {
  const grouped = new Map();
  for (const job of jobs) {
    const key = duplicatePostingKey(job);
    const existing = grouped.get(key);
    if (!existing) { grouped.set(key, { ...job, openings: 1 }); continue; }
    const openings = existing.openings + 1;
    const at = Date.parse(job.postedAt || job.firstSeenAt || '') || 0;
    const best = Date.parse(existing.postedAt || existing.firstSeenAt || '') || 0;
    grouped.set(key, at > best ? { ...job, openings } : { ...existing, openings });
  }
  return [...grouped.values()];
}
