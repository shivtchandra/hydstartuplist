'use client';

import { useState } from 'react';
import ResumeTailorModal from './ResumeTailorModal.jsx';

export default function ResumeTailorButton({ job, className = "btn btn-ghost", label = "Match & Tailor Resume" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setIsOpen(true)}
        title="Analyze ATS match score and reframe resume to 80%+ target"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        {label}
      </button>

      <ResumeTailorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        job={job}
      />
    </>
  );
}
