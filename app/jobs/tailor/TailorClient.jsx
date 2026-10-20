'use client';

import { useState, useRef, useEffect } from 'react';
import { analyzeResumeATS } from '../../../lib/resume/ats-engine.js';

async function loadPdfJs() {
  if (typeof window === 'undefined') return null;
  if (window.pdfjsLib) return window.pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF parser script'));
    document.head.appendChild(script);
  });
}

async function extractPdfText(file) {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) throw new Error('PDF parser not available');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str || '');
    fullText += strings.join(' ') + '\n\n';
  }

  return fullText.trim();
}

function formatMarkdownToHtml(markdown) {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1 class="resume-name" style="font-size:18pt;font-weight:800;margin:0 0 4px;color:#0f172a;">${line.slice(2)}</h1>`;
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2 class="resume-section-title" style="font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#1e293b;border-bottom:1.5px solid #334155;padding-bottom:2px;margin:12px 0 6px;">${line.slice(3)}</h2>`;
    } else if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3 class="resume-section-title" style="font-size:10.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#1e293b;border-bottom:1px solid #64748b;padding-bottom:2px;margin:10px 0 4px;">${line.slice(4)}</h3>`;
    } else if (line.startsWith('#### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h4 class="resume-subheading" style="font-size:10pt;font-weight:700;color:#0f172a;margin:6px 0 2px;">${line.slice(5)}</h4>`;
    } else if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      if (!inList) {
        html += '<ul class="resume-bullets" style="margin:4px 0 8px;padding-left:18px;">';
        inList = true;
      }
      const bulletText = line.replace(/^[-•*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<li style="margin-bottom:3px;line-height:1.4;color:#1e293b;">${bulletText}</li>`;
    } else if (line === '---') {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<hr style="border:0;border-top:1px solid #cbd5e1;margin:8px 0;" />';
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<p class="resume-text" style="margin:3px 0;color:#334155;">${boldText}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function exportToPdf(markdown, filename = 'tailored-resume.pdf') {
  const htmlContent = formatMarkdownToHtml(markdown);
  const printWindow = window.open('', '_blank', 'width=850,height=1000');
  if (!printWindow) {
    alert('Please allow popups to open the ATS PDF print view.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename.replace(/\.pdf$/, '')}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: letter portrait; margin: 0.5in 0.6in; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111827;
            line-height: 1.42;
            font-size: 10pt;
            margin: 0;
            padding: 30px;
            background: #fff;
          }
          .resume-name { font-size: 18pt; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
          .resume-section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b; border-bottom: 1.5px solid #334155; padding-bottom: 2px; margin: 14px 0 6px; }
          .resume-subheading { font-size: 10.5pt; font-weight: 700; color: #0f172a; margin: 8px 0 2px; }
          .resume-bullets { margin: 4px 0 8px; padding-left: 18px; }
          .resume-bullets li { margin-bottom: 3.5px; line-height: 1.4; color: #1e293b; }
          .resume-text { margin: 3px 0; color: #334155; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export default function TailorClient({ sampleJobs = [] }) {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('tailored');
  const [editableResume, setEditableResume] = useState('');
  const [resumeViewMode, setResumeViewMode] = useState('preview'); // 'preview' | 'editor'

  const [auditResult, setAuditResult] = useState(null);
  const [tailoredResult, setTailoredResult] = useState(null);

  const fileInputRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let savedResume = localStorage.getItem('mapmyhyd_master_resume_text') || '';
      if (!savedResume) {
        try {
          const profileRaw = localStorage.getItem('mapmyhyd_resume_profile');
          if (profileRaw) {
            const parsed = JSON.parse(profileRaw);
            if (parsed.rawText) {
              savedResume = parsed.rawText;
            } else if (parsed.skills?.length) {
              savedResume = `Software Engineer with ${parsed.experienceYears || 3}+ years of experience.\nCore Skills: ${parsed.skills.join(', ')}.\n\n${parsed.summary || ''}`;
            }
          }
        } catch {}
      }
      if (savedResume) setResumeText(savedResume);

      const savedKey = localStorage.getItem('mapmyhyd_gemini_api_key') || '';
      if (savedKey) setApiKey(savedKey);

      // Pre-select first sample job if available
      if (sampleJobs.length > 0 && !jobDescription) {
        const first = sampleJobs[0];
        setJobTitle(first.title || '');
        setCompany(first.company || '');
        setJobDescription(first.description || first.snippet || '');
      }
    }
  }, [sampleJobs]);

  // Run ATS audit when inputs change
  useEffect(() => {
    if (resumeText && jobDescription) {
      const audit = analyzeResumeATS({
        resumeText,
        jobDescription,
        jobTitle,
      });
      setAuditResult(audit);
    } else {
      setAuditResult(null);
    }
  }, [resumeText, jobDescription, jobTitle]);

  async function handleFile(file) {
    if (!file) return;
    setErrorMsg('');
    setIsProcessingPdf(true);

    try {
      let text = '';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length < 40) {
        throw new Error('Could not extract readable text from PDF. Try pasting text directly.');
      }

      setResumeText(text);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mapmyhyd_master_resume_text', text);
      }
    } catch (err) {
      console.error('File parse error:', err);
      setErrorMsg(err.message || 'Failed to read file.');
    } finally {
      setIsProcessingPdf(false);
    }
  }

  function handleSaveResumeText(val) {
    setResumeText(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapmyhyd_master_resume_text', val);
    }
  }

  function handleSaveApiKey(val) {
    setApiKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapmyhyd_gemini_api_key', val);
    }
  }

  function selectSampleJob(j) {
    setJobTitle(j.title || '');
    setCompany(j.company || '');
    setJobDescription(j.description || j.snippet || '');
    setTailoredResult(null);
  }

  async function handleRunTailoring() {
    if (!resumeText || !jobDescription) {
      setErrorMsg('Please provide both your resume and the job description.');
      return;
    }

    setErrorMsg('');
    setIsTailoring(true);

    try {
      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          jobTitle,
          company,
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate tailored resume');
      }

      if (data.needsApiKey && !data.tailored) {
        setShowSettings(true);
        setErrorMsg('To run AI reframing to 80%+, enter a free Gemini API key in settings, or configure GEMINI_API_KEY on the server.');
      } else {
        setTailoredResult(data.tailored);
        if (data.tailored?.fullTailoredResume) {
          setEditableResume(data.tailored.fullTailoredResume);
        }
        setActiveTab('tailored');
      }
    } catch (err) {
      console.error('Tailor error:', err);
      setErrorMsg(err.message || 'Error tailoring resume.');
    } finally {
      setIsTailoring(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadMarkdown(text, filename = 'tailored-resume.md') {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px 60px' }}>
      {/* Sample Jobs Pills */}
      {sampleJobs.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: '8px' }}>
            Select a Live Hyderabad Role to Test:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sampleJobs.slice(0, 6).map((j, idx) => {
              const isSelected = jobTitle === j.title;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSampleJob(j)}
                  style={{
                    fontSize: '12px',
                    padding: '5px 12px',
                    background: isSelected ? 'var(--accent-primary, #ff5722)' : 'var(--surface-card, #ffffff)',
                    color: isSelected ? '#ffffff' : 'var(--ink)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary, #ff5722)' : 'var(--line, #cbd5e1)'}`,
                    borderRadius: '20px',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {j.title} @ {j.company}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          className="op-btn-ghost"
          onClick={() => setShowSettings(!showSettings)}
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          AI Model / API Key Settings
        </button>
      </div>

      {showSettings && (
        <div style={{ background: 'var(--surface-2, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
            Gemini API Key (stored in your browser):
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => handleSaveApiKey(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--line, #cbd5e1)' }}
            />
            <button
              type="button"
              className="op-btn-secondary"
              onClick={() => setShowSettings(false)}
              style={{ fontSize: '12.5px', padding: '8px 14px' }}
            >
              Done
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--ink-2, #64748b)', margin: '6px 0 0' }}>
            Get a free key from Google AI Studio. Stored privately in localStorage.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="op-modal-alert op-modal-alert-error" style={{ marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Inputs Grid */}
      <div className="op-tailor-grid" style={{ marginBottom: '24px' }}>
        {/* Left: Candidate Resume */}
        <div style={{ background: 'var(--surface-card, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px' }}>
          <div className="op-tailor-field-header" style={{ marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>1. Your Resume / Raw Experience</h3>
            <button
              type="button"
              className="op-btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '12px', padding: '3px 8px' }}
            >
              {isProcessingPdf ? 'Reading...' : 'Upload PDF'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.text,.md"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          <textarea
            value={resumeText}
            onChange={(e) => handleSaveResumeText(e.target.value)}
            placeholder="Paste your resume or work history bundle here..."
            rows={10}
            className="op-tailor-textarea"
          />
        </div>

        {/* Right: Job Description */}
        <div style={{ background: 'var(--surface-card, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px' }}>
          <div className="op-tailor-field-header" style={{ marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>2. Target Job Description</h3>
            <input
              type="text"
              placeholder="Role Title (e.g. Senior Backend Dev)"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line, #cbd5e1)', maxWidth: '180px' }}
            />
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description or requirements here..."
            rows={10}
            className="op-tailor-textarea"
          />
        </div>
      </div>

      {/* Score Banner & Action Bar */}
      {auditResult && (
        <div className="op-tailor-score-banner" style={{ marginBottom: '24px' }}>
          <div className="op-tailor-score-badge">
            <div style={{ textAlign: 'center', minWidth: '70px', borderRight: '1px solid rgba(0,0,0,0.08)', paddingRight: '16px' }}>
              <div className="op-tailor-score-number">
                {tailoredResult ? tailoredResult.achievedAtsScore : auditResult.overallScore}%
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px', color: 'var(--ink-2)' }}>
                {tailoredResult ? 'Optimized' : 'ATS Score'}
              </div>
            </div>

            <div className="op-tailor-score-meta">
              <div className="op-tailor-score-label">
                {tailoredResult
                  ? 'Resume Reframed to Hit Recruiter & ATS Targets'
                  : auditResult.overallScore >= 80
                  ? 'High Compatibility with Job Description'
                  : 'ATS Keyword & Signal Gaps Detected'}
              </div>
              <div className="op-tailor-score-sub">
                Keyword Overlap: {auditResult.breakdown.keywordMatch}% · Skills: {auditResult.breakdown.skillsCoverage}% · Title Match: {auditResult.breakdown.titleAlignment}% · Impact Metrics: {auditResult.breakdown.impactMetrics}%
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="op-tailor-btn-primary"
              onClick={handleRunTailoring}
              disabled={isTailoring}
              style={{ fontSize: '13.5px', padding: '10px 22px' }}
            >
              {isTailoring ? 'Reframing with AI...' : tailoredResult ? 'Re-optimize' : 'Tailor to 80%+ Match'}
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {auditResult && (
        <div style={{ background: 'var(--surface-card, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '24px' }}>
          {tailoredResult && (
            <div className="op-modal-tabs" role="tablist" style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={`op-modal-tab ${activeTab === 'tailored' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('tailored')}
              >
                80%+ Tailored Output
              </button>
              <button
                type="button"
                className={`op-modal-tab ${activeTab === 'audit' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                ATS Gap Breakdown
              </button>
            </div>
          )}

          {activeTab === 'tailored' && tailoredResult ? (
            <div>
              {/* Tailored Summary */}
              {tailoredResult.tailoredSummary && (
                <div style={{ background: 'var(--surface-2, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: '6px' }}>
                    Targeted Professional Summary
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.55', color: 'var(--ink)' }}>
                    {tailoredResult.tailoredSummary}
                  </div>
                </div>
              )}

              {/* Action Bullets */}
              {tailoredResult.tailoredBullets?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>
                    Reframed Google X-Y-Z Action Bullets:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tailoredResult.tailoredBullets.map((b, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#fff',
                          border: '1px solid var(--line, #e2e8f0)',
                          borderRadius: '8px',
                          padding: '14px',
                          fontSize: '13.5px',
                          lineHeight: '1.5',
                        }}
                      >
                        <div style={{ fontWeight: '500', color: 'var(--ink)', marginBottom: '6px' }}>
                          • {b.rewrittenBullet}
                        </div>
                        {b.skillsIntegrated?.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: 'var(--ink-2)', marginRight: '4px' }}>Target Skills Embedded:</span>
                            {b.skillsIntegrated.map((s) => (
                              <span
                                key={s}
                                style={{
                                  fontSize: '11px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full ATS Resume with Document Preview & Live Edit */}
              {(editableResume || tailoredResult.fullTailoredResume) && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: '700' }}>Full ATS Resume</span>
                      <div style={{ display: 'inline-flex', background: 'var(--surface-2, #f1f5f9)', borderRadius: '6px', padding: '2px', border: '1px solid var(--line, #cbd5e1)' }}>
                        <button
                          type="button"
                          onClick={() => setResumeViewMode('preview')}
                          style={{
                            fontSize: '11.5px',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            background: resumeViewMode === 'preview' ? '#fff' : 'transparent',
                            fontWeight: resumeViewMode === 'preview' ? '700' : '500',
                            color: 'var(--ink)',
                            cursor: 'pointer',
                            boxShadow: resumeViewMode === 'preview' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          Document Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setResumeViewMode('editor')}
                          style={{
                            fontSize: '11.5px',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            background: resumeViewMode === 'editor' ? '#fff' : 'transparent',
                            fontWeight: resumeViewMode === 'editor' ? '700' : '500',
                            color: 'var(--ink)',
                            cursor: 'pointer',
                            boxShadow: resumeViewMode === 'editor' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          Live Edit
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="op-tailor-btn-primary"
                        onClick={() => exportToPdf(editableResume || tailoredResult.fullTailoredResume, `${company || 'tailored'}-resume.pdf`)}
                        style={{ fontSize: '12px', padding: '6px 14px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        Export ATS PDF
                      </button>
                      <button
                        type="button"
                        className="op-btn-secondary"
                        onClick={() => copyToClipboard(editableResume || tailoredResult.fullTailoredResume)}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        {copied ? '✓ Copied!' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        className="op-btn-secondary"
                        onClick={() => downloadMarkdown(editableResume || tailoredResult.fullTailoredResume, `${company || 'tailored'}-resume.md`)}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        Export .md
                      </button>
                    </div>
                  </div>

                  {resumeViewMode === 'preview' ? (
                    <div
                      className="op-tailor-preview-paper"
                      dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(editableResume || tailoredResult.fullTailoredResume) }}
                    />
                  ) : (
                    <div className="op-tailor-editor-wrap">
                      <textarea
                        value={editableResume || tailoredResult.fullTailoredResume}
                        onChange={(e) => setEditableResume(e.target.value)}
                        rows={14}
                        className="op-tailor-editor-textarea"
                      />
                      <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '4px' }}>
                        Tip: Edit any bullet, metric, or company name above. Changes update the PDF export immediately.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Skills Gaps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Missing Required Skills ({auditResult.missingSkills.length})
                  </div>
                  {auditResult.missingSkills.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {auditResult.missingSkills.map((s) => (
                        <span key={s} style={{ fontSize: '12px', background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          + {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#15803d' }}>All detected technical skills present!</div>
                  )}
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Matched Skills ({auditResult.matchedSkills.length})
                  </div>
                  {auditResult.matchedSkills.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {auditResult.matchedSkills.map((s) => (
                        <span key={s} style={{ fontSize: '12px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>No direct technical skill matches found.</div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {auditResult.suggestions?.length > 0 && (
                <div style={{ background: 'var(--surface-2, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', marginBottom: '8px' }}>
                    Step-by-Step Recommendations to Reach 80%+:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--ink)' }}>
                    {auditResult.suggestions.map((sugg, i) => (
                      <li key={i} style={{ marginBottom: '6px' }}>{sugg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
