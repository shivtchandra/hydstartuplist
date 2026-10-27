'use client';

import ResumeTailorWorkspace from './ResumeTailorWorkspace.jsx';

export default function ResumeTailorModal({ isOpen, onClose, job }) {
  if (!isOpen) return null;
  return <ResumeTailorWorkspace job={job} isModal onClose={onClose} />;
}
