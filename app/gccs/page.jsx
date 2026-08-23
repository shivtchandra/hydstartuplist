"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { domainOf, faviconUrl } from "../../lib/startupUi.js";

function GccLogoBadge({ name, website, size = 40 }) {
  const domain = domainOf(website);
  const srcs = domain ? [`https://logo.clearbit.com/${domain}?size=128`, faviconUrl(website)] : [];
  const [stage, setStage] = useState(0);
  if (stage < srcs.length) {
    return (
      <img
        className="card-logo"
        src={srcs[stage]}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setStage((s) => s + 1)}
      />
    );
  }
  return (
    <div className="card-logo-fallback" style={{ width: size, height: size, background: "var(--accent-gradient)" }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function GccsPage() {
  const [gccs, setGccs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gccs")
      .then((r) => r.json())
      .then((d) => { setGccs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="feed-page">
      <div className="feed-head">
        <Link href="/" className="feed-back-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to map
        </Link>
        <h1>Global Capability Centers hiring in Hyderabad</h1>
        <p className="form-sub">
          Large companies' in-house Hyderabad engineering/ops centers — not startups, but major local
          employers. Most run Workday-style ATS we can't reliably probe for live counts yet, so this is a
          curated list of real, verified career pages rather than a job count — click through to search
          Hyderabad roles directly on each company's own site.
        </p>
      </div>

      {loading && <p className="form-sub">Loading…</p>}

      <div className="feed-list">
        {gccs.map((g) => (
          <a key={g.id} className="feed-row" href={g.careers} target="_blank" rel="noreferrer">
            <GccLogoBadge name={g.name} website={g.website} />
            <div className="feed-row-body">
              <div className="feed-row-name">{g.name}</div>
              <div className="feed-row-sub">{g.industry} · Hyderabad · Global Capability Center</div>
            </div>
            <span className="nls-more-link">View careers →</span>
          </a>
        ))}
      </div>
    </div>
  );
}
