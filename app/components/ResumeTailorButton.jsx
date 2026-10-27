'use client';

import { useState } from 'react';
import ResumeTailorModal from './ResumeTailorModal.jsx';

// Temporarily hidden in production while the resume and job-matching flows are repaired.
const APPLY_COPILOT_ENABLED = false;

export default function ResumeTailorButton({ job, className = "btn btn-ghost", label = "Prepare & apply" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!APPLY_COPILOT_ENABLED) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setIsOpen(true)}
        title="Prepare a truthful resume and application answers"
      >
        <span className="op-tailor-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z" /></svg>
        </span>
        <span className="op-tailor-action-copy"><strong>{label}</strong><small>Resume + answers from verified experience</small></span>
        <span className="op-tailor-action-arrow" aria-hidden="true">→</span>
      </button>

      <ResumeTailorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        job={job}
      />
    </>
  );
}
