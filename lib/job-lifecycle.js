export function validDate(value, now = Date.now()) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now ? new Date(time).toISOString() : null;
}

export function reconcileBoard(previous, incoming, { complete, checkedAt, baseline = false }) {
  if (!complete) return { jobs: previous, events: [] };
  const old = new Map(previous.map(j => [j.id, j]));
  const jobs = incoming.map(job => {
    const prev = old.get(job.id);
    old.delete(job.id);
    return { ...job, sourcePostedAt: validDate(job.sourcePostedAt || job.postedAt),
      postedAt: validDate(job.sourcePostedAt || job.postedAt),
      firstSeenAt: prev ? (prev.firstSeenAt || null) : (baseline ? null : checkedAt),
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

export function freshnessLabel(job, now = Date.now()) {
  const posted = validDate(job.sourcePostedAt || job.postedAt, now);
  const discovered = validDate(job.firstSeenAt, now);
  const value = posted || discovered;
  if (!value) return 'Posting date unavailable';
  const mins = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  const age = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
  return `${posted ? 'Posted' : 'Discovered'} ${age}`;
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
