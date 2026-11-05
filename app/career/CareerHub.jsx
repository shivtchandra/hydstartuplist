'use client';

// Career hub: resume once → AI-ranked, explained matches → per-job tailored
// resume, cover letter and answers → user reviews → applies on the employer's
// own page. Everything is stored in this browser (localStorage), no login.
// Design idea: every claim has a receipt — skills and matches show the resume
// line that proves them.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sessionState, useSessionState } from '../../lib/session-state.js';
import { usePathname, useSearchParams } from 'next/navigation';
import { RESUME_CSS, findResumeBlanks, resumeHtml, resumePrintDocument } from '../../lib/resume/layout.js';
import { extractResumeText } from '../../lib/resume/parse-client.js';
import { isEarlyCareer, isEntryJob, shortlistJobs, curateJobs, experienceEligibility, assessmentConfidence, availabilityInfo, isRecommendedRow, foreignOnly, matchingDescription } from '../../lib/career/prefilter.js';
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
    if (saved && typeof saved === 'object') return { applications: {}, ...saved,
      matches: Object.fromEntries(Object.entries(saved.matches || {}).filter(([, match]) => match?.assessmentVersion === 4)) };
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

const HUB_PATHS = { resume: '/career?view=resume', matches: '/career/matches', rewrite: '/career?view=rewrite', tracker: '/career/applications' };
const HUB_TABS = [['matches', 'Jobs'], ['rewrite', 'Rewrite resume'], ['tracker', 'My applications']];

function viewFromUrl() {
  const query = new URLSearchParams(location.search);
  if (query.get('job')) return 'pack';
  if (location.pathname.startsWith('/career/matches')) return 'matches';
  if (location.pathname.startsWith('/career/applications')) return 'tracker';
  return ['resume', 'rewrite'].includes(query.get('view')) ? query.get('view') : 'matches';
}

export default function CareerHub() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = pathname + '?' + searchParams.toString();
  const [store, setStore] = useSessionState('career:data', null, { persist: false });
  const [view, setView] = useState('resume');
  const [matchesOpened, setMatchesOpened] = useState(false);
  const [rewriteOpened, setRewriteOpened] = useState(false);
  const [passport, setPassport] = useState(() => normalizePassport({}));
  const [pendingJob, setPendingJob] = useState('');
  const [packJob, setPackJob] = useState(null);
  const [packJobError, setPackJobError] = useState('');
  const [autoBuild, setAutoBuild] = useState('');
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const s = sessionState.get('career:data', null, false) || readStore();
    setStore(s);
    setPassport(readPassport());
    const params = new URLSearchParams(location.search);
    const jobParam = params.get('job');
    if (jobParam) {
      setPendingJob(jobParam);
      if (params.get('rewrite') === '1') setAutoBuild(jobParam);
    }
    setView(s.profile ? viewFromUrl() : 'resume');
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    function onPop() {
      const params = new URLSearchParams(location.search);
      const job = params.get('job');
      setAutoBuild(params.get('rewrite') === '1' ? job || '' : '');
      if (job) {
        setPendingJob(job);
        setPackJob((cur) => (cur?.id === job ? cur : null));
      }
      setView(viewFromUrl());
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Next can reuse this client component when only the job/query changes.
  useEffect(() => {
    if (!store) return;
    const params = new URLSearchParams(location.search);
    const job = params.get('job');
    if (job) {
      setPendingJob(job);
      setPackJob(current => current?.id === job ? current : null);
    }
    setAutoBuild(params.get('rewrite') === '1' ? job || '' : '');
    setView(store.profile ? viewFromUrl() : 'resume');
  }, [locationKey, Boolean(store?.profile)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep background work and drafts alive when switching Hub sections.
  if (view === 'matches' && !matchesOpened) setMatchesOpened(true);
  if (view === 'rewrite' && !rewriteOpened) setRewriteOpened(true);

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

  const update = useCallback((patch) => setStore((s) => {
    if (!s) return s;
    const next = { ...s, ...(typeof patch === 'function' ? patch(s) : patch) };
    // Persist here as well as during rendering: background work can finish while
    // the Hub is unmounted on another route.
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
    return next;
  }), [setStore]);

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

  // Only explicit rewrite actions generate a draft; saved application links just open it.
  const openPack = useCallback((job, build = false) => {
    if (build) setAutoBuild(job.id);
    setPackJob(current => current?.id === job.id ? current : null);
    setPendingJob(job.id);
    setView('pack');
    update((s) => (s.applications[job.id]
      ? {}
      : { applications: { ...s.applications, [job.id]: stamp({ job: pickJob(job) }, 'saved') } }));
    try { history.pushState(null, '', `/career?job=${encodeURIComponent(job.id)}${build ? '&rewrite=1' : ''}`); } catch {}
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
            <div>
              <p className="ch-hub-eyebrow">Your next move</p>
              <h1>{view === 'pack' ? 'Tailor your resume' : 'Resume Hub'}</h1>
              <p className="ch-hub-description">{view === 'pack' ? 'A separate draft for your selected job.' : 'Find your fit. Make your experience count.'}</p>
            </div>
            <button type="button" className="ch-resume-link" onClick={() => go('resume')}>Your resume <span aria-hidden="true">↗</span></button>
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
      {rewriteOpened && store.profile && (
        <div className="ch-stage" hidden={view !== 'rewrite'}>
          <RoleRewriteStep key={store.resumeHash} store={store} update={update} />
        </div>
      )}
      {view !== 'matches' && (view !== 'rewrite' || !store.profile) && (
        <div className="ch-stage" key={view}>
          {(view === 'resume' || (view === 'rewrite' && !store.profile)) && (
            <ResumeStep store={store} update={update} onDone={() => { if (!mounted.current) return; if (pendingJob) { setAutoBuild(pendingJob); setView('pack'); } else go(viewFromUrl() === 'rewrite' ? 'rewrite' : 'matches'); }} />
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
  const scope = `career:resume:${store.resumeHash || 'new'}`;
  const [text, setText] = useSessionState(scope + ':text', store.resumeText || '');
  const [busy, setBusy] = useSessionState(scope + ':busy', '', { persist: false });
  const [error, setError] = useSessionState(scope + ':error', '', { persist: false });
  const [notice, setNotice] = useSessionState(scope + ':notice', '', { persist: false });
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useSessionState(scope + ':paste', false);
  const [openSkill, setOpenSkill] = useSessionState(scope + ':skill', '');
  const fileRef = useRef(null);
  const profile = store.profile;

  async function analyze(source, operation) {
    const request = operation ?? sessionState.set(scope + ':request', value => value + 1, 0, false);
    const clean = String(source ?? text).trim();
    if (clean.length < 80) { setError('That looks too short. Add your full resume.'); setBusy(''); return; }
    setError('');
    setNotice('');
    setBusy('Reading your resume…');
    const { ok, data } = await postJson('/api/career/profile', { resumeText: clean });
    if (request !== sessionState.get(scope + ':request', 0, false)) return;
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
    const request = sessionState.set(scope + ':request', value => value + 1, 0, false);
    setError('');
    setBusy('Opening your file…');
    try {
      const extracted = await extractResumeText(file);
      if (request !== sessionState.get(scope + ':request', 0, false)) return;
      setText(extracted);
      await analyze(extracted, request);
    } catch (err) {
      if (request !== sessionState.get(scope + ':request', 0, false)) return;
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

// ---------------------------------------------------------- Role-based rewrite

function RoleRewriteStep({ store, update }) {
  const saved = store.roleRewrite?.resumeHash === store.resumeHash ? store.roleRewrite : null;
  const draft = store.roleRewriteDraft?.resumeHash === store.resumeHash ? store.roleRewriteDraft : null;
  const scope = `career:rewrite:${store.resumeHash}`;
  const [target, setTarget] = useSessionState(scope + ':target', draft?.target ?? saved?.target ?? store.profile.targetTitles?.[0] ?? '');
  const [busy, setBusy] = useSessionState(scope + ':busy', false, { persist: false });
  const [error, setError] = useSessionState(scope + ':error', '', { persist: false });
  const [editing, setEditing] = useSessionState(scope + ':editing', false);
  const [copied, setCopied] = useState(false);

  async function generate(event) {
    event.preventDefault();
    const role = target.trim();
    if (role.length < 3 || sessionState.get(scope + ':busy', false, false)) return;
    setBusy(true); setError(''); setCopied(false);
    try {
      const { ok, data } = await postJson('/api/resume/tailor', {
        resumeText: store.resumeText, jobTitle: role, rewriteMode: 'role',
      });
      const text = data.tailored?.fullTailoredResume;
      if (!ok || !text) { setError(data.error || 'Could not rewrite your resume. Try again.'); return; }
      update((current) => current.resumeHash === store.resumeHash ? {
        roleRewrite: { target: role, text, resumeHash: store.resumeHash,
          changes: Array.isArray(data.tailored.changes) ? data.tailored.changes : [] },
      } : {});
      setEditing(false);
    } catch {
      setError('Could not reach the resume service. Check your connection and try again.');
    } finally { setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(saved.text); setCopied(true); }
    catch { setError('Could not copy. Use Edit text to select and copy your resume.'); }
  }

  const changes = (saved?.changes || []).filter((change) => typeof change.before === 'string' && typeof change.after === 'string');
  return (
    <section className="ch-role-rewrite">
      <div className="ch-shortlist-intro">
        <h2>A resume for your next role</h2>
        <p>Choose a role to focus your experience. For a particular vacancy, use Tailor resume on its job card.</p>
      </div>
      <form className="ch-role-form" onSubmit={generate}>
        <label htmlFor="ch-target-role">Target role</label>
        <div className="ch-row">
          <input id="ch-target-role" className="ch-input" value={target} minLength={3} maxLength={160}
            placeholder="Frontend developer, data analyst…" required onChange={(event) => {
              const target = event.target.value;
              setTarget(target);
              update({ roleRewriteDraft: { target, resumeHash: store.resumeHash } });
            }} />
          <button className="ch-cta" type="submit" disabled={busy || target.trim().length < 3}>
            {busy ? 'Rewriting…' : 'Rewrite for this role'}
          </button>
        </div>
        <p className="ch-small ch-muted">General role version. No vacancy match score or company-specific application answers.</p>
      </form>
      {error && <p className="ch-error" role="alert">{error}</p>}
      {busy && <p className="ch-note" role="status">Focusing your summary, skills and achievements while preserving your source experience.</p>}
      {saved && (
        <div className="ch-role-result">
          <div className="ch-receipts-head">
            <h3>Draft for {saved.target}</h3>
            <div className="ch-row">
              <button type="button" className="ch-text-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
              <button type="button" className="ch-text-btn" onClick={() => setEditing(!editing)}>{editing ? 'Preview' : 'Edit text'}</button>
              <button type="button" className="ch-ghost" onClick={() => printResume(saved.text, saved.target + ' resume')}>Print / save PDF</button>
            </div>
          </div>
          <p className="ch-small ch-muted">Review wording and facts before using this version. Your original resume stays available below.</p>
          {editing ? (
            <textarea aria-label="Rewritten resume" className="ch-input" rows={24} value={saved.text}
              onChange={(event) => update({ roleRewrite: { ...saved, text: event.target.value } })} />
          ) : (
            <><style>{RESUME_CSS}</style><div className="ch-paper" dangerouslySetInnerHTML={{ __html: resumeHtml(saved.text) }} /></>
          )}
          {changes.length > 0 && (
            <details className="ch-proof"><summary>Review wording changes ({changes.length})</summary>
              <ul>{changes.map((change, index) => <li key={index}><span>{change.before}</span><em>{change.after}</em></li>)}</ul>
            </details>
          )}
          <details className="ch-proof"><summary>Compare with your original resume</summary>
            <pre className="ch-role-source">{store.resumeText}</pre>
          </details>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Matches

function ShortlistBuilding({ phase, progress }) {
  const stages = ['Finding relevant roles', 'Reading job descriptions', 'Comparing your experience'];
  const current = progress < 0.15 ? 0 : progress < 0.2 ? 1 : 2;

  return (
    <div className="ch-building ch-shortlist-building">
      <div className="ch-shortlist-art" aria-hidden="true">
        <div className="ch-build-paper">
          <i /><i /><i /><i /><i /><i />
          <span className="ch-scan" />
        </div>
        <span className="ch-shortlist-seal">↔</span>
      </div>
      <div className="ch-build-copy">
        <p className="ch-loading-kicker">Your next move, taking shape</p>
        <h2>Building your shortlist</h2>
        <p className="ch-loading-description">Finding roles that fit the skills and experience in your resume.</p>
        <ol className="ch-build-steps" aria-label="Shortlist progress">
          {stages.map((label, i) => (
            <li key={label} className={i < current ? 'is-done' : i === current ? 'is-active' : ''} aria-current={i === current ? 'step' : undefined}>
              {label}
            </li>
          ))}
        </ol>
        <div className="ch-loading-progress" role="progressbar" aria-label="Building your shortlist" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={phase}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className="ch-loading-status" role="status" aria-atomic="true">{phase}</p>
      </div>
    </div>
  );
}

function MatchesStep({ store, update, onPick, early }) {
  const { profile, resumeText, resumeHash } = store;
  const cachedMatch = (jobId) => {
    const match = store.matches?.[jobId];
    return match?.assessmentVersion === 4 && match.assessedYears === (profile.yearsExperience ?? null) ? match : null;
  };
  const [mode, setMode] = useSessionState(`career:matches-mode:${resumeHash}`, early && Number(profile.yearsExperience || 0) < 1 ? 'entry' : 'best');
  const matchKey = JSON.stringify([mode, resumeHash, profile.level, profile.yearsExperience, profile.roleFamilies, profile.targetTitles, (profile.skills || []).map((s) => s.name), profile.openToRemote]);
  const scope = 'career:matches:' + matchKey;
  const [rows, setRows] = useSessionState(scope + ':rows', null, { persist: false });
  const [entryTotal, setEntryTotal] = useSessionState(scope + ':entry-total', 0, { persist: false });
  const [availableTotal, setAvailableTotal] = useSessionState(scope + ':total', 0, { persist: false });
  const [phase, setPhase] = useSessionState(scope + ':phase', '', { persist: false });
  const [progress, setProgress] = useSessionState(scope + ':progress', 0, { persist: false });
  const [error, setError] = useSessionState(scope + ':error', '', { persist: false });
  const [filters, setFilters] = useSessionState(`career:matches-filters-v2:${resumeHash}:${mode}`, { min: 0, remote: false, posted: 7 });

  const run = useCallback(async () => {
    const id = sessionState.set(scope + ':run', value => value + 1, 0, false);
    const active = () => id === sessionState.get(scope + ':run', 0, false);
    setError('');
    setProgress(0.05);
    setRows(null);
    setPhase('Checking available roles…');
    let index;
    try {
      index = await (await fetch('/data/jobs-index.json')).json();
    } catch {
      setError('Could not load jobs. Check your connection and retry.');
      setPhase('');
      return;
    }
    const jobs = curateJobs(index.jobs || []);
    setAvailableTotal(jobs.length);
    setEntryTotal(jobs.filter((job) => isEntryJob(job)).length);
    const top = shortlistJobs(jobs, profile, { limit: SHORTLIST, entryOnly: mode === 'entry', maxDays: filters.posted > 0 ? filters.posted : 7 });
    setProgress(0.15);
    setPhase(`Reading ${top.length} job descriptions…`);
    const [details, fullTexts] = await Promise.all([
      Promise.all(top.map((r) => loadJobDetail(r.job.id))),
      loadFullJobTexts(top.map((r) => r.job)),
    ]);
    if (!active()) return;
    const next = top.map((r, i) => {
      const description = String(fullTexts[r.job.id] || details[i]?.description || r.job.description || '');
      const job = { ...r.job, ...details[i], description };
      return { ...r, job, description, hasInfo: description.length >= MIN_DESCRIPTION };
    }).filter((r) => !foreignOnly(r.job));
    setRows(next);

    const todo = next.filter((r) => r.hasInfo && !cachedMatch(r.job.id));
    let failed = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
      if (!active()) return;
      setProgress(0.2 + 0.8 * (i / Math.max(1, todo.length)));
      setPhase(`Comparing your resume with each job… ${Math.min(i + BATCH, todo.length)} of ${todo.length}`);
      const batch = todo.slice(i, i + BATCH);
      const { ok, data } = await postJson('/api/career/match', {
        resumeText,
        earlyCareer: isEarlyCareer(profile),
        yearsExperience: profile.yearsExperience,
        jobs: batch.map((r) => ({ id: r.job.id, title: r.job.title, company: r.job.company, location: r.job.location || '', experience: r.job.experience || '', description: matchingDescription(r.description) })),
      });
      if (!ok) {
        failed += batch.length;
        if (data.code === 'RATE_LIMITED' || data.code === 'AI_UNAVAILABLE' || !data.code) break;
        continue;
      }
      update((s) => (active() && s.resumeHash === resumeHash && s.profile?.yearsExperience === profile.yearsExperience ? { matches: { ...s.matches, ...data.matches } } : {}));
    }
    if (!active()) return;
    setProgress(1);
    setPhase('');
    if (failed) setError('Some descriptions could not be assessed. Find those roles under More roles to review, or try Refresh.');
  }, [profile, resumeText, resumeHash, store.matches, update, mode, scope, filters.posted]);

  useEffect(() => {
    if (!sessionState.get(scope + ':rows', null, false) && !sessionState.get(scope + ':phase', '', false)) run();
  }, [matchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => {
    if (!rows) return [];
    return rows
      .map((r) => {
        const match = cachedMatch(r.job.id);
        return { ...r, match, eligibility: experienceEligibility(r.job, profile),
          confidence: assessmentConfidence(r.description, match), availability: availabilityInfo(r.job) };
      })
      .filter((r) => {
        if (filters.remote && r.job.work !== 'remote') return false;
        if (filters.posted) { const d = daysAgo(r.job); if (d === null || d > filters.posted) return false; }
        if (filters.min && (!r.match || r.match.score < filters.min)) return false;
        return true;
      })
      .sort((a, b) => Number(isRecommendedRow(b)) - Number(isRecommendedRow(a)) ||
        Number(b.availability.recent) - Number(a.availability.recent) ||
        (b.match?.score ?? -1) - (a.match?.score ?? -1) || b.score - a.score);
  }, [rows, store.matches, filters, profile]);

  const recommended = ranked.filter(isRecommendedRow);
  const review = ranked.filter((r) => !isRecommendedRow(r));
  const assessed = rows?.filter((r) => cachedMatch(r.job.id)).length || 0;
  const activeFilterCount = Number(Boolean(filters.min)) + Number(Boolean(filters.posted !== 7)) + Number(filters.remote);
  const formatCount = (value) => value.toLocaleString('en-IN');

  return (
    <section aria-label="Your job matches">
      <div className="ch-matches-head">
        <div className="ch-seg" role="tablist" aria-label="Which roles">
          <button type="button" role="tab" aria-selected={mode === 'best'} className={mode === 'best' ? 'is-on' : ''} onClick={() => setMode('best')}>
            Your shortlist
          </button>
          <button type="button" role="tab" aria-selected={mode === 'entry'} className={mode === 'entry' ? 'is-on' : ''} onClick={() => setMode('entry')}>
            Internships &amp; fresher{entryTotal ? <span className="ch-seg-n">{entryTotal}</span> : null}
          </button>
        </div>
      </div>
      {rows && !phase && (
        <dl className="ch-summary" aria-label="Shortlist overview">
          <div><dt>Roles available</dt><dd>{formatCount(availableTotal)}</dd></div>
          <div><dt>In your shortlist</dt><dd>{formatCount(rows.length)}</dd></div>
          <div><dt>Assessed for fit</dt><dd>{formatCount(assessed)}</dd></div>
        </dl>
      )}

      {!phase && <div className="ch-results-toolbar">
        <div className="ch-shortlist-intro" aria-live="polite">
          <p className="ch-results-eyebrow">Selected for your profile</p>
          <h2>{phase ? 'Building your shortlist' : recommended.length === 0 ? 'No clear matches yet' : `${recommended.length} ${recommended.length === 1 ? 'role' : 'roles'} worth reviewing`}</h2>
          <p>Based on your skills, experience requirements and source activity in the last 7 days.</p>
        </div>
        <details className={`ch-filter-more${activeFilterCount ? ' is-active' : ''}`}>
        <summary><span aria-hidden="true">☷</span> Filters{activeFilterCount > 0 && <span className="ch-filter-count">{activeFilterCount}</span>}</summary>
      <div className="ch-filters">
        <select aria-label="Minimum fit" value={filters.min} onChange={(e) => setFilters((f) => ({ ...f, min: Number(e.target.value) }))}>
          <option value={0}>Any fit</option>
          <option value={40}>Stretch and up</option>
          <option value={65}>Good and up</option>
          <option value={85}>Strong only</option>
        </select>
        <select aria-label="Posted" value={filters.posted} onChange={(e) => setFilters((f) => ({ ...f, posted: Number(e.target.value) }))}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={0}>Posted any time</option>
        </select>
        <label className="ch-toggle">
          <input type="checkbox" checked={filters.remote} onChange={(e) => setFilters((f) => ({ ...f, remote: e.target.checked }))} />
          <span>Remote only</span>
        </label>
        {activeFilterCount > 0 && <button type="button" className="ch-text-btn" onClick={() => setFilters({ min: 0, remote: false, posted: 7 })}>Clear filters</button>}
        <button type="button" className="ch-text-btn" onClick={run} disabled={Boolean(phase)}>↻ Refresh</button>
      </div>
      </details>
      </div>}

      {phase && <ShortlistBuilding phase={phase} progress={progress} />}
      {error && <p className="ch-note">{error}</p>}
      {mode === 'entry' && rows && !phase && rows.length < 10 && (
        <p className="ch-note">
          Only {rows.length} fresher-open roles fit your profile right now. Try adding broader roles on your resume card,
          or check Your shortlist for junior roles without a fresher label.
        </p>
      )}
      {rows && !phase && ranked.length === 0 && <p className="ch-empty">Nothing matches these filters. Loosen them a little.</p>}
      {rows && !phase && recommended.length === 0 && ranked.length > 0 && (
        <p className="ch-empty">No roles clear every shortlist check yet. Review the roles below to confirm experience, requirements or availability.</p>
      )}
      {!phase && <div className="ch-list">
        {recommended.map((r, i) => <MatchCard key={r.job.id} row={r} rank={i + 1} onPick={onPick} app={store.applications?.[r.job.id]} />)}
      </div>}
      {!phase && review.length > 0 && (
        <details className="ch-more-roles">
          <summary><span className="ch-more-label">More roles to review <span className="ch-more-description">Explore roles that need a closer look</span></span><span className="ch-more-count">{formatCount(review.length)}</span><span className="ch-more-chevron" aria-hidden="true">⌄</span></summary>
          <p className="ch-muted ch-small">These need a closer look at experience, requirements, availability or skill gaps.</p>
          <div className="ch-list">
            {review.map((r) => <MatchCard key={r.job.id} row={r} onPick={onPick} app={store.applications?.[r.job.id]} />)}
          </div>
        </details>
      )}
    </section>
  );
}

function MatchCard({ row, rank, onPick, app }) {
  const { job, match, hasInfo, reasons, eligibility, confidence, availability } = row;
  const meta = [...new Set([job.company, job.location?.split(',')[0], job.work === 'remote' ? 'Remote' : '', job.experience, postedLabel(job)].filter(Boolean))];
  const canTailor = hasInfo && confidence === 'sufficient' && eligibility.status !== 'outside';
  return (
    <article className={`ch-match${rank === 1 ? ' is-top' : ''}`}>
      <div className="ch-match-body">
        <div className="ch-role-heading">
          <span className="ch-company-mark" aria-hidden="true">{(job.company || job.title).slice(0, 1).toUpperCase()}</span>
          <div className="ch-role-heading-copy">
            <div className="ch-match-title">
              <h3>{job.title}</h3>
            </div>
            <p className="ch-meta">{meta.join(' · ')}</p>
          </div>
          <div className="ch-role-badges">
            {match && confidence === 'sufficient' && !['check', 'outside'].includes(eligibility.status) && <FitLabel match={match} />}
            {isEntryJob(job) && <span className="ch-tag">Fresher-open</span>}
            {app && <span className="ch-tag is-app">{BOARD.find((b) => b.id === boardStatus(app.status))?.label || 'Saved'}</span>}
          </div>
        </div>
        <div className="ch-role-facts">
          <span>{typeof job.salary === 'string' && job.salary ? job.salary : 'Salary not disclosed'}</span>
          <span className={availability.recent ? 'ch-source-recent' : ''}>{availability.label}</span>
        </div>
        <div className="ch-checks">
          <span className={eligibility.status === 'met' ? 'is-clear' : ''}>{eligibility.label}</span>
          <span>{confidence === 'limited' ? 'Limited requirements' : 'Requirements available'}</span>
        </div>
        {eligibility.reason && <p className="ch-blocker ch-experience-note">{eligibility.reason}</p>}
        {match ? (
          <>
            {match.why && confidence === 'sufficient' && <div className="ch-match-insight"><p className="ch-insight-label">Why this role</p><p className="ch-why">{match.why}</p></div>}
            {confidence === 'limited' && <p className="ch-why ch-muted">The description does not provide enough requirements for a reliable fit assessment. Read the full role first.</p>}
            {match.gaps.length > 0 && <p className="ch-blocker ch-resume-gap"><strong>Resume gap</strong>{match.gaps[0]}</p>}
            {(match.met.length > 0 || match.gaps.length > 0) && (
              <details className="ch-proof">
                <summary>
                  <span className="ch-proof-ok">{match.met.length} supported</span>
                  {match.gaps.length > 0 && <span className="ch-proof-gap">{match.gaps.length} not shown</span>}
                  <span className="ch-proof-cta">View evidence</span>
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
            {hasInfo ? 'Assessment pending. Review the role requirements before applying.' : 'Needs the full job description before we can assess fit or tailor your resume.'}
            {reasons?.length ? ` Title signals: ${reasons.slice(0, 2).join(', ')}.` : ''}
          </p>
        )}
      </div>
      <div className="ch-match-actions">
        <a className="ch-role-link" href={`/jobs/${jobUrlId(job)}`} target="_blank" rel="noreferrer">View full role <span aria-hidden="true">↗</span><span className="ch-sr-only"> (opens in a new tab)</span></a>
        {/* {(canTailor || app?.pack) && <button type="button" className="ch-cta ch-cta-sm" onClick={() => onPick(job)}>{app?.pack ? 'Open resume' : 'Tailor resume'}<span aria-hidden="true">→</span></button>} */}
        {app?.pack && <button type="button" className="ch-cta ch-cta-sm" onClick={() => onPick(job)}>Open resume<span aria-hidden="true">→</span></button>}
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
function PackBuilding({ phase, startedAt }) {
  const [tick, setTick] = useState(() => startedAt ? Math.floor((Date.now() - startedAt) / PACK_STAGE_MS) : 0);
  const writing = phase === 'writing';

  useEffect(() => {
    if (!writing) return undefined;
    const start = startedAt || Date.now();
    const update = () => setTick(Math.max(0, Math.floor((Date.now() - start) / PACK_STAGE_MS)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [writing, startedAt]);

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
  const scope = `career:pack:${job?.id || 'loading'}:${store.resumeHash}`;
  const [busy, setBusy] = useSessionState(scope + ':busy', false, { persist: false });
  const [packPhase, setPackPhase] = useSessionState(scope + ':phase', 'writing', { persist: false });
  const [writingStartedAt, setWritingStartedAt] = useSessionState(scope + ':writing-started', 0, { persist: false });
  const [fitAcceptedFor, setFitAcceptedFor] = useSessionState(scope + ':accepted', '');
  const fullText = useRef({ id: '', text: '' });
  const [pastedDescription, setPastedDescription] = useSessionState(scope + ':description', '');
  const [needsPaste, setNeedsPaste] = useSessionState(scope + ':needs-description', false);
  const [error, setError] = useSessionState(scope + ':error', null, { persist: false });
  const [copied, setCopied] = useState('');
  const [editing, setEditing] = useSessionState(scope + ':editing', false);
  const [tab, setTab] = useSessionState(scope + ':tab', 'resume');
  const [preview, setPreview] = useSessionState(scope + ':preview', 'changes');
  const autoStarted = useRef('');

  useEffect(() => {
    const request = `${job?.id}:${store.resumeHash}`;
    if (!job || autoBuild !== job.id || autoStarted.current === request) return;
    autoStarted.current = request;
    onAutoBuilt();
    if (sessionState.get(scope + ':auto-started', false, false)) return;
    sessionState.set(scope + ':auto-started', true, false, false);
    if (sessionState.get(scope + ':busy', false, false)) return;
    const saved = store.applications?.[job.id]?.pack;
    if (!saved?.resume || saved.resumeHash !== store.resumeHash) {
      setFitAcceptedFor(job.id);
      generate(false, true);
    }
  }, [job?.id, autoBuild, store.resumeHash]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (s.resumeHash !== store.resumeHash) return {};
      const cur = s.applications[job.id] || stamp({ job: pickJob(job) }, 'saved');
      return { applications: { ...s.applications, [job.id]: { ...cur, pack: { ...(cur.pack || {}), ...patch } } } };
    });
  }

  function setStatus(status) {
    update((s) => s.resumeHash === store.resumeHash
      ? { applications: { ...s.applications, [job.id]: stamp(s.applications[job.id] || { job: pickJob(job) }, status) } }
      : {});
  }

  async function generate(allowFallback = false, fitAccepted = fitAcceptedFor === job.id) {
    if (sessionState.get(scope + ':busy', false, false)) return;
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
        yearsExperience: store.profile.yearsExperience,
        jobs: [{ id: job.id, title: job.title, company: job.company, location: job.location || '', experience: job.experience || '', description: matchingDescription(jobDescription) }],
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
    setWritingStartedAt(Date.now());
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
      resumeHash: store.resumeHash,
      changes: t.changes || [],
      placeholders: t.placeholders || [],
      warnings: t.warnings || [],
      coverLetter: t.coverLetter || '',
      answers: t.screeningAnswers || [],
      mode: data.mode,
      done: {},
      createdAt: new Date().toISOString(),
    });
    setPreview('changes');
    setEditing(false);
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

  if (busy) return <section className="ch-pack">{head}<PackBuilding phase={packPhase} startedAt={writingStartedAt} /></section>;

  if (!pack) {
    return (
      <section className="ch-pack">
        {head}
        {busy ? <PackBuilding phase={packPhase} startedAt={writingStartedAt} /> : match && match.score < FIT_WARN_BELOW && fitAcceptedFor !== job.id ? (
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
            <p className="ch-small ch-muted">Usually around a minute. Your saved original is ready to reuse for other jobs.</p>
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
  const sameSource = pack.resumeHash === store.resumeHash;
  const showingOriginal = preview === 'original';

  return (
    <section className="ch-pack">
      {head}
      <p className="ch-small ch-muted">Your original stays saved on this device. Each job gets its own draft.</p>
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
              <div className="ch-preview-modes" role="group" aria-label="Resume preview">
                {[['changes', 'Highlight changes'], ['clean', 'Clean draft'], ['original', 'Saved original']].map(([key, label]) => (
                  <button key={key} type="button" className="ch-ghost" aria-pressed={preview === key} onClick={() => { setPreview(key); setEditing(false); }} disabled={key === 'changes' && !sameSource}>{label}</button>
                ))}
              </div>
              <p className="ch-small ch-muted">{showingOriginal ? 'Your saved original. Editing a job draft never changes this resume.' : preview === 'changes' && sameSource ? 'Highlighted wording is added or rewritten. Copy and PDF always use the clean draft.' : !sameSource ? 'This draft used an older saved resume. Rewrite to use your current original.' : 'Clean draft, ready to copy or download.'}</p>
              <div className="ch-sheet-tools">
                <button type="button" className="ch-text-btn" onClick={() => { setPreview('clean'); setEditing((v) => !v); }}>{editing ? 'Done editing' : '✎ Edit draft'}</button>
                <button type="button" className="ch-text-btn" onClick={() => copy('resume', pack.resume)}>{copied === 'resume' ? 'Copied ✓' : 'Copy'}</button>
                <button type="button" className="ch-text-btn" onClick={() => generate(false, true)} disabled={busy}>{busy ? 'Rewriting…' : '↻ Rewrite again'}</button>
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
                  <article className="ch-sheet rz" onDoubleClick={() => { if (!showingOriginal) setEditing(true); }} dangerouslySetInnerHTML={{ __html: resumeHtml(showingOriginal ? store.resumeText : pack.resume, { original: !showingOriginal && preview === 'changes' && sameSource ? store.resumeText : undefined }) }} />
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
  const [filter, setFilter] = useSessionState('career:tracker:filter', 'all');
  const [removed, setRemoved] = useSessionState('career:tracker:undo', null);
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
