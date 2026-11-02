'use client';

// Career hub: resume once → AI-ranked, explained matches → per-job tailored
// resume, cover letter and answers → user reviews → applies on the employer's
// own page. Everything is stored in this browser (localStorage), no login.
// Design idea: every claim has a receipt — skills and matches show the resume
// line that proves them.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RESUME_CSS, findResumeBlanks, resumeHtml, resumePrintDocument } from '../../lib/resume/layout.js';
import { extractResumeText } from '../../lib/resume/parse-client.js';
import { isEarlyCareer, isEntryJob, shortlistJobs } from '../../lib/career/prefilter.js';
import { profileHash } from '../../lib/career/openai.js';
import { jobsFetch } from '../../lib/opportunities-client.js';
import { jobUrlId } from '../../lib/jobs-seo.js';
import {
  PASSPORT_STORAGE_KEY,
  buildExtensionHandoff,
  createApplicationPack,
  normalizePassport,
} from '../../lib/application-pack.js';

const STORE_KEY = 'mapmyhyd_career_v2';
const SHORTLIST = 40;
const BATCH = 8;
// Enough to reach requirements once the company intro is gone, without paying AI costs for all of it.
const MATCH_TEXT_MAX = 3000;
const MIN_DESCRIPTION = 300;
const BOARD = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Closed' },
];
// Older saved applications can say 'tailored'; a job with a resume ready is still just saved.
const boardStatus = (status) => (status === 'tailored' ? 'saved' : status);
const LEVELS = [
  ['intern', 'Student / fresher'],
  ['junior', 'Junior (0–2y)'],
  ['mid', 'Mid (2–5y)'],
  ['senior', 'Senior (5–8y)'],
  ['lead', 'Lead (8y+)'],
  ['manager', 'Manager'],
];
const STAGE_PHRASE = {
  intern: 'a student / fresher',
  junior: 'a junior',
  mid: 'a mid-level',
  senior: 'a senior',
  lead: 'a lead',
  manager: 'a manager',
};
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

/** Full postings from the employer, by job id. Missing ids just keep their stored text. */
async function loadFullJobTexts(jobs) {
  const chunks = [];
  for (let i = 0; i < jobs.length; i += 10) chunks.push(jobs.slice(i, i + 10));
  const results = await Promise.all(chunks.map((chunk) => postJson('/api/career/job-text', {
    jobs: chunk.map((j) => ({ id: j.id, url: j.url })),
  })));
  return Object.assign({}, ...results.map((r) => r.data?.texts || {}));
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

function printResume(text, title) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(resumePrintDocument(text, title));
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

const HUB_PATHS = { resume: '/career?view=resume', matches: '/career/matches', tracker: '/career/applications' };
const HUB_TABS = [['matches', 'Jobs'], ['tracker', 'My applications']];

function viewFromUrl() {
  const query = new URLSearchParams(location.search);
  if (query.get('job')) return 'pack';
  if (location.pathname.startsWith('/career/matches')) return 'matches';
  if (location.pathname.startsWith('/career/applications')) return 'tracker';
  return query.get('view') === 'resume' ? 'resume' : 'matches';
}

export default function CareerHub() {
  const [store, setStore] = useState(null);
  const [view, setView] = useState('resume');
  const [matchesOpened, setMatchesOpened] = useState(false);
  const [passport, setPassport] = useState(() => normalizePassport({}));
  const [pendingJob, setPendingJob] = useState('');
  const [packJob, setPackJob] = useState(null);
  const [packJobError, setPackJobError] = useState('');
  const [autoBuild, setAutoBuild] = useState('');
  const hydrated = useRef(false);

  useEffect(() => {
    const s = readStore();
    setStore(s);
    setPassport(readPassport());
    const jobParam = new URLSearchParams(location.search).get('job');
    if (jobParam) setPendingJob(jobParam);
    setView(s.profile ? viewFromUrl() : 'resume');
    hydrated.current = true;
  }, []);

  useEffect(() => {
    function onPop() {
      const job = new URLSearchParams(location.search).get('job');
      if (job) {
        setPendingJob(job);
        setPackJob((cur) => (cur?.id === job ? cur : null));
      }
      setView(viewFromUrl());
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Stays mounted once opened, so changing tabs doesn't stop a match run.
  if (view === 'matches' && !matchesOpened) setMatchesOpened(true);

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

  const go = useCallback((next) => {
    setView(next);
    try { history.pushState(null, '', HUB_PATHS[next]); } catch {}
    window.scrollTo({ top: 0 });
  }, []);

  // build is true only when the person tapped "Tailor resume", so opening a link never spends a pack.
  const openPack = useCallback((job, build = false) => {
    if (build) setAutoBuild(job.id);
    setPackJob(null);
    setPendingJob(job.id);
    setView('pack');
    update((s) => (s.applications[job.id]
      ? {}
      : { applications: { ...s.applications, [job.id]: stamp({ job: pickJob(job) }, 'saved') } }));
    try { history.pushState(null, '', `/career?job=${encodeURIComponent(job.id)}`); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [update]);

  if (!store) return <div className="ch-shell"><div className="ch-skeleton" /></div>;

  const appCount = Object.keys(store.applications || {}).length;
  const early = isEarlyCareer(store.profile);

  return (
    <div className={`ch-shell${store.profile ? '' : ' is-new'}`}>
      {store.profile ? (
        <>
          <header className="ch-hubbar">
            <h1>Resume Hub</h1>
            <button type="button" className="ch-text-btn" onClick={() => go('resume')}>Your resume</button>
          </header>
          <nav className="ch-tabs-hub" aria-label="Resume Hub">
            {HUB_TABS.map(([id, label]) => (
              <button key={id} type="button" className={view === id ? 'is-on' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}>
                {label}{id === 'tracker' && appCount > 0 && <span>{appCount}</span>}
              </button>
            ))}
          </nav>
        </>
      ) : (
        <header className="ch-hero">
          <p className="ch-kicker"><span className="ch-dot" />Resume Hub</p>
          <h1>
            The right resume for <em>every</em> job.
            <span>Ready in about a minute.</span>
          </h1>
          <p className="ch-lede">
            Upload your resume once. Tap a job. Download a resume written for it, then apply on the
            company&apos;s own site. Nothing is sent without you.
          </p>
        </header>
      )}

      {matchesOpened && store.profile && (
        <div className="ch-stage" hidden={view !== 'matches'}>
          <MatchesStep store={store} update={update} onPick={(job) => openPack(job, true)} early={early} />
        </div>
      )}
      {view !== 'matches' && (
        <div className="ch-stage" key={view}>
          {view === 'resume' && (
            <ResumeStep store={store} update={update} onDone={() => { if (pendingJob) { setAutoBuild(pendingJob); setView('pack'); } else go('matches'); }} />
          )}
          {view === 'pack' && store.profile && (
            <>
              <button type="button" className="ch-text-btn ch-back" onClick={() => go('matches')}>← Back to jobs</button>
              <PackStep
                store={store}
                update={update}
                job={packJob}
                jobError={packJobError}
                loading={Boolean(pendingJob) && !packJob && !packJobError}
                passport={passport}
                savePassport={savePassport}
                autoBuild={autoBuild}
                onAutoBuilt={() => setAutoBuild('')}
                onBrowse={() => go('matches')}
              />
            </>
          )}
          {view === 'tracker' && <TrackerStep store={store} update={update} onOpen={openPack} onBrowse={() => go('matches')} />}
        </div>
      )}
    </div>
  );
}

const VERDICT_LABEL = { strong: 'Strong match', good: 'Good match', stretch: 'Stretch', poor: 'Long shot' };

// Scores move a few points between runs, so people see the verdict and only sorting uses the number.
function FitLabel({ match }) {
  if (!match) return null;
  return <span className={`ch-fit-pill is-${match.verdict}`}>{VERDICT_LABEL[match.verdict]}</span>;
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
    const firstUpload = !profile;
    update((s) => ({ resumeText: clean, profile: data.profile, resumeHash: hash, matches: s.resumeHash === hash ? s.matches : {} }));
    if (data.mode === 'fallback') setNotice('AI was busy, so this is a quick keyword read. Matches improve once it is back. Re-read later.');
    else if (firstUpload) onDone();
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
        <p className="ch-small ch-muted">Saved in this browser only, no account. If a number or skill isn&apos;t in your resume, it isn&apos;t added.</p>
      </section>
    );
  }

  const skills = profile.skills || [];
  return (
    <section className="ch-idcard">
      <div className="ch-id-top">
        <div className="ch-id-name">
          <p className="ch-kicker">{profile.source === 'fallback' ? 'Quick read · check below' : 'Read from your resume'}</p>
          <h2>{profile.name || 'Your profile'}</h2>
          {profile.headline && <p>{profile.headline}</p>}
        </div>
        <div className="ch-monogram" aria-hidden="true">
          {(profile.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('')}
        </div>
      </div>

      {/* One editable sentence instead of a form: reads like a pitch, edits like fields. */}
      <p className="ch-madlib">
        I&apos;m{' '}
        <span className="ch-slot">
          <select aria-label="Career stage" value={profile.level || 'mid'} onChange={(e) => patchProfile({ level: e.target.value })}>
            {LEVELS.map(([k, l]) => <option key={k} value={k}>{STAGE_PHRASE[k] || l}</option>)}
          </select>
        </span>{' '}
        with{' '}
        <span className="ch-slot ch-slot-num">
          <input
            aria-label="Years of experience"
            type="number"
            min="0"
            max="50"
            value={profile.yearsExperience ?? 0}
            onChange={(e) => patchProfile({ yearsExperience: Number(e.target.value) || 0 })}
          />
        </span>{' '}
        {Number(profile.yearsExperience) === 1 ? 'year' : 'years'} of experience, looking for{' '}
        <span className="ch-slot ch-slot-wide">
          <textarea
            aria-label="Roles you want"
            rows={1}
            value={(profile.targetTitles || []).join(', ')}
            placeholder="roles you want"
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            onChange={(e) => patchProfile({ targetTitles: e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6) })}
          />
        </span>{' '}
        roles,{' '}
        <button
          type="button"
          className="ch-slot ch-slot-btn"
          aria-pressed={Boolean(profile.openToRemote)}
          onClick={() => patchProfile({ openToRemote: !profile.openToRemote })}
        >
          {profile.openToRemote ? 'open to remote' : 'office only'}
        </button>
        .
      </p>

      {isEarlyCareer(profile) && (
        <p className="ch-fresher">
          <b>Early-career mode is on.</b> Your projects, internships and coursework count as experience, and we will
          surface internships and fresher roles first.
        </p>
      )}

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
        <button type="button" className="ch-cta" onClick={onDone}>Back to jobs →</button>
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
    const [details, fullTexts] = await Promise.all([
      Promise.all(top.map((r) => loadJobDetail(r.job.id))),
      loadFullJobTexts(top.filter((r) => !store.matches?.[r.job.id]).map((r) => r.job)),
    ]);
    if (id !== runId.current) return;
    const next = top.map((r, i) => {
      const description = String(fullTexts[r.job.id] || details[i]?.description || '');
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
        jobs: batch.map((r) => ({ id: r.job.id, title: r.job.title, company: r.job.company, experience: r.job.experience || '', description: r.description.slice(0, MATCH_TEXT_MAX) })),
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

      <details className="ch-filter-more">
      <summary>Filters</summary>
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
      </details>

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

function MatchCard({ row, rank, onPick, app }) {
  const { job, match, hasInfo, reasons } = row;
  const meta = [job.company, job.location?.split(',')[0], job.work === 'remote' ? 'Remote' : '', job.experience, postedLabel(job)].filter(Boolean);
  return (
    <article className={`ch-match${rank === 1 ? ' is-top' : ''}`}>
      <div className="ch-match-body">
        <div className="ch-match-title">
          <h3>{job.title}</h3>
          <FitLabel match={match} />
          {isEntryJob(job) && <span className="ch-tag">Fresher-open</span>}
          {app && <span className="ch-tag is-app">{BOARD.find((b) => b.id === boardStatus(app.status))?.label || 'Saved'}</span>}
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
                  <span className="ch-proof-cta">See why</span>
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
        <button type="button" className="ch-cta ch-cta-sm" onClick={() => onPick(job)}>{app?.pack ? 'Open resume' : 'Tailor resume'}</button>
        <a className="ch-text-btn" href={`/jobs/${jobUrlId(job)}`} target="_blank" rel="noreferrer">Job post ↗</a>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- Apply pack

const PACK_STAGES = [
  'Reading the full job post',
  'Checking your fit',
  'Rewording your resume',
  'Writing your cover letter',
  'Drafting screening answers',
];
const PACK_STAGE_MS = 7000;
const PACK_WRITING_STAGE = 2;
// Under this, the match scoring means a core requirement is missing, so ask before building.
const FIT_WARN_BELOW = 65;
const LONG_SHOT_BELOW = 40;

// The first two stages are real requests. The rest are paced to one AI call, so the last
// stage holds until the pack really arrives.
function PackBuilding({ phase }) {
  const [tick, setTick] = useState(0);
  const writing = phase === 'writing';

  useEffect(() => {
    if (!writing) return undefined;
    const timer = setInterval(() => setTick((t) => t + 1), PACK_STAGE_MS);
    return () => clearInterval(timer);
  }, [writing]);

  const current = phase === 'reading' ? 0 : phase === 'fit' ? 1 : Math.min(PACK_WRITING_STAGE + tick, PACK_STAGES.length - 1);

  return (
    <div className="ch-building">
      <div className="ch-build-paper" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
        <span className="ch-scan" />
      </div>
      <div className="ch-build-copy">
        <h3>Tailoring your resume</h3>
        <ol className="ch-build-steps" role="status">
          {PACK_STAGES.map((label, i) => (
            <li key={label} className={i < current ? 'is-done' : i === current ? 'is-active' : ''} aria-current={i === current ? 'step' : undefined}>
              {label}
            </li>
          ))}
        </ol>
        <p className="ch-small ch-muted">Usually takes under a minute.</p>
      </div>
    </div>
  );
}

function PackStep({ store, update, job, jobError, loading, passport, savePassport, onBrowse, autoBuild, onAutoBuilt }) {
  const app = job ? store.applications?.[job.id] : null;
  const pack = app?.pack || null;
  const [busy, setBusy] = useState(false);
  const [packPhase, setPackPhase] = useState('writing');
  const [fitAcceptedFor, setFitAcceptedFor] = useState('');
  const fullText = useRef({ id: '', text: '' });
  const [pastedDescription, setPastedDescription] = useState('');
  const [needsPaste, setNeedsPaste] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState('');
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('resume');
  const autoStarted = useRef('');

  useEffect(() => {
    if (!job || autoBuild !== job.id || autoStarted.current === job.id) return;
    autoStarted.current = job.id;
    onAutoBuilt();
    const known = store.matches?.[job.id];
    if (!store.applications?.[job.id]?.pack && !(known && known.score < FIT_WARN_BELOW)) generate(false);
  }, [job?.id, autoBuild]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!job) {
    return (
      <section className="ch-empty-state">
        {loading ? <div className="ch-card-skel" /> : (
          <>
            <p>{jobError || 'Pick a job and we will tailor your resume for it here.'}</p>
            <button type="button" className="ch-cta" onClick={onBrowse}>See jobs</button>
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

  async function generate(allowFallback = false, fitAccepted = fitAcceptedFor === job.id) {
    setBusy(true);
    setError(null);
    let jobDescription = pastedDescription.trim();
    if (!jobDescription) {
      if (fullText.current.id !== job.id) {
        setPackPhase('reading');
        const full = await loadFullJobTexts([job]);
        fullText.current = { id: job.id, text: full[job.id] || '' };
      }
      jobDescription = fullText.current.text || description || `${job.title} at ${job.company}`;
    }
    // Jobs opened from a link skip the matches step, so score them before spending a pack.
    if (!pack && !match && !fitAccepted) {
      setPackPhase('fit');
      const fit = await postJson('/api/career/match', {
        resumeText: store.resumeText,
        earlyCareer: isEarlyCareer(store.profile),
        jobs: [{ id: job.id, title: job.title, company: job.company, experience: job.experience || '', description: jobDescription.slice(0, MATCH_TEXT_MAX) }],
      });
      const found = fit.ok ? fit.data.matches?.[job.id] : null;
      if (found) {
        update((s) => ({ matches: { ...s.matches, [job.id]: found } }));
        if (found.score < FIT_WARN_BELOW) {
          setBusy(false);
          return;
        }
      }
    }
    setPackPhase('writing');
    const { ok, data } = await postJson('/api/resume/tailor', {
      resumeText: store.resumeText,
      jobDescription,
      jobTitle: job.title,
      company: job.company,
      jobSkills: Array.isArray(job.skills) ? job.skills : [],
      allowFallback,
    });
    setBusy(false);
    if (data.code === 'WEAK_JOB_DESCRIPTION') {
      setNeedsPaste(true);
      setError({ message: pastedDescription.trim()
        ? 'That still looks like company information. Paste the responsibilities and requirements.'
        : 'We could not read this job from the company site.' });
      return;
    }
    if (!ok || !data.tailored) {
      setError({ message: data.error || 'Could not tailor your resume right now.', canFallback: data.code === 'AI_UNAVAILABLE' || data.code === 'AI_INVALID' });
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
      <div>
        <h2>{job.title}</h2>
        <p className="ch-meta">{[job.company, job.location?.split(',')[0], postedLabel(job)].filter(Boolean).join(' · ')}</p>
        <FitLabel match={match} />
      </div>
    </header>
  );

  if (!pack) {
    return (
      <section className="ch-pack">
        {head}
        {busy ? <PackBuilding phase={packPhase} /> : match && match.score < FIT_WARN_BELOW && fitAcceptedFor !== job.id ? (
        <div className="ch-fit-warn">
          <h3>{match.score < LONG_SHOT_BELOW ? 'This looks like a long shot' : 'This one is a stretch'}</h3>
          {match.why && <p>{match.why}</p>}
          {match.gaps?.length > 0 && <p className="ch-small"><b>Not shown in your resume:</b> {match.gaps.join(', ').replace(/([^…])$/, '$1.')}</p>}
          <p className="ch-small ch-muted">Tailoring cannot add experience you don&apos;t have, so your time may go further on a closer match.</p>
          <div className="ch-row">
            <button type="button" className="ch-cta" onClick={onBrowse}>See better jobs</button>
            <button type="button" className="ch-ghost" onClick={() => { setFitAcceptedFor(job.id); generate(false, true); }}>Tailor anyway</button>
          </div>
        </div>
        ) : (
        <div className="ch-brief">
          <div>
            <h3>Tailor your resume for this job</h3>
            <p className="ch-small ch-muted">About 30 seconds. You check everything before you apply.</p>
            {needsPaste && (
              <div className="ch-paste-jd">
                <label className="ch-small" htmlFor="ch-paste-jd">
                  Copy the responsibilities and requirements from{' '}
                  <a href={job.applyUrl || job.url} target="_blank" rel="noreferrer">the job post ↗</a>, paste them here, then tailor your resume.
                </label>
                <textarea
                  id="ch-paste-jd"
                  className="ch-input"
                  rows={8}
                  value={pastedDescription}
                  onChange={(e) => setPastedDescription(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="ch-brief-cta">
            <button type="button" className="ch-cta" onClick={() => generate(false)}>Tailor my resume</button>
          </div>
        </div>
        )}
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

  const openPlaceholders = findResumeBlanks(pack.resume);
  const fileBase = `${safeName(passport.fullName || store.profile?.name)}_${safeName(job.company)}`;
  const done = pack.done || {};
  const applied = ['applied', 'interview', 'offer'].includes(app?.status);
  const blanks = openPlaceholders.length;
  // One main button at a time: it moves along as each step is done.
  const nextStep = blanks ? 'fill' : !done.pdf ? 'pdf' : !done.open && job.applyUrl ? 'open' : applied ? '' : 'applied';
  const stepClass = (key) => `${nextStep === key ? 'ch-cta' : 'ch-ghost'}`;
  const changeCount = (pack.changes || []).length;
  const noteCount = (pack.warnings || []).length;

  return (
    <section className="ch-pack">
      {head}
      <div className="ch-actions">
        {blanks > 0 && <button type="button" className={stepClass('fill')} onClick={() => { setTab('resume'); setEditing(true); }}>Fill {blanks} blank{blanks > 1 ? 's' : ''}</button>}
        <button type="button" className={stepClass('pdf')} onClick={() => { printResume(pack.resume, `${fileBase}_Resume`); tick('pdf'); }}>Download PDF</button>
        <button type="button" className={stepClass('open')} onClick={openApplication} disabled={!job.applyUrl}>Apply on company site ↗</button>
        {(done.open || applied) && (
          <button type="button" className={stepClass('applied')} onClick={() => setStatus('applied')} disabled={applied}>{applied ? 'Applied ✓' : 'I applied'}</button>
        )}
      </div>
      {error && <p className="ch-error">{error.message}</p>}
      <div className="ch-tabs" role="tablist">
        {[['resume', 'Resume'], ['cover', 'Cover letter'], ['answers', `Answers (${(pack.answers || []).length})`]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

          {tab === 'resume' && (
            <div className="ch-sheet-wrap">
              <div className="ch-sheet-tools">
                <button type="button" className="ch-text-btn" onClick={() => setEditing((v) => !v)}>{editing ? 'Done editing' : '✎ Edit'}</button>
                <button type="button" className="ch-text-btn" onClick={() => copy('resume', pack.resume)}>{copied === 'resume' ? 'Copied ✓' : 'Copy'}</button>
                <button type="button" className="ch-text-btn" onClick={() => generate(false)} disabled={busy}>{busy ? 'Rewriting…' : '↻ Rewrite'}</button>
              </div>
              {(changeCount > 0 || noteCount > 0) && (
                <details className="ch-review">
                  <summary>{changeCount} change{changeCount === 1 ? '' : 's'} made{noteCount ? `, ${noteCount} note${noteCount === 1 ? '' : 's'}` : ''}. See them</summary>
                  {pack.warnings?.length > 0 && (
                    <div className="ch-honest">
                      {pack.warnings.map((w) => <p key={w}>{w}</p>)}
                    </div>
                  )}
                  <div className="ch-diff">
                    {(pack.changes || []).map((c, i) => (
                      <div key={i} className="ch-diff-item">
                        <span className="ch-diff-sec">{c.section}</span>
                        {c.before && <p className="ch-del">{c.before}</p>}
                        <p className="ch-add">{c.after}</p>
                        {c.reason && <p className="ch-why ch-muted">{c.reason}</p>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {editing ? (
                <textarea className="ch-sheet ch-sheet-edit" value={pack.resume} onChange={(e) => setPack({ resume: e.target.value })} />
              ) : (
                <>
                  <style dangerouslySetInnerHTML={{ __html: RESUME_CSS }} />
                  <article className="ch-sheet rz" onDoubleClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: resumeHtml(pack.resume) }} />
                </>
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

    </section>
  );
}

// ---------------------------------------------------------------- Tracker

function TrackerStep({ store, update, onOpen, onBrowse }) {
  const [filter, setFilter] = useState('all');
  const [removed, setRemoved] = useState(null);
  const apps = Object.values(store.applications || {});
  const shown = apps
    .filter((a) => filter === 'all' || boardStatus(a.status) === filter)
    .sort((a, b) => Date.parse(b.dates?.[b.status] || 0) - Date.parse(a.dates?.[a.status] || 0));

  function move(id, status) {
    update((s) => ({ applications: { ...s.applications, [id]: stamp(s.applications[id], status) } }));
  }

  function remove(app) {
    setRemoved(app);
    update((s) => {
      const next = { ...s.applications };
      delete next[app.job.id];
      return { applications: next };
    });
  }

  function undo() {
    update((s) => ({ applications: { ...s.applications, [removed.job.id]: removed } }));
    setRemoved(null);
  }

  const undoBar = removed && (
    <p className="ch-undo" role="status">
      Removed {removed.job.title}.
      <button type="button" className="ch-text-btn" onClick={undo}>Undo</button>
    </p>
  );

  if (!apps.length) {
    return (
      <>
        {undoBar}
        <section className="ch-empty-state">
          <p>No applications yet. Jobs you tailor a resume for show up here.</p>
          <button type="button" className="ch-cta" onClick={onBrowse}>See jobs</button>
        </section>
      </>
    );
  }

  return (
    <section>
      <div className="ch-filter" role="group" aria-label="Filter by status">
        {[{ id: 'all', label: 'All' }, ...BOARD].map((b) => {
          const count = b.id === 'all' ? apps.length : apps.filter((a) => boardStatus(a.status) === b.id).length;
          if (!count && (b.id === 'offer' || b.id === 'rejected')) return null;
          return (
            <button key={b.id} type="button" className={`${filter === b.id ? 'is-on' : ''}${count ? '' : ' is-empty'}`} aria-pressed={filter === b.id} onClick={() => setFilter(b.id)}>
              {b.label} <span>{count}</span>
            </button>
          );
        })}
      </div>
      {undoBar}
      {shown.length ? (
        <ul className="ch-apps">
          {shown.map((a) => {
            const when = a.dates?.[a.status];
            return (
              <li key={a.job.id} className="ch-app">
                <div className="ch-app-main">
                  <button type="button" className="ch-app-title" onClick={() => onOpen(a.job)}>{a.job.title}</button>
                  <p className="ch-meta">{a.job.company}{when ? ` · ${new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</p>
                </div>
                <FitLabel match={store.matches?.[a.job.id]} />
                <select className="ch-app-status" aria-label={`Status of ${a.job.title}`} value={boardStatus(a.status)} onChange={(e) => move(a.job.id, e.target.value)}>
                  {BOARD.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
                <button type="button" className="ch-ghost ch-app-open" onClick={() => onOpen(a.job, !a.pack)}>{a.pack ? 'Open resume' : 'Tailor resume'}</button>
                <details className="ch-app-more">
                  <summary aria-label={`More actions for ${a.job.title}`}>⋯</summary>
                  <button type="button" onClick={() => remove(a)}>Remove</button>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ch-small ch-muted ch-app-none">Nothing in this status yet.</p>
      )}
    </section>
  );
}
