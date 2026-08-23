"use client";

export default function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="loading-screen">
      <svg className="loading-art" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="128" rx="70" ry="6" fill="var(--border-subtle)" />
        <rect x="35" y="88" width="130" height="8" rx="3" fill="var(--surface-card)" stroke="var(--accent-primary)" strokeWidth="2.5" />
        <line x1="45" y1="96" x2="45" y2="122" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="155" y1="96" x2="155" y2="122" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="120" y="70" width="26" height="18" rx="2" fill="var(--surface-card)" stroke="var(--accent-primary)" strokeWidth="2.5" />
        <line x1="126" y1="70" x2="126" y2="88" stroke="var(--accent-primary)" strokeWidth="1.5" />
        <g className="loading-sleeper">
          <path d="M60 88 C58 74, 66 62, 82 62 C98 62, 104 74, 100 88 Z" fill="var(--surface-card)" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M58 88 Q80 96 104 88" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M66 66 Q72 58 82 58 Q94 58 98 68" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M70 78 q4 -3 8 0" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M50 92 Q60 100 66 90" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
        <g className="loading-zzz">
          <text x="112" y="56" fontFamily="var(--font-heading)" fontWeight="800" fontSize="15" fill="var(--accent-primary)" className="loading-z1">Z</text>
          <text x="122" y="42" fontFamily="var(--font-heading)" fontWeight="800" fontSize="12" fill="var(--accent-primary)" className="loading-z2">z</text>
          <text x="130" y="30" fontFamily="var(--font-heading)" fontWeight="800" fontSize="9" fill="var(--accent-primary)" className="loading-z3">z</text>
        </g>
      </svg>
      <p className="loading-label">{label}</p>
    </div>
  );
}
