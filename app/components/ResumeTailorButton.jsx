'use client';

import { useState } from 'react';
import ResumeTailorModal from './ResumeTailorModal.jsx';

export default function ResumeTailorButton({ job, className = "btn btn-ghost", label = "Tailor my resume" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setIsOpen(true)}
        title="Tailor your resume using only verified experience"
      >
        <span className="op-tailor-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z" /></svg>
        </span>
        <span className="op-tailor-action-copy"><strong>{label}</strong><small>Rewrite from your verified experience</small></span>
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
