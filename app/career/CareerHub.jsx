'use client';

// Career hub: resume once → AI-ranked, explained matches → per-job tailored
// resume, cover letter and answers → user reviews → applies on the employer's
// own page. Everything is stored in this browser (localStorage), no login.
// Design idea: every claim has a receipt — skills and matches show the resume
// line that proves them.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractResumeText } from '../../lib/resume/parse-client.js';
import { isEarlyCareer, isEntryJob, shortlistJobs } from '../../lib/career/prefilter.js';
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
const BOARD = [
  { id: 'saved', label: 'Saved' },
  { id: 'tailored', label: 'Pack ready' },
  { id: 'applied', label: 'Applied' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Closed' },
];
const LEVELS = [
  ['intern', 'Student / fresher'],
  ['junior', 'Junior (0–2y)'],
  ['mid', 'Mid (2–5y)'],
  ['senior', 'Senior (5–8y)'],
  ['lead', 'Lead (8y+)'],
  ['manager', 'Manager'],
];
const LEVEL_LABEL = Object.fromEntries(LEVELS);
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
    if (saved && typeof saved === 'object') return { matches: {}, applications: {}, ...saved };
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
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error. Check your connection.' } };
  }
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
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
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

// Resume text → simple blocks shared by the on-page paper preview and print.
function resumeBlocks(text) {
  const blocks = [];
  String(text || '').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (/^[-•*▪◦]\s+/.test(line)) blocks.push({ kind: 'li', text: line.replace(/^[-•*▪◦]\s+/, '') });
    else if (i === 0 || (!blocks.length)) blocks.push({ kind: 'name', text: line.replace(/^#+\s*/, '') });
    else if (/^#+\s/.test(line) || (line.length < 40 && line === line.toUpperCase() && /[A-Z]/.test(line))) {
      blocks.push({ kind: 'h', text: line.replace(/^#+\s*/, '') });
    } else blocks.push({ kind: 'p', text: line });
  });
  return blocks;
}

// Plain, single-column, ATS-safe print layout.
function printResume(text, title) {
  let html = '';
  let inList = false;
  for (const b of resumeBlocks(text)) {
    if (inList && b.kind !== 'li') { html += '</ul>'; inList = false; }
    if (b.kind === 'li') { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${escapeHtml(b.text)}</li>`; }
    else if (b.kind === 'name') html += `<h1>${escapeHtml(b.text)}</h1>`;
    else if (b.kind === 'h') html += `<h2>${escapeHtml(b.text)}</h2>`;
    else html += `<p>${escapeHtml(b.text)}</p>`;
  }
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

function stamp(app, status) {
  return { ...app, status, dates: { ...(app.dates || {}), [status]: app.dates?.[status] || new Date().toISOString() } };
}

export default function CareerHub() {
  const [store, setStore] = useState(null);
  const [view, setView] = useState('resume');
  const [passport, setPassport] = useState(() => normalizePassport({}));
  const [pendingJob, setPendingJob] = useState('');
  const [packJob, setPackJob] = useState(null);
  const [packJobError, setPackJobError] = useState('');
  const hydrated = useRef(false);

  useEffect(() => {
    const s = readStore();
    setStore(s);
    setPassport(readPassport());
    const jobParam = new URLSearchParams(location.search).get('job');
    if (jobParam) setPendingJob(jobParam);
    setView(s.profile ? (jobParam ? 'pack' : 'matches') : 'resume');
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || !store) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
  }, [store]);

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

  const update = useCallback((patch) => setStore((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);

  const savePassport = useCallback((next) => {
    setPassport(next);
    try {
      const prev = JSON.parse(localStorage.getItem(PASSPORT_STORAGE_KEY) || '{}');
      localStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify({ ...prev, ...next }));
    } catch {}
  }, []);

  const openPack = useCallback((job) => {
    setPackJob(null);
    setPendingJob(job.id);
    setView('pack');
    update((s) => (s.applications[job.id]
      ? {}
      : { applications: { ...s.applications, [job.id]: stamp({ job: pickJob(job) }, 'saved') } }));
    try { history.replaceState(null, '', `/career?job=${encodeURIComponent(job.id)}`); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [update]);

  if (!store) return <div className="ch-shell"><div className="ch-skeleton" /></div>;

  const apps = Object.values(store.applications || {});
  const scoredCount = Object.keys(store.matches || {}).length;
  const packCount = apps.filter((a) => a.pack).length;
  const appliedCount = apps.filter((a) => ['applied', 'interview', 'offer'].includes(a.status)).length;
  const early = isEarlyCareer(store.profile);

  const rail = [
    { id: 'resume', n: '01', label: 'Resume', value: store.profile ? (store.profile.name || 'Ready') : 'Add yours', done: Boolean(store.profile) },
    { id: 'matches', n: '02', label: 'Matches', value: store.profile ? `${scoredCount} read` : '—', done: scoredCount > 0, locked: !store.profile },
    { id: 'pack', n: '03', label: 'Apply pack', value: packJob ? packJob.company : `${packCount} ready`, done: packCount > 0, locked: !store.profile },
    { id: 'tracker', n: '04', label: 'Applications', value: `${appliedCount} applied`, done: appliedCount > 0 },
  ];

  return (
    <div className={`ch-shell${store.profile ? '' : ' is-new'}`}>
      <header className="ch-hero">
        <p className="ch-kicker"><span className="ch-dot" />Career hub · Hyderabad</p>
        <h1>
          Apply to jobs you <em>actually</em> fit.
          <span>With a resume rewritten for each one.</span>
        </h1>
        {!store.profile && (
          <p className="ch-lede">
            Drop your resume once. We read every live job description against it and show the line in your resume
            that backs each match. Then we draft a tailored resume, cover letter and answers. You check them and apply
            on the company&apos;s own site. Nothing is sent without you.
          </p>
        )}
      </header>

      <nav className="ch-rail" aria-label="Career hub">
        {rail.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`ch-rail-item${view === r.id ? ' is-active' : ''}${r.done ? ' is-done' : ''}`}
            disabled={r.locked}
            onClick={() => setView(r.id)}
            aria-current={view === r.id ? 'step' : undefined}
          >
            <span className="ch-rail-n">{r.done ? '✓' : r.n}</span>
            <span className="ch-rail-text">
              <span className="ch-rail-label">{r.label}</span>
              <span className="ch-rail-value">{r.value}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="ch-stage" key={view}>
        {view === 'resume' && (
          <ResumeStep store={store} update={update} onDone={() => setView(pendingJob ? 'pack' : 'matches')} />
        )}
        {view === 'matches' && store.profile && (
          <MatchesStep store={store} update={update} onPick={openPack} early={early} />
        )}
        {view === 'pack' && store.profile && (
          <PackStep
            store={store}
            update={update}
            job={packJob}
            jobError={packJobError}
            loading={Boolean(pendingJob) && !packJob && !packJobError}
            passport={passport}
            savePassport={savePassport}
            onBrowse={() => setView('matches')}
          />
        )}
        {view === 'tracker' && <TrackerStep store={store} update={update} onOpen={openPack} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Resume

function ResumeStep({ store, update, onDone }) {
  const [text, setText] = useState(store.resumeText || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false);
  const [openSkill, setOpenSkill] = useState('');
  const fileRef = useRef(null);
  const profile = store.profile;

  async function analyze(source) {
    const clean = String(source ?? text).trim();
    if (clean.length < 80) { setError('That looks too short. Add your full resume.'); return; }
    setError('');
    setNotice('');
    setBusy('Reading your resume…');
    const { ok, data } = await postJson('/api/career/profile', { resumeText: clean });
    setBusy('');
    if (!ok || !data.profile) { setError(data.error || 'Could not read your resume. Try again.'); return; }
    const hash = profileHash(clean);
    update((s) => ({ resumeText: clean, profile: data.profile, resumeHash: hash, matches: s.resumeHash === hash ? s.matches : {} }));
    if (data.mode === 'fallback') setNotice('AI was busy, so this is a quick keyword read. Matches improve once it is back. Re-read later.');
  }

  async function takeFile(file) {
    if (!file) return;
    setError('');
    setBusy('Opening your file…');
    try {
      const extracted = await extractResumeText(file);
      setText(extracted);
      await analyze(extracted);
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  function patchProfile(patch) {
    update((s) => ({ profile: { ...s.profile, ...patch } }));
  }

  if (!profile) {
    return (
      <section className="ch-intake">
        <div
          className={`ch-drop${drag ? ' is-drag' : ''}${busy ? ' is-busy' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files?.[0]); }}
        >
          <div className="ch-paper" aria-hidden="true">
            <i /><i /><i className="short" /><b /><i /><i className="short" /><b /><i /><i />
            {busy && <span className="ch-scan" />}
          </div>
          <div className="ch-drop-copy">
            {busy ? (
              <p className="ch-drop-title" role="status">{busy}</p>
            ) : paste ? (
              <>
                <textarea
                  className="ch-input ch-paste"
                  rows={9}
                  autoFocus
                  placeholder="Paste your full resume text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="ch-row">
                  <button type="button" className="ch-cta" onClick={() => analyze()}>Read my resume</button>
                  <button type="button" className="ch-text-btn" onClick={() => setPaste(false)}>Upload instead</button>
                </div>
              </>
            ) : (
              <>
                <p className="ch-drop-title">Drop your resume here</p>
                <p className="ch-muted">PDF or DOCX. Students and freshers welcome: projects and internships count.</p>
                <div className="ch-row">
                  <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ''; }} />
                  <button type="button" className="ch-cta" onClick={() => fileRef.current?.click()}>Choose file</button>
                  <button type="button" className="ch-text-btn" onClick={() => setPaste(true)}>or paste text</button>
                </div>
              </>
            )}
            {error && <p className="ch-error">{error}</p>}
          </div>
        </div>
        <ol className="ch-promises">
          <li><b>Matched on proof.</b> Each match shows the line in your resume that earns it, and what is missing.</li>
          <li><b>Never invented.</b> Tailoring rewords and reorders. If a number or skill isn&apos;t in your resume, it&apos;s dropped.</li>
          <li><b>Stays with you.</b> Saved in this browser only. No account. You apply on the employer&apos;s own site.</li>
        </ol>
      </section>
    );
  }

  const skills = profile.skills || [];
  return (
    <section className="ch-idcard">
      <div className="ch-id-top">
        <div className="ch-avatar" aria-hidden="true">{(profile.name || '?').trim().charAt(0).toUpperCase()}</div>
        <div className="ch-id-name">
          <h2>{profile.name || 'Your profile'}</h2>
          {profile.headline && <p>{profile.headline}</p>}
        </div>
        <span className={`ch-badge${profile.source === 'fallback' ? ' is-warn' : ''}`}>
          {profile.source === 'fallback' ? 'Quick read' : 'Read by AI'}
        </span>
      </div>

      {isEarlyCareer(profile) && (
        <p className="ch-fresher">
          <b>Early-career mode is on.</b> Your projects, internships and coursework count as experience, and we will
          surface internships and fresher roles first.
        </p>
      )}

      <div className="ch-id-fields">
        <label className="ch-field">
          <span>Stage</span>
          <select value={profile.level || 'mid'} onChange={(e) => patchProfile({ level: e.target.value })}>
            {LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="ch-field">
          <span>Years</span>
          <input type="number" min="0" max="50" value={profile.yearsExperience ?? ''} onChange={(e) => patchProfile({ yearsExperience: Number(e.target.value) || 0 })} />
        </label>
        <label className="ch-field ch-span">
          <span>Roles you want</span>
          <input
            value={(profile.targetTitles || []).join(', ')}
            onChange={(e) => patchProfile({ targetTitles: e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6) })}
          />
        </label>
        <label className="ch-toggle">
          <input type="checkbox" checked={Boolean(profile.openToRemote)} onChange={(e) => patchProfile({ openToRemote: e.target.checked })} />
          <span>Open to remote</span>
        </label>
      </div>

      <div className="ch-receipts-head">
        <h3>Skills, with receipts</h3>
        <span className="ch-muted ch-small">Tap one to see the line that proves it. × to remove.</span>
      </div>
      <div className="ch-skillwall">
        {skills.map((s) => (
          <span key={s.name} className={`ch-skill is-${s.strength}${openSkill === s.name ? ' is-open' : ''}`}>
            <button type="button" className="ch-skill-name" onClick={() => setOpenSkill(openSkill === s.name ? '' : s.name)}>{s.name}</button>
            <button type="button" className="ch-skill-x" aria-label={`Remove ${s.name}`} onClick={() => patchProfile({ skills: skills.filter((x) => x.name !== s.name) })}>×</button>
          </span>
        ))}
      </div>
      {openSkill && (
        <blockquote className="ch-receipt">
          <span className="ch-receipt-label">{openSkill} · from your resume</span>
          <mark>{skills.find((s) => s.name === openSkill)?.evidence || 'Listed in your skills section.'}</mark>
        </blockquote>
      )}
      <p className="ch-legend"><i className="is-core" />used at work <i className="is-used" />in a project <i className="is-mentioned" />listed only</p>

      <div className="ch-id-foot">
        <button type="button" className="ch-cta" onClick={onDone}>See my matches →</button>
        <details className="ch-edit-resume">
          <summary>Edit or replace resume</summary>
          <textarea className="ch-input" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="ch-row">
            <button type="button" className="ch-ghost" onClick={() => analyze()} disabled={Boolean(busy)}>{busy || 'Re-read resume'}</button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ''; }} />
            <button type="button" className="ch-text-btn" onClick={() => fileRef.current?.click()}>Upload a new file</button>
          </div>
        </details>
      </div>
      {error && <p className="ch-error">{error}</p>}
      {notice && <p className="ch-note">{notice}</p>}
    </section>
  );
}

// ---------------------------------------------------------------- Matches

function MatchesStep({ store, update, onPick, early }) {
  const { profile, resumeText, resumeHash } = store;
  const [mode, setMode] = useState(early ? 'entry' : 'best');
  const [rows, setRows] = useState(null);
  const [entryTotal, setEntryTotal] = useState(0);
  const [phase, setPhase] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ min: 0, remote: false, posted: 0 });
  const runId = useRef(0);

  const run = useCallback(async () => {
    const id = ++runId.current;
    setError('');
    setProgress(0.05);
    setPhase('Scanning every live job…');
    let index;
    try {
      index = await (await fetch('/data/jobs-index.json')).json();
    } catch {
      setError('Could not load jobs. Check your connection and retry.');
      setPhase('');
      return;
    }
    const jobs = index.jobs || [];
    setEntryTotal(jobs.filter(isEntryJob).length);
    const top = shortlistJobs(jobs, profile, { limit: SHORTLIST, entryOnly: mode === 'entry' });
    setProgress(0.15);
    setPhase(`Reading ${top.length} job descriptions…`);
    const details = await Promise.all(top.map((r) => loadJobDetail(r.job.id)));
    if (id !== runId.current) return;
    const next = top.map((r, i) => {
      const description = String(details[i]?.description || '');
      return { ...r, job: { ...r.job, applyUrl: details[i]?.applyUrl || r.job.applyUrl }, description, hasInfo: description.length >= MIN_DESCRIPTION };
    });
    setRows(next);

    const todo = next.filter((r) => r.hasInfo && !store.matches?.[r.job.id]);
    let failed = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
      if (id !== runId.current) return;
      setProgress(0.2 + 0.8 * (i / Math.max(1, todo.length)));
      setPhase(`Comparing your resume with each job… ${Math.min(i + BATCH, todo.length)} of ${todo.length}`);
      const batch = todo.slice(i, i + BATCH);
      const { ok, data } = await postJson('/api/career/match', {
        resumeText,
        earlyCareer: isEarlyCareer(profile),
        jobs: batch.map((r) => ({ id: r.job.id, title: r.job.title, company: r.job.company, experience: r.job.experience || '', description: r.description.slice(0, 6000) })),
      });
      if (!ok) {
        failed += batch.length;
        if (data.code === 'RATE_LIMITED' || data.code === 'AI_UNAVAILABLE' || !data.code) break;
        continue;
      }
      update((s) => (s.resumeHash === resumeHash ? { matches: { ...s.matches, ...data.matches } } : {}));
    }
    if (id !== runId.current) return;
    setProgress(1);
    setPhase('');
    if (failed) setError('Some jobs could not be read by AI right now. They show a quick estimate. Try Refresh later.');
  }, [profile, resumeText, resumeHash, store.matches, update, mode]);

  const profileKey = JSON.stringify([mode, profile.level, profile.roleFamilies, profile.targetTitles, (profile.skills || []).map((s) => s.name), profile.openToRemote]);
  useEffect(() => { run(); return () => { runId.current += 1; }; }, [profileKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => {
    if (!rows) return [];
    return rows
      .map((r) => ({ ...r, match: store.matches?.[r.job.id] || null }))
      .filter((r) => {
        if (filters.remote && r.job.work !== 'remote') return false;
        if (filters.posted) { const d = daysAgo(r.job); if (d === null || d > filters.posted) return false; }
        if (filters.min && (!r.match || r.match.score < filters.min)) return false;
        return true;
      })
      .sort((a, b) => (b.match ? b.match.score : -1) - (a.match ? a.match.score : -1) || b.score - a.score);
  }, [rows, store.matches, filters]);

  const scored = ranked.filter((r) => r.match);
  const pending = ranked.filter((r) => !r.match);
  const strong = scored.filter((r) => r.match.score >= 65).length;

  return (
    <section>
      <div className="ch-matches-head">
        <div className="ch-seg" role="tablist" aria-label="Which roles">
          <button type="button" role="tab" aria-selected={mode === 'best'} className={mode === 'best' ? 'is-on' : ''} onClick={() => setMode('best')}>
            Best fit for you
          </button>
          <button type="button" role="tab" aria-selected={mode === 'entry'} className={mode === 'entry' ? 'is-on' : ''} onClick={() => setMode('entry')}>
            Internships &amp; fresher{entryTotal ? <span className="ch-seg-n">{entryTotal}</span> : null}
          </button>
        </div>
        {rows && !phase && (
          <p className="ch-summary">
            <b>{strong}</b> good or strong {strong === 1 ? 'fit' : 'fits'} out of <b>{rows.length}</b> {mode === 'entry' ? 'entry-level roles' : 'roles'} we read for you.
          </p>
        )}
      </div>

      <div className="ch-filters">
        <select aria-label="Minimum fit" value={filters.min} onChange={(e) => setFilters((f) => ({ ...f, min: Number(e.target.value) }))}>
          <option value={0}>Any fit</option>
          <option value={40}>Stretch and up</option>
          <option value={65}>Good and up</option>
          <option value={85}>Strong only</option>
        </select>
        <select aria-label="Posted" value={filters.posted} onChange={(e) => setFilters((f) => ({ ...f, posted: Number(e.target.value) }))}>
          <option value={0}>Posted any time</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
        <label className="ch-toggle">
          <input type="checkbox" checked={filters.remote} onChange={(e) => setFilters((f) => ({ ...f, remote: e.target.checked }))} />
          <span>Remote only</span>
        </label>
        <button type="button" className="ch-text-btn" onClick={run} disabled={Boolean(phase)}>↻ Refresh</button>
      </div>

      {phase && (
        <div className="ch-scanbar" role="status">
          <span style={{ transform: `scaleX(${progress})` }} />
          <p>{phase}</p>
        </div>
      )}
      {error && <p className="ch-note">{error}</p>}
      {mode === 'entry' && rows && !phase && rows.length < 10 && (
        <p className="ch-note">
          Only {rows.length} fresher-open roles fit your profile right now. Try adding broader roles on your resume card,
          or check Best fit, where some junior roles without a fresher label appear.
        </p>
      )}
      {rows && !phase && ranked.length === 0 && <p className="ch-empty">Nothing matches these filters. Loosen them a little.</p>}
      {!rows && phase && <div className="ch-list">{[0, 1, 2].map((i) => <div key={i} className="ch-card-skel" />)}</div>}

      <div className="ch-list">
        {scored.map((r, i) => <MatchCard key={r.job.id} row={r} rank={i + 1} onPick={onPick} app={store.applications?.[r.job.id]} />)}
      </div>
      {pending.length > 0 && (
        <>
          <h3 className="ch-section-title">{scored.length ? 'Title-only estimates' : 'Roles to check'}<span>No full description, so these are scored on title, level and recency</span></h3>
          <div className="ch-list">
            {pending.map((r) => <MatchCard key={r.job.id} row={r} onPick={onPick} app={store.applications?.[r.job.id]} />)}
          </div>
        </>
      )}
    </section>
  );
}

function FitRing({ match, size = 64 }) {
  if (!match) return <div className="ch-ring is-none" style={{ width: size, height: size }}><span>—</span></div>;
  return (
    <div className={`ch-ring is-${match.verdict}`} style={{ width: size, height: size, '--p': match.score }}>
      <span><b>{match.score}</b><small>{match.verdict}</small></span>
    </div>
  );
}

function MatchCard({ row, rank, onPick, app }) {
  const { job, match, hasInfo, reasons } = row;
  const meta = [job.company, job.location?.split(',')[0], job.work === 'remote' ? 'Remote' : '', job.experience, postedLabel(job)].filter(Boolean);
  return (
    <article className={`ch-match${rank === 1 ? ' is-top' : ''}`}>
      <FitRing match={match} />
      <div className="ch-match-body">
        <div className="ch-match-title">
          <h3>{job.title}</h3>
          {isEntryJob(job) && <span className="ch-tag">Fresher-open</span>}
          {app && <span className="ch-tag is-app">{BOARD.find((b) => b.id === app.status)?.label || 'Saved'}</span>}
        </div>
        <p className="ch-meta">{meta.join(' · ')}</p>
        {match ? (
          <>
            {match.why && <p className="ch-why">{match.why}</p>}
            {(match.met.length > 0 || match.gaps.length > 0) && (
              <details className="ch-proof">
                <summary>
                  <span className="ch-proof-ok">{match.met.length} proven</span>
                  {match.gaps.length > 0 && <span className="ch-proof-gap">{match.gaps.length} missing</span>}
                  <span className="ch-proof-cta">See receipts</span>
                </summary>
                <ul>
                  {match.met.map((m) => (
                    <li key={m.requirement} className="is-met">
                      <span>{m.requirement}</span>
                      <mark>“{m.evidence}”</mark>
                    </li>
                  ))}
                  {match.gaps.map((g) => <li key={g} className="is-gap"><span>{g}</span><em>Not shown in your resume</em></li>)}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p className="ch-why ch-muted">
            {hasInfo ? 'Reading this one…' : 'No full description from the employer.'}
            {reasons?.length ? ` Looks relevant: ${reasons.join(', ')}.` : ''}
          </p>
        )}
      </div>
      <div className="ch-match-actions">
        <button type="button" className="ch-cta ch-cta-sm" onClick={() => onPick(job)}>{app?.pack ? 'Open pack' : 'Tailor & apply'}</button>
        <a className="ch-text-btn" href={`/jobs/${encodeURIComponent(job.id)}`} target="_blank" rel="noreferrer">Job post ↗</a>
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
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('resume');

  if (!job) {
    return (
      <section className="ch-empty-state">
        {loading ? <div className="ch-card-skel" /> : (
          <>
            <p>{jobError || 'Pick a job from your matches and we will build its application pack here.'}</p>
            <button type="button" className="ch-cta" onClick={onBrowse}>Browse matches</button>
          </>
        )}
      </section>
    );
  }

  const description = String(job.description || '');
  const match = store.matches?.[job.id];

  function setPack(patch) {
    update((s) => {
      const cur = s.applications[job.id] || stamp({ job: pickJob(job) }, 'saved');
      return { applications: { ...s.applications, [job.id]: { ...cur, pack: { ...(cur.pack || {}), ...patch } } } };
    });
  }

  function setStatus(status) {
    update((s) => ({ applications: { ...s.applications, [job.id]: stamp(s.applications[job.id] || { job: pickJob(job) }, status) } }));
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
      done: {},
      createdAt: new Date().toISOString(),
    });
    setStatus('tailored');
  }

  async function copy(label, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
      tick(label);
    } catch {}
  }

  function tick(key) {
    if (pack) setPack({ done: { ...(pack.done || {}), [key]: true } });
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
      tick('open');
    }
    if (job.applyUrl) window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
  }

  const head = (
    <header className="ch-pack-head">
      <FitRing match={match} size={72} />
      <div>
        <p className="ch-kicker">Application pack</p>
        <h2>{job.title}</h2>
        <p className="ch-meta">{[job.company, job.location?.split(',')[0], postedLabel(job)].filter(Boolean).join(' · ')}</p>
      </div>
    </header>
  );

  if (!pack) {
    return (
      <section className="ch-pack">
        {head}
        <div className="ch-brief">
          <div>
            <h3>What you will get</h3>
            <ul className="ch-checklist is-static">
              <li>A resume reordered and reworded for this role, with every change listed</li>
              <li>A short cover letter grounded in your real experience</li>
              <li>Answers to the usual screening questions</li>
            </ul>
            {match?.gaps?.length > 0 && <p className="ch-small ch-muted">We won&apos;t pretend you have: {match.gaps.join(', ')}.</p>}
            {description.length < MIN_DESCRIPTION && <p className="ch-note">This post has little description, so the pack will be more general.</p>}
          </div>
          <div className="ch-brief-cta">
            <button type="button" className="ch-cta" onClick={() => generate(false)} disabled={busy}>
              {busy ? 'Writing your pack…' : 'Build my pack'}
            </button>
            {busy && <p className="ch-small ch-muted">Takes about 20–30 seconds.</p>}
            <button type="button" className="ch-text-btn" onClick={onBrowse}>← Back to matches</button>
          </div>
        </div>
        {error && (
          <div className="ch-error">
            {error.message}
            {error.canFallback && (
              <button type="button" className="ch-text-btn" onClick={() => generate(true)} disabled={busy}>
                Use a basic version (reorders your resume, writes nothing new)
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  const openPlaceholders = [...new Set(pack.resume.match(/\[[^\]\n]{3,80}\]/g) || [])];
  const fileBase = `${safeName(passport.fullName || store.profile?.name)}_${safeName(job.company)}`;
  const done = pack.done || {};
  const steps = [
    { key: 'fill', label: openPlaceholders.length ? `Fill ${openPlaceholders.length} blank${openPlaceholders.length > 1 ? 's' : ''} in your resume` : 'No blanks to fill', ok: openPlaceholders.length === 0 },
    { key: 'pdf', label: 'Save the resume as PDF', ok: done.pdf },
    { key: 'cover', label: 'Copy the cover letter', ok: done.cover },
    { key: 'open', label: `Open ${job.company || 'the employer'}'s application`, ok: done.open },
    { key: 'applied', label: 'Mark as applied', ok: ['applied', 'interview', 'offer'].includes(app?.status) },
  ];
  const progress = steps.filter((s) => s.ok).length;

  return (
    <section className="ch-pack">
      {head}
      <div className="ch-desk">
        <div className="ch-desk-main">
          <div className="ch-tabs" role="tablist">
            {[['resume', 'Resume'], ['cover', 'Cover letter'], ['answers', `Answers (${(pack.answers || []).length})`], ['changes', `Changes (${(pack.changes || []).length})`]].map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === 'resume' && (
            <div className="ch-sheet-wrap">
              <div className="ch-sheet-tools">
                <button type="button" className="ch-text-btn" onClick={() => setEditing((v) => !v)}>{editing ? 'Done editing' : '✎ Edit'}</button>
                <button type="button" className="ch-text-btn" onClick={() => copy('resume', pack.resume)}>{copied === 'resume' ? 'Copied ✓' : 'Copy'}</button>
                <button type="button" className="ch-text-btn" onClick={() => download(`${fileBase}_Resume.md`, pack.resume)}>.md</button>
              </div>
              {editing ? (
                <textarea className="ch-sheet ch-sheet-edit" value={pack.resume} onChange={(e) => setPack({ resume: e.target.value })} />
              ) : (
                <article className="ch-sheet" onDoubleClick={() => setEditing(true)}>
                  {resumeBlocks(pack.resume).map((b, i) => {
                    const parts = b.text.split(/(\[[^\]\n]{3,80}\])/g).map((p, j) => (/^\[.*\]$/.test(p) ? <mark key={j} className="ch-blank">{p}</mark> : p));
                    if (b.kind === 'name') return <h1 key={i}>{parts}</h1>;
                    if (b.kind === 'h') return <h2 key={i}>{parts}</h2>;
                    if (b.kind === 'li') return <p key={i} className="li">{parts}</p>;
                    return <p key={i}>{parts}</p>;
                  })}
                </article>
              )}
              {pack.warnings?.length > 0 && (
                <div className="ch-honest">
                  <b>Kept honest</b>
                  {pack.warnings.map((w) => <p key={w}>{w}</p>)}
                </div>
              )}
            </div>
          )}

          {tab === 'cover' && (
            <div className="ch-letter">
              <textarea
                className="ch-sheet ch-sheet-edit ch-serif"
                value={pack.coverLetter}
                placeholder="No cover letter was generated. Write a short one if the form asks."
                onChange={(e) => setPack({ coverLetter: e.target.value })}
              />
              <button type="button" className="ch-ghost" onClick={() => copy('cover', pack.coverLetter)}>{copied === 'cover' ? 'Copied ✓' : 'Copy cover letter'}</button>
            </div>
          )}

          {tab === 'answers' && (
            <div className="ch-answers">
              {(pack.answers || []).map((a, i) => (
                <div key={i} className="ch-answer">
                  <div className="ch-answer-q">
                    <span>Q{i + 1}</span>
                    <p>{a.question}</p>
                    <button type="button" className="ch-text-btn" onClick={() => copy(`a${i}`, a.answer)}>{copied === `a${i}` ? 'Copied ✓' : 'Copy'}</button>
                  </div>
                  <textarea
                    className="ch-input"
                    rows={3}
                    value={a.answer}
                    onChange={(e) => setPack({ answers: pack.answers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) })}
                  />
                </div>
              ))}
              <details className="ch-contact">
                <summary>Your contact details (for the autofill extension)</summary>
                <div className="ch-id-fields">
                  {CONTACT.map(([key, label]) => (
                    <label key={key} className="ch-field">
                      <span>{label}</span>
                      <input value={passport[key] || ''} onChange={(e) => savePassport({ ...passport, [key]: e.target.value })} />
                    </label>
                  ))}
                </div>
              </details>
            </div>
          )}

          {tab === 'changes' && (
            <div className="ch-diff">
              {(pack.changes || []).length === 0 && <p className="ch-muted">No line-level changes were recorded.</p>}
              {(pack.changes || []).map((c, i) => (
                <div key={i} className="ch-diff-item">
                  <span className="ch-diff-sec">{c.section}</span>
                  {c.before && <p className="ch-del">{c.before}</p>}
                  <p className="ch-add">{c.after}</p>
                  {c.reason && <p className="ch-why ch-muted">{c.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="ch-desk-rail">
          <div className="ch-launch">
            <p className="ch-kicker">Your checklist · {progress}/{steps.length}</p>
            <div className="ch-meter"><span style={{ width: `${(progress / steps.length) * 100}%` }} /></div>
            <ul className="ch-checklist">
              {steps.map((s) => <li key={s.key} className={s.ok ? 'is-ok' : ''}>{s.label}</li>)}
            </ul>
            {openPlaceholders.length > 0 && (
              <p className="ch-blanks">{openPlaceholders.slice(0, 4).map((p) => <mark key={p} className="ch-blank">{p}</mark>)}</p>
            )}
            <button type="button" className="ch-ghost ch-block" onClick={() => { printResume(pack.resume, `${fileBase}_Resume`); tick('pdf'); }}>Save resume as PDF</button>
            <button type="button" className="ch-cta ch-block" onClick={openApplication} disabled={!job.applyUrl}>Open application ↗</button>
            <button
              type="button"
              className="ch-ghost ch-block"
              onClick={() => setStatus('applied')}
              disabled={['applied', 'interview', 'offer'].includes(app?.status)}
            >
              {['applied', 'interview', 'offer'].includes(app?.status) ? 'Applied ✓' : 'I applied'}
            </button>
            <button type="button" className="ch-text-btn" onClick={() => generate(false)} disabled={busy}>{busy ? 'Rewriting…' : '↻ Regenerate pack'}</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Tracker

function TrackerStep({ store, update, onOpen }) {
  const apps = Object.values(store.applications || {});

  function move(id, status) {
    update((s) => ({ applications: { ...s.applications, [id]: stamp(s.applications[id], status) } }));
  }

  function remove(id) {
    update((s) => {
      const next = { ...s.applications };
      delete next[id];
      return { applications: next };
    });
  }

  if (!apps.length) {
    return (
      <section className="ch-empty-state">
        <p>Your board is empty. Every job you tailor lands here, so you can follow it from saved to offer.</p>
      </section>
    );
  }

  return (
    <section className="ch-board">
      {BOARD.map((col) => {
        const items = apps
          .filter((a) => a.status === col.id)
          .sort((a, b) => Date.parse(b.dates?.[col.id] || 0) - Date.parse(a.dates?.[col.id] || 0));
        return (
          <div key={col.id} className={`ch-col is-${col.id}`}>
            <h3>{col.label}<span>{items.length}</span></h3>
            {items.map((a) => {
              const i = BOARD.findIndex((b) => b.id === a.status);
              const when = a.dates?.[a.status];
              return (
                <div key={a.job.id} className="ch-ticket">
                  <button type="button" className="ch-ticket-title" onClick={() => onOpen(a.job)}>{a.job.title}</button>
                  <p className="ch-meta">{a.job.company}{when ? ` · ${new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</p>
                  <div className="ch-ticket-actions">
                    {i < BOARD.length - 2 && (
                      <button type="button" className="ch-text-btn" onClick={() => move(a.job.id, BOARD[i + 1].id)}>→ {BOARD[i + 1].label}</button>
                    )}
                    <select aria-label="Move to" value={a.status} onChange={(e) => move(a.job.id, e.target.value)}>
                      {BOARD.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    <button type="button" className="ch-text-btn ch-danger" aria-label="Remove" onClick={() => remove(a.job.id)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
