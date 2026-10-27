'use client';

import ResumeTailorWorkspace from '../../components/ResumeTailorWorkspace.jsx';

export default function TailorClient({ sampleJobs = [] }) {
  return <ResumeTailorWorkspace sampleJobs={sampleJobs} />;
}
