"use client";

import { useEffect, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";
import { logoSrcs } from "../../lib/startupUi.js";

function GccLogoBadge({ name, website, size = 40 }) {
  const srcs = logoSrcs(website);
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
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth <= 16 && e.currentTarget.naturalHeight <= 16) {
            setStage((s) => s + 1);
          }
        }}
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
    <div className="page-with-nav">
      <SiteNav active="gccs" />
      <div className="feed-page">
      <div className="feed-head">
        <h1>Global Capability Centers hiring in Hyderabad</h1>
        <p className="form-sub">
          Large companies' in-house Hyderabad engineering/ops centers — not startups, but major local
          employers. Most run Workday-style ATS we can't reliably probe for live counts yet, so this is a
          curated list of real, verified career pages rather than a job count — click through to search
          Hyderabad roles directly on each company's own site.
        </p>
      </div>

      {loading && <LoadingScreen label="Rounding up the GCCs…" />}

      {gccs.some((g) => g.sponsored) && (
        <div className="gcc-spotlight-block">
          <div className="spotlight-head" style={{ padding: "0 0 10px" }}>
            <span className="spotlight-title">Hiring spotlight</span>
            <span className="spotlight-sub">Sponsored GCC placements</span>
          </div>
          <div className="feed-list">
            {gccs.filter((g) => g.sponsored).map((g) => (
              <a key={g.id} className="feed-row feed-row-sponsored" href={g.careers} target="_blank" rel="noreferrer">
                <GccLogoBadge name={g.name} website={g.website} />
                <div className="feed-row-body">
                  <div className="feed-row-name">
                    {g.name}
                    <span className="sponsored-badge">Sponsored</span>
                  </div>
                  <div className="feed-row-sub">{g.industry} · Hyderabad · Global Capability Center</div>
                </div>
                <span className="nls-more-link">View careers →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="feed-list">
        {gccs.filter((g) => !g.sponsored).map((g) => (
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
    </div>
  );
}
