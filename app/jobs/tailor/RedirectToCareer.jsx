'use client';

import { useEffect } from 'react';

export default function RedirectToCareer() {
  useEffect(() => { window.location.replace(`/career${window.location.search}`); }, []);
  return (
    <p style={{ maxWidth: 640, margin: '48px auto', padding: '0 16px' }}>
      Apply Copilot is now part of the <a href="/career">Career Hub</a>.
    </p>
  );
}
