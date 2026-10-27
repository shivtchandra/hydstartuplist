'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeResumeATS } from '../../lib/resume/ats-engine.js';

const ROLE_SIGNAL_RE = /\b(responsibilit(?:y|ies)|requirements?|qualifications?|you will|what you(?:'|’)ll do|skills required|minimum qualifications?|preferred qualifications?|must have|nice to have|in this role)\b/i;
const ROLE_ACTION_RE = /\b(build|design|develop|manage|lead|collaborate|analyze|own|deliver|maintain|implement|create|support|drive)\b/gi;
const PLACEHOLDER_RE = /\[\s*(?:add|confirm|verify|replace|include)[^\]]+\]/gi;
const GENERATING_STEPS = ['Reading the role requirements', 'Rewriting verified experience', 'Checking every claim'];

function looksLikeRoleDescription(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  const actionCount = new Set((clean.match(ROLE_ACTION_RE) || []).map((item) => item.toLowerCase())).size;
  return clean.length >= 160 && (ROLE_SIGNAL_RE.test(clean) || (clean.length >= 300 && actionCount >= 2));
}

function loadScript(id, src, ready) {
  if (ready()) return Promise.resolve();
  const existing = document.getElementById(id);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Document reader failed to load.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Document reader failed to load.'));
    document.head.appendChild(script);
  });
}

async function extractPdfText(file) {
  await loadScript(
    'mapmyhyd-pdfjs',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    () => Boolean(window.pdfjsLib),
  );
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n\n');
}

async function extractDocxText(file) {
  await loadScript(
    'mapmyhyd-mammoth',
    'https://unpkg.com/mammoth@1.9.1/mammoth.browser.min.js',
    () => Boolean(window.mammoth),
  );
  const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdown(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const html = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) html.push('</ul>');
    listOpen = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(3, heading[1].length);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (bullet) {
      if (!listOpen) html.push('<ul>');
      listOpen = true;
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
    } else if (!trimmed) {
      closeList();
    } else {
      closeList();
      html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
    }
  }
  closeList();
  return html.join('');
}

function extractPlaceholders(text) {
  return Array.from(new Set(String(text || '').match(PLACEHOLDER_RE) || []));
}

function downloadMarkdown(text, filename) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openPrintView(markdown, filename) {
  const printWindow = window.open('', '_blank', 'width=880,height=1000');
  if (!printWindow) return false;
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(filename.replace(/\.pdf$/i, ''))}</title><style>
    @page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#172033;font-size:10.5pt;line-height:1.42;max-width:760px;margin:0 auto}h1{font-size:23pt;margin:0 0 5px}h2{font-size:12.5pt;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #cbd2dc;padding-bottom:4px;margin:18px 0 7px}h3{font-size:11pt;margin:12px 0 4px}p{margin:3px 0}ul{margin:4px 0 8px;padding-left:19px}li{margin:2px 0}strong{font-weight:700}
  </style></head><body>${markdownToHtml(markdown)}<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);
  printWindow.document.close();
  return true;
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="rt-icon">
      <path d="M7 3.5h6.8L18.5 8v12.5H7z" />
      <path d="M13.5 3.5V8h5M9.5 12h6M9.5 15h6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="rt-icon">
      <path d="M12 2.8c.6 4.7 2.5 6.6 7.2 7.2-4.7.6-6.6 2.5-7.2 7.2-.6-4.7-2.5-6.6-7.2-7.2 4.7-.6 6.6-2.5 7.2-7.2Z" />
      <path d="M18.2 15.8c.2 1.8 1 2.6 2.8 2.8-1.8.2-2.6 1-2.8 2.8-.2-1.8-1-2.6-2.8-2.8 1.8-.2 2.6-1 2.8-2.8Z" />
    </svg>
  );
}

function ScoreRing({ score, label }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="rt-score-ring" style={{ '--rt-score': `${safeScore * 3.6}deg` }}>
      <div>
        <strong>{safeScore}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function ResumeTailorWorkspace({ job = null, sampleJobs = [], isModal = false, onClose }) {
  const initialDescription = job?.description || '';
  const [resumeText, setResumeText] = useState('');
  const [jobTitle, setJobTitle] = useState(job?.title || '');
  const [company, setCompany] = useState(job?.company || '');
  const [jobDescription, setJobDescription] = useState(initialDescription);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('');
  const [editableResume, setEditableResume] = useState('');
  const [activeTab, setActiveTab] = useState('resume');
  const [viewMode, setViewMode] = useState('preview');
  const [isReading, setIsReading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingExport, setPendingExport] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const workspaceRef = useRef(null);
  const closeRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('mapmyhyd_master_resume_text') || '';
    if (saved) setResumeText(saved);
  }, []);

  useEffect(() => {
    if (!job) return;
    setJobTitle(job.title || '');
    setCompany(job.company || '');
    setJobDescription(job.description || '');
  }, [job]);

  useEffect(() => {
    if (!isGenerating) return undefined;
    const timer = window.setInterval(() => {
      setGeneratingStep((current) => Math.min(current + 1, GENERATING_STEPS.length - 1));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    if (!isModal) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => closeRef.current?.focus());

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !workspaceRef.current) return;
      const focusable = Array.from(
        workspaceRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]'),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isModal, onClose]);

  const jobSkills = job?.skills || [];
  const jobDescriptionIsUseful = looksLikeRoleDescription(jobDescription);
  const audit = useMemo(() => {
    if (!resumeText.trim() || !jobTitle.trim() || !jobDescription.trim()) return null;
    return analyzeResumeATS({ resumeText, jobDescription, jobTitle, jobSkills });
  }, [resumeText, jobDescription, jobTitle, jobSkills]);
  const unresolvedPlaceholders = useMemo(() => extractPlaceholders(editableResume), [editableResume]);

  function saveResumeText(value) {
    setResumeText(value);
    window.localStorage.setItem('mapmyhyd_master_resume_text', value);
  }

  async function readFile(file) {
    if (!file) return;
    setError('');
    setNotice('');
    setIsReading(true);
    try {
      const lowerName = file.name.toLowerCase();
      let text;
      if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        text = await extractPdfText(file);
      } else if (lowerName.endsWith('.docx')) {
        text = await extractDocxText(file);
      } else {
        text = await file.text();
      }
      if (text.trim().length < 80) throw new Error('We could not find enough readable resume text. Try pasting it instead.');
      saveResumeText(text.trim());
      setSelectedFileName(file.name);
      setNotice(`Loaded ${file.name}`);
    } catch (fileError) {
      setError(fileError.message || 'We could not read that document. Try pasting the resume text.');
    } finally {
      setIsReading(false);
    }
  }

  function selectSampleJob(event) {
    const index = Number(event.target.value);
    if (!Number.isInteger(index) || !sampleJobs[index]) return;
    const selected = sampleJobs[index];
    setJobTitle(selected.title || '');
    setCompany(selected.company || '');
    setJobDescription(selected.description || '');
  }

  async function generateResume() {
    setError('');
    setNotice('');
    if (resumeText.trim().length < 80) {
      setError('Upload or paste a complete resume first.');
      return;
    }
    if (!jobTitle.trim()) {
      setError('Add the target job title.');
      return;
    }
    if (!jobDescriptionIsUseful) {
      setError('Add the role responsibilities and requirements. The current text looks incomplete or company-only.');
      return;
    }

    setIsGenerating(true);
    setGeneratingStep(0);
    try {
      const response = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription, jobTitle, company, jobSkills }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We could not tailor this resume.');
      setResult({ baseline: data.baseline, ...data.tailored });
      setMode(data.mode || 'safe-fallback');
      setEditableResume(data.tailored.fullTailoredResume || resumeText);
      setActiveTab('resume');
      setViewMode('preview');
    } catch (requestError) {
      setError(requestError.message || 'We could not tailor this resume. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function performExport(kind) {
    setPendingExport('');
    setError('');
    const safeCompany = (company || 'tailored').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      if (kind === 'copy') {
        await navigator.clipboard.writeText(editableResume);
        setNotice('Resume copied to clipboard.');
      } else if (kind === 'markdown') {
        downloadMarkdown(editableResume, `${safeCompany || 'tailored'}-resume.md`);
        setNotice('Markdown download started.');
      } else if (!openPrintView(editableResume, `${safeCompany || 'tailored'}-resume.pdf`)) {
        setError('Your browser blocked the print window. Allow pop-ups and try again.');
      }
    } catch {
      setError('That export did not complete. Please try again.');
    }
  }

  function requestExport(kind) {
    if (unresolvedPlaceholders.length) {
      setPendingExport(kind);
    } else {
      performExport(kind);
    }
  }

  function resetToInputs() {
    setResult(null);
    setMode('');
    setActiveTab('resume');
    setError('');
    setNotice('');
  }

  const workspace = (
    <section className={`rt-workspace ${isModal ? 'rt-workspace-modal' : 'rt-workspace-page'}`} ref={workspaceRef}>
      <header className="rt-header">
        <div className="rt-heading-copy">
          <span className="rt-eyebrow"><SparkIcon /> Factual resume tailor</span>
          <h2 id={isModal ? 'resume-tailor-title' : undefined}>{result ? 'Your tailored resume' : 'Make this resume fit the role'}</h2>
          <p>
            {result
              ? `${jobTitle}${company ? ` at ${company}` : ''} · every claim checked against your original resume`
              : 'Sharper positioning, honest edits, and clear prompts wherever your resume needs real evidence.'}
          </p>
        </div>
        <div className="rt-header-actions">
          {result && <button type="button" className="rt-text-button" onClick={resetToInputs}>Edit inputs</button>}
          {isModal && (
            <button ref={closeRef} type="button" className="rt-close" onClick={onClose} aria-label="Close resume tailor">×</button>
          )}
        </div>
      </header>

      <div className="rt-status-region" aria-live="polite">
        {error && <div className="rt-alert rt-alert-error">{error}</div>}
        {notice && <div className="rt-alert rt-alert-success">{notice}</div>}
        {result?.warnings?.map((warning, index) => (
          <div className="rt-alert rt-alert-warning" key={`${warning}-${index}`}>{warning}</div>
        ))}
      </div>

      {!result && !isGenerating && (
        <div className="rt-input-layout">
          <section className="rt-input-main" aria-labelledby="rt-resume-label">
            <div className="rt-section-heading">
              <div>
                <span className="rt-step">01</span>
                <h3 id="rt-resume-label">Your resume</h3>
              </div>
              {selectedFileName && <span className="rt-file-name">{selectedFileName}</span>}
            </div>
            <button
              type="button"
              className="rt-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                readFile(event.dataTransfer.files?.[0]);
              }}
            >
              <FileIcon />
              <span><strong>{isReading ? 'Reading your resume…' : 'Drop a resume or choose a file'}</strong>PDF, DOCX, TXT, or Markdown</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.text,.md"
              hidden
              onChange={(event) => readFile(event.target.files?.[0])}
            />
            <div className="rt-divider"><span>or paste text</span></div>
            <textarea
              className="rt-textarea rt-resume-input"
              value={resumeText}
              onChange={(event) => saveResumeText(event.target.value)}
              placeholder="Paste your complete resume here…"
              aria-label="Resume text"
            />
            <p className="rt-privacy">Saved only in this browser. Sent to the server only when you choose Tailor resume.</p>
          </section>

          <aside className="rt-role-panel" aria-labelledby="rt-role-label">
            <div className="rt-section-heading">
              <div>
                <span className="rt-step">02</span>
                <h3 id="rt-role-label">Target role</h3>
              </div>
            </div>
            {sampleJobs.length > 0 && (
              <label className="rt-field">
                <span>Use a live role</span>
                <select defaultValue="" onChange={selectSampleJob}>
                  <option value="" disabled>Select a recent listing</option>
                  {sampleJobs.map((sample, index) => (
                    <option value={index} key={`${sample.company}-${sample.title}-${index}`}>{sample.title} · {sample.company}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="rt-field-row">
              <label className="rt-field">
                <span>Job title</span>
                <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="ML Data Specialist" />
              </label>
              <label className="rt-field">
                <span>Company</span>
                <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company" />
              </label>
            </div>
            <label className="rt-field">
              <span>Job description</span>
              <textarea
                className={`rt-textarea rt-job-input ${jobDescription && !jobDescriptionIsUseful ? 'is-invalid' : ''}`}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste responsibilities, requirements, and preferred qualifications…"
              />
            </label>
            {jobDescription && !jobDescriptionIsUseful && (
              <p className="rt-field-warning">This needs role responsibilities or requirements before tailoring.</p>
            )}

            <div className="rt-run-panel">
              {audit && (
                <div className="rt-baseline">
                  <span>Current estimated match</span>
                  <strong>{audit.overallScore}<small>/100</small></strong>
                </div>
              )}
              <button type="button" className="rt-primary" onClick={generateResume} disabled={isReading}>
                <SparkIcon /> Tailor resume
              </button>
              <p>No invented metrics or skills. Missing evidence stays clearly marked.</p>
            </div>
          </aside>
        </div>
      )}

      {isGenerating && (
        <div className="rt-generating" role="status">
          <div className="rt-generating-mark"><SparkIcon /></div>
          <p>{GENERATING_STEPS[generatingStep]}</p>
          <span>Usually ready in under 8 seconds</span>
          <div className="rt-progress"><i style={{ width: `${(generatingStep + 1) * 33.333}%` }} /></div>
          <div className="rt-skeleton-lines" aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
      )}

      {result && !isGenerating && (
        <div className="rt-result-layout">
          <div className="rt-result-main">
            <nav className="rt-tabs" aria-label="Tailored resume views">
              {[
                ['resume', 'Resume'],
                ['changes', `Changes${result.changes?.length ? ` (${result.changes.length})` : ''}`],
                ['match', 'Match details'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={activeTab === value ? 'is-active' : ''}
                  onClick={() => setActiveTab(value)}
                  aria-current={activeTab === value ? 'page' : undefined}
                >{label}</button>
              ))}
            </nav>

            {activeTab === 'resume' && (
              <article className="rt-resume-panel">
                <div className="rt-resume-toolbar">
                  <div className="rt-view-toggle" aria-label="Resume view">
                    <button type="button" className={viewMode === 'preview' ? 'is-active' : ''} onClick={() => setViewMode('preview')}>Preview</button>
                    <button type="button" className={viewMode === 'edit' ? 'is-active' : ''} onClick={() => setViewMode('edit')}>Edit</button>
                  </div>
                  <span>{editableResume.length.toLocaleString()} characters</span>
                </div>
                {viewMode === 'preview' ? (
                  <div className="rt-resume-paper" dangerouslySetInnerHTML={{ __html: markdownToHtml(editableResume) }} />
                ) : (
                  <textarea className="rt-resume-editor" value={editableResume} onChange={(event) => setEditableResume(event.target.value)} aria-label="Edit tailored resume" />
                )}
              </article>
            )}

            {activeTab === 'changes' && (
              <section className="rt-changes" aria-label="Resume changes">
                {result.changes?.length ? result.changes.map((change, index) => (
                  <article className="rt-change" key={`${change.section}-${index}`}>
                    <header><span>{change.section}</span><p>{change.reason}</p></header>
                    <div><del>{change.before}</del><ins>{change.after}</ins></div>
                  </article>
                )) : <div className="rt-empty">No wording was changed. The safe fallback preserved your original content.</div>}
              </section>
            )}

            {activeTab === 'match' && (
              <section className="rt-match-details">
                <div className="rt-score-comparison">
                  <ScoreRing score={result.baseline?.overallScore} label="before" />
                  <span aria-hidden="true">→</span>
                  <ScoreRing score={result.achievedAtsScore} label="tailored" />
                </div>
                <div className="rt-breakdown">
                  {Object.entries(result.tailoredBreakdown || {}).map(([key, value]) => (
                    <div key={key}><span>{key.replace(/([A-Z])/g, ' $1')}</span><strong>{value}%</strong><i><b style={{ width: `${value}%` }} /></i></div>
                  ))}
                </div>
                {result.remainingMissingSkills?.length > 0 && (
                  <div className="rt-gap-list"><h3>Skills still missing from your evidence</h3><p>{result.remainingMissingSkills.join(' · ')}</p></div>
                )}
              </section>
            )}
          </div>

          <aside className="rt-export-panel">
            <div className="rt-result-score">
              <span>Estimated match</span>
              <strong>{result.achievedAtsScore}<small>/100</small></strong>
              <p>{result.achievedAtsScore > (result.baseline?.overallScore || 0) ? `Up ${result.achievedAtsScore - (result.baseline?.overallScore || 0)} points` : result.achievedAtsScore === (result.baseline?.overallScore || 0) ? 'Same score, stronger ordering' : 'Evidence-first result'}</p>
            </div>
            <div className="rt-export-actions">
              <button type="button" className="rt-primary" onClick={() => requestExport('pdf')}>Print / save PDF</button>
              <button type="button" onClick={() => requestExport('copy')}>Copy resume</button>
              <button type="button" onClick={() => requestExport('markdown')}>Download Markdown</button>
            </div>
            {unresolvedPlaceholders.length > 0 ? (
              <div className="rt-placeholder-list">
                <span>{unresolvedPlaceholders.length} detail{unresolvedPlaceholders.length === 1 ? '' : 's'} to verify</span>
                {unresolvedPlaceholders.map((placeholder) => <p key={placeholder}>{placeholder}</p>)}
              </div>
            ) : (
              <div className="rt-ready"><span>Ready to export</span><p>No unresolved placeholders remain.</p></div>
            )}
            <p className="rt-mode">Generated with {mode === 'openai' ? 'OpenAI and factual validation' : 'the verified-content fallback'}.</p>
          </aside>
        </div>
      )}

      {pendingExport && (
        <div className="rt-confirm-backdrop" role="presentation">
          <section className="rt-confirm" role="alertdialog" aria-modal="true" aria-labelledby="rt-confirm-title">
            <span className="rt-confirm-mark">!</span>
            <h3 id="rt-confirm-title">Finish the marked details?</h3>
            <p>Your resume still contains {unresolvedPlaceholders.length} guided placeholder{unresolvedPlaceholders.length === 1 ? '' : 's'}. Exporting now will include them.</p>
            <div>
              <button type="button" onClick={() => setPendingExport('')}>Keep editing</button>
              <button type="button" className="rt-primary" onClick={() => performExport(pendingExport)}>Export anyway</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );

  if (!isModal) return workspace;
  return (
    <div className="rt-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-labelledby="resume-tailor-title" className="rt-modal-shell">{workspace}</div>
    </div>
  );
}
