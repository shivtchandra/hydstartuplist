'use client';

// Career hub: resume once → AI-ranked, explained matches → per-job tailored
// resume, cover letter and answers → user reviews → applies on the employer's
// own page. Everything is stored in this browser (localStorage), no login.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractResumeText } from '../../lib/resume/parse-client.js';
import { shortlistJobs } from '../../lib/career/prefilter.js';
import { profileHash } from '../../lib/career/openai.js';
import { jobsFetch } from '../../lib/opportunities-client.js';
import {
  PASSPORT_STORAGE_KEY,
  buildExtensionHandoff,
  createApplicationPack,
  normalizePassport,
} from '../../lib/application-pack.js';

const STORE_KEY = 'mapmyhyd_career_v2';
const SHORTLIST = 40;
const BATCH = 8;
const MIN_DESCRIPTION = 300;
const STEPS = [
  { id: 'resume', label: 'Resume' },
  { id: 'matches', label: 'Matches' },
  { id: 'pack', label: 'Apply pack' },
  { id: 'tracker', label: 'Applications' },
];
const STATUSES = ['saved', 'tailored', 'applied', 'interview', 'offer', 'rejected'];
const LEVELS = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'];
const CONTACT = [
  ['fullName', 'Full name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['location', 'City'],
  ['linkedin', 'LinkedIn URL'],
  ['noticePeriod', 'Notice period'],
  ['expectedCtc', 'Expected CTC'],
];

function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved;
  } catch {}
  // One-time migration from the old Apply Copilot keys.
  const out = { resumeText: '', profile: null, resumeHash: '', matches: {}, applications: {} };
  try {
    out.resumeText = localStorage.getItem('mapmyhyd_master_resume_text') || '';
    const passport = JSON.parse(localStorage.getItem(PASSPORT_STORAGE_KEY) || 'null');
    if (!out.resumeText && passport?.masterResume) out.resumeText = String(passport.masterResume);
  } catch {}
  return out;
}

function readPassport() {
  try { return normalizePassport(JSON.parse(localStorage.getItem(PASSPORT_STORAGE_KEY) || '{}')); } catch { return normalizePassport({}); }
}

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function loadJobDetail(id) {
  try {
    const res = await jobsFetch(`/api/v2/jobs/detail?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return (await res.json()).job || null;
  } catch { return null; }
}

function daysAgo(job) {
  const t = Date.parse(job.postedAt || job.sourcePostedAt || job.firstSeenAt || '');
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null;
}

function postedLabel(job) {
  const d = daysAgo(job);
  if (d === null) return '';
  return d <= 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`;
}

function safeName(s) {
  return String(s || '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 40) || 'resume';
}

function download(name, text, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Plain, single-column, ATS-safe print layout.
function printResume(text, title) {
  const lines = String(text || '').split('\n');
  let html = '';
  let inList = false;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const bullet = /^[-•*▪◦]\s+/.test(line);
    if (inList && !bullet) { html += '</ul>'; inList = false; }
    if (!line) return;
    if (bullet) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${escapeHtml(line.replace(/^[-•*▪◦]\s+/, ''))}</li>`;
    } else if (i === 0) html += `<h1>${escapeHtml(line.replace(/^#+\s*/, ''))}</h1>`;
    else if (/^#+\s/.test(line) || (line.length < 40 && line === line.toUpperCase() && /[A-Z]/.test(line))) {
      html += `<h2>${escapeHtml(line.replace(/^#+\s*/, ''))}</h2>`;
    } else html += `<p>${escapeHtml(line)}</p>`;
  });
  if (inList) html += '</ul>';
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body{font:11pt/1.4 Arial,Helvetica,sans-serif;color:#111;max-width:720px;margin:32px auto;padding:0 24px}
    h1{font-size:18pt;margin:0 0 4px}h2{font-size:11.5pt;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #999;margin:16px 0 6px;padding-bottom:2px}
    p{margin:2px 0}ul{margin:4px 0 4px 18px;padding:0}li{margin:2px 0}@page{margin:14mm}
  </style></head><body>${html}<script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
}

export default function CareerHub() {
  const [store, setStore] = useState(null);
  const [step, setStep] = useState('resume');
  const [passport, setPassport] = useState(() => normalizePassport({}));
  const hydrated = useRef(false);

  useEffect(() => {
    const s = readStore();
    setStore(s);
    setPassport(readPassport());
    const jobParam = new URLSearchParams(location.search).get('job');
    if (jobParam) setPendingJob(jobParam);
    setStep(s.profile ? (jobParam ? 'pack' : 'matches') : 'resume');
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || !store) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  }, [store]);

  const update = useCallback((patch) => setStore((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);

  const savePassport = useCallback((next) => {
    setPassport(next);
    try {
      const prev = JSON.parse(localStorage.getItem(PASSPORT_STORAGE_KEY) || '{}');
      localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify({ ...prev, ...next }));
    } catch {}
  }, []);

  // ---- Apply pack target (from ?job= or a match card) ----
  const [pendingJob, setPendingJob] = useState('');
  const [packJob, setPackJob] = useState(null);
  const [packJobError, setPackJobError] = useState('');

  useEffect(() => {
    if (!pendingJob) return;
    let cancelled = false;
    setPackJobError('');
    loadJobDetail(pendingJob).then((job) => {
      if (cancelled) return;
      if (job) setPackJob({ ...job, id: job.id || pendingJob });
      else setPackJobError('This listing is no longer available.');
    });
    return () => { cancelled = true; };
  }, [pendingJob]);

  const openPack = useCallback((job) => {
    setPackJob(null);
    setPendingJob(job.id);
    setStep('pack');
    update((s) => {
      if (s.applications[job.id]) return {};
      return { applications: { ...s.applications, [job.id]: { job: pickJob(job), status: 'saved', dates: { saved: new Date().toISOString() } } } };
    });
    try { history.replaceState(null, '', `/career?job=${encodeURIComponent(job.id)}`); } catch {}
  }, [update]);

  if (!store) return <div className="ch-shell"><p className="ch-muted">Loading…</p></div>;

  const appCount = Object.keys(store.applications || {}).length;

  return (
    <div className="ch-shell">
      <header className="ch-head">
        <span className="ch-eyebrow">Career hub</span>
        <h1>Find the jobs you actually fit. Apply with a resume made for each one.</h1>
        <p className="ch-muted">
          Upload your resume once. We read every live Hyderabad job description against it, explain each match with
          proof from your resume, and draft a tailored resume, cover letter and answers. You review everything and
          apply on the company&apos;s own page. Your data stays in this browser.
        </p>
      </header>

      <nav className="ch-steps" aria-label="Career hub steps">
        {STEPS.map((s, i) => {
          const disabled = s.id !== 'resume' && s.id !== 'tracker' && !store.profile;
          return (
            <button
              key={s.id}
              type="button"
              className={`ch-step${step === s.id ? ' is-active' : ''}`}
              disabled={disabled}
              onClick={() => setStep(s.id)}
            >
              <span className="ch-step-n">{i + 1}</span>
              {s.label}
              {s.id === 'tracker' && appCount > 0 && <span className="ch-count">{appCount}</span>}
            </button>
          );
        })}
      </nav>

      {step === 'resume' && (
        <ResumeStep
          store={store}
          update={update}
          onDone={() => setStep(pendingJob ? 'pack' : 'matches')}
        />
      )}
      {step === 'matches' && store.profile && <MatchesStep store={store} update={update} onPick={openPack} />}
      {step === 'pack' && store.profile && (
        <PackStep
          store={store}
          update={update}
          job={packJob}
          jobError={packJobError}
          loading={Boolean(pendingJob) && !packJob && !packJobError}
          passport={passport}
          savePassport={savePassport}
          onBrowse={() => setStep('matches')}
        />
      )}
      {step === 'tracker' && <TrackerStep store={store} update={update} onOpen={openPack} />}
    </div>
  );
}

function pickJob(job) {
  return {
    id: String(job.id),
    title: job.title || '',
    company: job.company || '',
    location: job.location || '',
    applyUrl: job.applyUrl || job.url || '',
    work: job.work || '',
    level: job.level || '',
  };
}

// ---------------------------------------------------------------- Resume

function ResumeStep({ store, update, onDone }) {
  const [text, setText] = useState(store.resumeText || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const profile = store.profile;

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy('Reading your file…');
    try { setText(await extractResumeText(file)); } catch (err) { setError(err.message); }
    setBusy('');
  }

  async function analyze() {
    const clean = text.trim();
    if (clean.length < 80) { setError('Paste or upload your full resume first.'); return; }
    setError('');
    setNotice('');
    setBusy('Reading your resume…');
    const { ok, data } = await postJson('/api/career/profile', { resumeText: clean });
    setBusy('');
    if (!ok || !data.profile) { setError(data.error || 'Could not read your resume. Try again.'); return; }
    const hash = profileHash(clean);
    update((s) => ({
      resumeText: clean,
      profile: data.profile,
      resumeHash: hash,
      matches: s.resumeHash === hash ? s.matches : {},
    }));
    if (data.mode === 'fallback') setNotice('AI was unavailable, so this is a basic keyword read. Matches will be rougher until it is back.');
  }

  function patchProfile(patch) {
    update((s) => ({ profile: { ...s.profile, ...patch } }));
  }

  return (
    <section className="ch-card">
      <div className="ch-row ch-space">
        <h2>Your resume</h2>
        <div className="ch-row">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={onFile} />
          <button type="button" className="btn-ghost ch-btn" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
            Upload PDF / DOCX
          </button>
        </div>
      </div>
      <textarea
        className="ch-textarea"
        rows={profile ? 8 : 14}
        placeholder="…or paste your resume text here"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="ch-row">
        <button type="button" className="btn ch-btn" onClick={analyze} disabled={Boolean(busy)}>
          {busy || (profile ? 'Re-read resume' : 'Read my resume')}
        </button>
        {profile && <button type="button" className="btn-ghost ch-btn" onClick={onDone}>See matches →</button>}
      </div>
      {error && <p className="ch-error">{error}</p>}
      {notice && <p className="ch-note">{notice}</p>}

      {profile && (
        <div className="ch-profile">
          <div className="ch-profile-head">
            <div>
              <strong>{profile.name || 'Your profile'}</strong>
              {profile.headline && <span className="ch-muted"> · {profile.headline}</span>}
            </div>
            <span className="ch-muted">{profile.source === 'fallback' ? 'Basic read' : 'Read by AI'} · check and fix below</span>
          </div>
          <div className="ch-grid">
            <label className="ch-field">
              <span>Level</span>
              <select value={profile.level || 'mid'} onChange={(e) => patchProfile({ level: e.target.value })}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="ch-field">
              <span>Years of experience</span>
              <input
                type="number"
                min="0"
                max="50"
                value={profile.yearsExperience ?? ''}
                onChange={(e) => patchProfile({ yearsExperience: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="ch-field ch-wide">
              <span>Target roles (comma separated)</span>
              <input
                value={(profile.targetTitles || []).join(', ')}
                onChange={(e) => patchProfile({ targetTitles: e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6) })}
              />
            </label>
            <label className="ch-field ch-check">
              <input type="checkbox" checked={Boolean(profile.openToRemote)} onChange={(e) => patchProfile({ openToRemote: e.target.checked })} />
              <span>Open to remote</span>
            </label>
          </div>
          <p className="ch-label">Skills we found, each backed by a line in your resume</p>
          <div className="ch-chips">
            {(profile.skills || []).map((s) => (
              <span key={s.name} className={`ch-chip is-${s.strength}`} title={s.evidence ? `“${s.evidence}”` : ''}>
                {s.name}
                <button
                  type="button"
                  aria-label={`Remove ${s.name}`}
                  onClick={() => patchProfile({ skills: profile.skills.filter((x) => x.name !== s.name) })}
                >×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Matches

function MatchesStep({ store, update, onPick }) {
  const { profile, resumeText, resumeHash } = store;
  const [shortlist, setShortlist] = useState(null);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ min: 0, remote: false, level: '', posted: 0 });
  const runId = useRef(0);

  const run = useCallback(async () => {
    const id = ++runId.current;
    setError('');
    setPhase('Finding jobs that could fit…');
    let index;
    try {
      const res = await fetch('/data/jobs-index.json');
      index = await res.json();
    } catch {
      setError('Could not load jobs. Check your connection and retry.');
      setPhase('');
      return;
    }
    const top = shortlistJobs(index.jobs || [], profile, { limit: SHORTLIST });
    setPhase(`Reading ${top.length} job descriptions…`);
    const details = await Promise.all(top.map((r) => loadJobDetail(r.job.id)));
    if (id !== runId.current) return;
    const rows = top.map((r, i) => {
      const description = String(details[i]?.description || '');
      return { ...r, job: { ...r.job, applyUrl: details[i]?.applyUrl || r.job.applyUrl }, description, hasInfo: description.length >= MIN_DESCRIPTION };
    });
    setShortlist(rows);

    const cached = store.matches || {};
    const todo = rows.filter((r) => r.hasInfo && !cached[r.job.id]);
    let failed = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
      if (id !== runId.current) return;
      setPhase(`Scoring matches with AI… ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
      const batch = todo.slice(i, i + BATCH);
      const { ok, data } = await postJson('/api/career/match', {
        resumeText,
        jobs: batch.map((r) => ({ id: r.job.id, title: r.job.title, company: r.job.company, experience: r.job.experience || '', description: r.description.slice(0, 6000) })),
      });
      if (!ok) {
        failed += batch.length;
        if (data.code === 'RATE_LIMITED' || data.code === 'AI_UNAVAILABLE') break;
        continue;
      }
      update((s) => (s.resumeHash === resumeHash ? { matches: { ...s.matches, ...data.matches } } : {}));
    }
    if (id !== runId.current) return;
    setPhase('');
    if (failed) setError('Some jobs could not be scored right now. They are shown with a quick estimate. Retry later.');
  }, [profile, resumeText, resumeHash, store.matches, update]);

  // Re-run when the profile changes (shortlist depends on it); AI scores are cached per job.
  const profileKey = JSON.stringify([profile.level, profile.roleFamilies, profile.targetTitles, (profile.skills || []).map((s) => s.name), profile.openToRemote]);
  useEffect(() => { run(); return () => { runId.current += 1; }; }, [profileKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => {
    if (!shortlist) return [];
    return shortlist
      .map((r) => ({ ...r, match: store.matches?.[r.job.id] || null }))
      .filter((r) => {
        if (filters.remote && r.job.work !== 'remote') return false;
        if (filters.level && r.job.level !== filters.level) return false;
        if (filters.posted) { const d = daysAgo(r.job); if (d === null || d > filters.posted) return false; }
        if (filters.min && (!r.match || r.match.score < filters.min)) return false;
        return true;
      })
      .sort((a, b) => {
        const sa = a.match ? a.match.score : -1;
        const sb = b.match ? b.match.score : -1;
        return sb - sa || b.score - a.score;
      });
  }, [shortlist, store.matches, filters]);

  const scored = ranked.filter((r) => r.match);
  const pending = ranked.filter((r) => !r.match);

  return (
    <section>
      <div className="ch-filters">
        <label>
          Fit
          <select value={filters.min} onChange={(e) => setFilters((f) => ({ ...f, min: Number(e.target.value) }))}>
            <option value={0}>All</option>
            <option value={40}>Stretch +</option>
            <option value={65}>Good +</option>
            <option value={85}>Strong only</option>
          </select>
        </label>
        <label>
          Level
          <select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}>
            <option value="">Any</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label>
          Posted
          <select value={filters.posted} onChange={(e) => setFilters((f) => ({ ...f, posted: Number(e.target.value) }))}>
            <option value={0}>Any time</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </label>
        <label className="ch-check">
          <input type="checkbox" checked={filters.remote} onChange={(e) => setFilters((f) => ({ ...f, remote: e.target.checked }))} />
          Remote only
        </label>
        <button type="button" className="btn-ghost ch-btn" onClick={run} disabled={Boolean(phase)}>Refresh</button>
      </div>

      {phase && <p className="ch-progress" role="status"><span className="ch-spinner" />{phase}</p>}
      {error && <p className="ch-note">{error}</p>}
      {shortlist && !phase && ranked.length === 0 && (
        <p className="ch-muted">No jobs match these filters. Loosen them, or add target roles on the Resume step.</p>
      )}

      <div className="ch-list">
        {scored.map((r) => <MatchCard key={r.job.id} row={r} onPick={onPick} />)}
        {pending.length > 0 && scored.length > 0 && <p className="ch-label">Not scored yet or limited info</p>}
        {pending.map((r) => <MatchCard key={r.job.id} row={r} onPick={onPick} />)}
      </div>
    </section>
  );
}

function MatchCard({ row, onPick }) {
  const { job, match, hasInfo, reasons } = row;
  const posted = postedLabel(job);
  return (
    <article className="ch-match">
      <div className={`ch-score is-${match ? match.verdict : 'none'}`}>
        {match ? <><b>{match.score}</b><small>{match.verdict}</small></> : <small>{hasInfo ? '…' : 'limited info'}</small>}
      </div>
      <div className="ch-match-body">
        <h3>{job.title}</h3>
        <p className="ch-muted">
          {[job.company, job.location, job.work === 'remote' ? 'Remote' : '', job.experience, posted].filter(Boolean).join(' · ')}
        </p>
        {match ? (
          <>
            {match.why && <p className="ch-why">{match.why}</p>}
            <div className="ch-chips">
              {match.met.map((m) => <span key={m.requirement} className="ch-chip is-met" title={`“${m.evidence}”`}>✓ {m.requirement}</span>)}
              {match.gaps.map((g) => <span key={g} className="ch-chip is-gap">✗ {g}</span>)}
            </div>
          </>
        ) : (
          <p className="ch-muted ch-small">
            {hasInfo ? 'Scoring…' : 'This listing has no full description, so this is a title-only estimate'}
            {reasons?.length ? ` — ${reasons.join(', ')}` : ''}
          </p>
        )}
      </div>
      <div className="ch-match-actions">
        <button type="button" className="btn ch-btn" onClick={() => onPick(job)}>Tailor &amp; apply</button>
        <a className="ch-link" href={`/jobs/${encodeURIComponent(job.id)}`} target="_blank" rel="noreferrer">View job</a>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- Apply pack

function PackStep({ store, update, job, jobError, loading, passport, savePassport, onBrowse }) {
  const app = job ? store.applications?.[job.id] : null;
  const pack = app?.pack || null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState('');

  if (!job) {
    return (
      <section className="ch-card">
        {loading ? <p className="ch-muted">Loading job…</p> : (
          <>
            <p className="ch-muted">{jobError || 'Pick a job from your matches to build an application pack.'}</p>
            <button type="button" className="btn ch-btn" onClick={onBrowse}>Browse matches</button>
          </>
        )}
      </section>
    );
  }

  const description = String(job.description || '');
  const match = store.matches?.[job.id];

  function setPack(patch) {
    update((s) => {
      const cur = s.applications[job.id] || { job: pickJob(job), status: 'saved', dates: { saved: new Date().toISOString() } };
      return { applications: { ...s.applications, [job.id]: { ...cur, pack: { ...(cur.pack || {}), ...patch } } } };
    });
  }

  function setStatus(status) {
    update((s) => {
      const cur = s.applications[job.id] || { job: pickJob(job), dates: {} };
      return { applications: { ...s.applications, [job.id]: { ...cur, status, dates: { ...cur.dates, [status]: cur.dates?.[status] || new Date().toISOString() } } } };
    });
  }

  async function generate(allowFallback = false) {
    setBusy(true);
    setError(null);
    const { ok, data } = await postJson('/api/resume/tailor', {
      resumeText: store.resumeText,
      jobDescription: description || `${job.title} at ${job.company}`,
      jobTitle: job.title,
      company: job.company,
      jobSkills: Array.isArray(job.skills) ? job.skills : [],
      allowFallback,
    });
    setBusy(false);
    if (!ok || !data.tailored) {
      setError({ message: data.error || 'Could not build the pack right now.', canFallback: data.code === 'AI_UNAVAILABLE' || data.code === 'AI_INVALID' });
      return;
    }
    const t = data.tailored;
    setPack({
      resume: t.fullTailoredResume || '',
      changes: t.changes || [],
      placeholders: t.placeholders || [],
      warnings: t.warnings || [],
      coverLetter: t.coverLetter || '',
      answers: t.screeningAnswers || [],
      mode: data.mode,
      createdAt: new Date().toISOString(),
    });
    setStatus('tailored');
  }

  async function copy(label, text) {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1500); } catch {}
  }

  function openApplication() {
    if (pack) {
      try {
        const full = createApplicationPack({
          passport,
          resumeText: store.resumeText,
          tailoredResume: pack.resume,
          job: { ...job, url: job.applyUrl, description },
          tailored: { placeholders: pack.placeholders, warnings: pack.warnings },
          mode: pack.mode || 'ai',
        });
        full.coverLetter = pack.coverLetter;
        full.answers = [
          ...(pack.answers || []).map((a, i) => ({ id: `screening-${i + 1}`, question: a.question, answer: a.answer })),
          ...full.answers.filter((a) => a.id === 'about-you'),
        ];
        const handoff = buildExtensionHandoff(full, passport);
        localStorage.setItem('mapmyhyd_active_application_pack', JSON.stringify(handoff));
        window.postMessage({ type: 'MAPMYHYD_APPLICATION_PACK', payload: handoff }, window.location.origin);
      } catch {}
    }
    if (job.applyUrl) window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
  }

  const openPlaceholders = pack ? (pack.resume.match(/\[[^\]\n]{3,80}\]/g) || []) : [];
  const fileBase = `${safeName(passport.fullName || store.profile?.name)}_${safeName(job.company)}`;

  return (
    <section className="ch-pack">
      <div className="ch-card">
        <div className="ch-row ch-space">
          <div>
            <h2>{job.title}</h2>
            <p className="ch-muted">{[job.company, job.location, postedLabel(job)].filter(Boolean).join(' · ')}</p>
          </div>
          {match && <div className={`ch-score is-${match.verdict}`}><b>{match.score}</b><small>{match.verdict}</small></div>}
        </div>
        {match?.gaps?.length > 0 && (
          <p className="ch-small ch-muted">Gaps to be honest about: {match.gaps.join(', ')}</p>
        )}
        {description.length < MIN_DESCRIPTION && (
          <p className="ch-note">This listing has little description, so tailoring will be generic. Check the employer page for details.</p>
        )}
        {!pack && (
          <div className="ch-row">
            <button type="button" className="btn ch-btn" onClick={() => generate(false)} disabled={busy}>
              {busy ? 'Writing your pack… (up to 30s)' : 'Build my application pack'}
            </button>
            <button type="button" className="btn-ghost ch-btn" onClick={onBrowse}>Back to matches</button>
          </div>
        )}
        {error && (
          <div className="ch-error">
            {error.message}
            {error.canFallback && (
              <button type="button" className="ch-link" onClick={() => generate(true)} disabled={busy}>
                Use a basic version instead (reorders your resume, no new writing)
              </button>
            )}
          </div>
        )}
      </div>

      {pack && (
        <>
          {(pack.warnings?.length > 0 || openPlaceholders.length > 0) && (
            <div className="ch-card ch-warn">
              {openPlaceholders.length > 0 && (
                <p><b>Fill these in before sending:</b> {openPlaceholders.slice(0, 8).join(' ')}</p>
              )}
              {pack.warnings.map((w) => <p key={w} className="ch-small">{w}</p>)}
            </div>
          )}

          <div className="ch-card">
            <div className="ch-row ch-space">
              <h3>Tailored resume</h3>
              <div className="ch-row">
                <button type="button" className="btn-ghost ch-btn" onClick={() => printResume(pack.resume, `${fileBase}_Resume`)}>Save as PDF</button>
                <button type="button" className="btn-ghost ch-btn" onClick={() => copy('resume', pack.resume)}>{copied === 'resume' ? 'Copied' : 'Copy'}</button>
                <button type="button" className="btn-ghost ch-btn" onClick={() => download(`${fileBase}_Resume.md`, pack.resume)}>.md</button>
              </div>
            </div>
            <textarea className="ch-textarea ch-mono" rows={18} value={pack.resume} onChange={(e) => setPack({ resume: e.target.value })} />
            {pack.changes?.length > 0 && (
              <details className="ch-changes">
                <summary>{pack.changes.length} changes made — review each</summary>
                {pack.changes.map((c, i) => (
                  <div key={i} className="ch-change">
                    <span className="ch-label">{c.section}</span>
                    {c.before && <p className="ch-before">{c.before}</p>}
                    <p className="ch-after">{c.after}</p>
                    {c.reason && <p className="ch-small ch-muted">{c.reason}</p>}
                  </div>
                ))}
              </details>
            )}
          </div>

          <div className="ch-card">
            <div className="ch-row ch-space">
              <h3>Cover letter</h3>
              <button type="button" className="btn-ghost ch-btn" onClick={() => copy('cover', pack.coverLetter)}>{copied === 'cover' ? 'Copied' : 'Copy'}</button>
            </div>
            <textarea
              className="ch-textarea"
              rows={10}
              value={pack.coverLetter}
              placeholder="No cover letter was generated. Write a short one here if the form asks."
              onChange={(e) => setPack({ coverLetter: e.target.value })}
            />
          </div>

          <div className="ch-card">
            <h3>Screening answers</h3>
            {(pack.answers || []).map((a, i) => (
              <div key={i} className="ch-answer">
                <div className="ch-row ch-space">
                  <span className="ch-label">{a.question}</span>
                  <button type="button" className="ch-link" onClick={() => copy(`a${i}`, a.answer)}>{copied === `a${i}` ? 'Copied' : 'Copy'}</button>
                </div>
                <textarea
                  className="ch-textarea"
                  rows={3}
                  value={a.answer}
                  onChange={(e) => setPack({ answers: pack.answers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })}
                />
              </div>
            ))}
          </div>

          <div className="ch-card">
            <h3>Your contact details</h3>
            <p className="ch-small ch-muted">Used by the MapMyHyd autofill extension, if installed. Stored only in this browser.</p>
            <div className="ch-grid">
              {CONTACT.map(([key, label]) => (
                <label key={key} className="ch-field">
                  <span>{label}</span>
                  <input value={passport[key] || ''} onChange={(e) => savePassport({ ...passport, [key]: e.target.value })} />
                </label>
              ))}
            </div>
          </div>

          <div className="ch-card ch-apply">
            <div>
              <h3>Ready? Apply on {job.company || 'the employer'}&apos;s site</h3>
              <p className="ch-small ch-muted">Upload the PDF you saved, paste the cover letter and answers, then submit yourself.</p>
            </div>
            <div className="ch-row">
              <button type="button" className="btn ch-btn" onClick={openApplication} disabled={!job.applyUrl}>Open application →</button>
              <button type="button" className="btn-ghost ch-btn" onClick={() => setStatus('applied')} disabled={app?.status === 'applied'}>
                {app?.status === 'applied' ? 'Marked applied' : 'Mark as applied'}
              </button>
              <button type="button" className="ch-link" onClick={() => generate(false)} disabled={busy}>{busy ? 'Rewriting…' : 'Regenerate'}</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Tracker

function TrackerStep({ store, update, onOpen }) {
  const apps = Object.values(store.applications || {}).sort((a, b) => {
    const ta = Math.max(...Object.values(a.dates || {}).map((d) => Date.parse(d) || 0));
    const tb = Math.max(...Object.values(b.dates || {}).map((d) => Date.parse(d) || 0));
    return tb - ta;
  });

  function setStatus(id, status) {
    update((s) => {
      const cur = s.applications[id];
      return { applications: { ...s.applications, [id]: { ...cur, status, dates: { ...cur.dates, [status]: cur.dates?.[status] || new Date().toISOString() } } } };
    });
  }

  function remove(id) {
    update((s) => {
      const next = { ...s.applications };
      delete next[id];
      return { applications: next };
    });
  }

  if (!apps.length) return <section className="ch-card"><p className="ch-muted">No applications yet. Pick a match and build a pack to start tracking.</p></section>;

  return (
    <section className="ch-card">
      <table className="ch-table">
        <thead><tr><th>Role</th><th>Status</th><th>Updated</th><th /></tr></thead>
        <tbody>
          {apps.map((a) => {
            const last = Object.entries(a.dates || {}).sort((x, y) => Date.parse(y[1]) - Date.parse(x[1]))[0];
            return (
              <tr key={a.job.id}>
                <td>
                  <strong>{a.job.title}</strong>
                  <div className="ch-small ch-muted">{a.job.company}</div>
                </td>
                <td>
                  <select value={a.status} onChange={(e) => setStatus(a.job.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="ch-small ch-muted">{last ? `${last[0]} ${new Date(last[1]).toLocaleDateString()}` : ''}</td>
                <td className="ch-row">
                  <button type="button" className="ch-link" onClick={() => onOpen(a.job)}>{a.pack ? 'Open pack' : 'Build pack'}</button>
                  <button type="button" className="ch-link ch-danger" onClick={() => remove(a.job.id)}>Remove</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
