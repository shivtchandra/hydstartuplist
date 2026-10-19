'use client';

import { useState, useRef, useEffect } from 'react';
import { extractResumeProfile, SKILL_TAXONOMY } from '../../lib/resume-matcher.js';

/** Dynamically loads PDF.js from cdnjs if not already present. */
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

/** Extracts text from a PDF file using PDF.js. */
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
    fullText += strings.join(' ') + '\n';
  }

  return fullText;
}

export default function ResumeMatchModal({ isOpen, onClose, onSaveProfile, onClearProfile, currentProfile }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [pastedText, setPastedText] = useState('');
  const [profile, setProfile] = useState(currentProfile || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setProfile(currentProfile || null);
  }, [currentProfile]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleFile(file) {
    if (!file) return;
    setErrorMsg('');
    setIsProcessing(true);

    try {
      let text = '';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length < 40) {
        throw new Error('Could not extract readable text from this file. Try copying and pasting your resume text.');
      }

      const extracted = extractResumeProfile(text);
      extracted.fileName = file.name;
      setProfile(extracted);
    } catch (err) {
      console.error('Resume parse error:', err);
      setErrorMsg(err.message || 'Failed to read resume file. You can paste your text below instead.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handlePasteSubmit(e) {
    e.preventDefault();
    if (!pastedText.trim()) return;
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const extracted = extractResumeProfile(pastedText);
      extracted.fileName = 'Pasted Resume';
      setProfile(extracted);
    } catch (err) {
      setErrorMsg('Failed to analyze text. Please check the content and try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  function removeSkill(skillToRemove) {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skillToRemove),
    });
  }

  function addSkill(e) {
    e.preventDefault();
    const val = newSkillInput.trim();
    if (!val || !profile) return;
    const exists = profile.skills.some((s) => s.toLowerCase() === val.toLowerCase());
    if (!exists) {
      setProfile({
        ...profile,
        skills: [...profile.skills, val],
      });
    }
    setNewSkillInput('');
  }

  function updateLevel(newLevel) {
    if (!profile) return;
    setProfile({
      ...profile,
      experienceLevel: newLevel,
    });
  }

  function handleSave() {
    if (!profile) return;
    onSaveProfile(profile);
    onClose();
  }

  function handleClear() {
    setProfile(null);
    setPastedText('');
    setErrorMsg('');
    onClearProfile();
    onClose();
  }

  return (
    <div className="op-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="op-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-match-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="op-modal-header">
          <div>
            <h2 id="resume-match-title" className="op-modal-title">
              Match Jobs with your Resume
            </h2>
            <p className="op-modal-subtitle">
              Score Hyderabad tech jobs against your skills and experience. Processed privately in your browser.
            </p>
          </div>
          <button type="button" className="op-modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="op-modal-body">
          {errorMsg && <div className="op-modal-alert op-modal-alert-error">{errorMsg}</div>}

          {!profile ? (
            <>
              <div className="op-modal-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  className={`op-modal-tab ${activeTab === 'upload' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('upload')}
                  aria-selected={activeTab === 'upload'}
                >
                  Upload File (PDF / Text)
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`op-modal-tab ${activeTab === 'paste' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('paste')}
                  aria-selected={activeTab === 'paste'}
                >
                  Paste Text
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div
                  className={`op-dropzone ${isProcessing ? 'is-processing' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.text,.md"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    }}
                  />
                  {isProcessing ? (
                    <div className="op-dropzone-loading">Analyzing resume text...</div>
                  ) : (
                    <>
                      <div className="op-dropzone-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      </div>
                      <div className="op-dropzone-title">Drop your resume PDF or text file here</div>
                      <div className="op-dropzone-sub">or click to browse your computer</div>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handlePasteSubmit} className="op-paste-form">
                  <textarea
                    className="op-paste-textarea"
                    rows={8}
                    placeholder="Paste your resume text, bio, or list of technical skills and experience..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="op-btn-primary"
                    disabled={isProcessing || !pastedText.trim()}
                  >
                    {isProcessing ? 'Analyzing...' : 'Extract Skills & Profile'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="op-profile-view">
              <div className="op-profile-status-bar">
                <div>
                  <span className="op-profile-source-badge">{profile.fileName || 'Active Resume'}</span>
                  <span className="op-profile-skill-count">{profile.skills?.length || 0} skills detected</span>
                </div>
                <button
                  type="button"
                  className="op-btn-text-danger"
                  onClick={() => setProfile(null)}
                >
                  Replace file
                </button>
              </div>

              <div className="op-profile-field-group">
                <label className="op-profile-label">Experience Level</label>
                <div className="op-profile-level-selector">
                  {[
                    { key: 'intern', label: 'Intern / Fresher' },
                    { key: 'junior', label: 'Junior (1-2y)' },
                    { key: 'mid', label: 'Mid (3-5y)' },
                    { key: 'senior', label: 'Senior (5-8y)' },
                    { key: 'lead', label: 'Lead / Staff (8y+)' },
                  ].map((lvl) => (
                    <button
                      key={lvl.key}
                      type="button"
                      className={`op-level-chip ${profile.experienceLevel === lvl.key ? 'is-selected' : ''}`}
                      onClick={() => updateLevel(lvl.key)}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="op-profile-field-group">
                <label className="op-profile-label">
                  Detected Skills (click &times; to remove, or type below to add)
                </label>
                <div className="op-skills-tags-wrap">
                  {(profile.skills || []).map((skill) => (
                    <span key={skill} className="op-skill-tag">
                      {skill}
                      <button
                        type="button"
                        className="op-skill-tag-del"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {(!profile.skills || profile.skills.length === 0) && (
                    <span className="op-skills-empty">No skills detected. Add your core skills below.</span>
                  )}
                </div>

                <form onSubmit={addSkill} className="op-add-skill-form">
                  <input
                    type="text"
                    className="op-add-skill-input"
                    placeholder="Add a skill (e.g. Docker, PyTorch, GraphQL)..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                  />
                  <button type="submit" className="op-btn-secondary" disabled={!newSkillInput.trim()}>
                    + Add
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="op-modal-footer">
          {profile && (
            <button type="button" className="op-btn-danger-ghost" onClick={handleClear}>
              Clear resume
            </button>
          )}
          <div className="op-modal-footer-right">
            <button type="button" className="op-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {profile && (
              <button type="button" className="op-btn-primary" onClick={handleSave}>
                Apply Match & Sort Jobs
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
