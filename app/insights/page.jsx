"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";

const RAMP = ["#fdf1ec", "#fbe0d3", "#f6c3ab", "#f0a17e", "#e97e54", "#e0562b", "#b8441f", "#8f3418"];

function stepFor(count, max) {
  if (!count) return 0;
  const t = Math.sqrt(count) / Math.sqrt(max || 1);
  return Math.min(RAMP.length - 1, 1 + Math.floor(t * (RAMP.length - 2)));
}

const SECTOR_ICONS = {
  "SaaS": "🚀", "FinTech": "💳", "HealthTech": "🏥", "EdTech": "📚",
  "AI/ML": "🤖", "DeepTech": "🔬", "E-commerce": "🛒", "HRTech": "👥",
  "PropTech": "🏠", "AgriTech": "🌾", "CleanTech": "♻️", "IoT": "📡",
  "Gaming": "🎮", "LegalTech": "⚖️", "CyberSecurity": "🔒", "AR/VR": "🥽",
  "Logistics Tech": "🚚", "B2B SaaS": "🏢", "Consumer Tech": "📱",
  "Developer Tools": "🛠️", "MarTech": "📣", "InsurTech": "🛡️",
};

function SectorBar({ sector, count, hiringCount, total, rank, max }) {
  const pct = total ? ((count / total) * 100).toFixed(1) : 0;
  const barWidth = max ? (count / max) * 100 : 0;
  const icon = SECTOR_ICONS[sector] || "📦";

  return (
    <Link href={`/?sector=${encodeURIComponent(sector)}`} className="ins-sector-row">
      <div className="ins-sector-rank">#{rank}</div>
      <div className="ins-sector-icon">{icon}</div>
      <div className="ins-sector-body">
        <div className="ins-sector-top-row">
          <span className="ins-sector-name">{sector}</span>
          <div className="ins-sector-nums">
            <span className="ins-sector-count">{count.toLocaleString()}</span>
            <span className="ins-sector-pct">{pct}%</span>
            {hiringCount > 0 && (
              <span className="ins-hiring-badge">
                <span className="ins-hiring-dot" />{hiringCount} hiring
              </span>
            )}
          </div>
        </div>
        <div className="ins-bar-track">
          <div className="ins-bar-fill" style={{ width: `${barWidth}%` }} />
        </div>
      </div>
    </Link>
  );
}

export default function InsightsPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    fetch("/api/startups")
      .then((r) => r.json())
      .then((d) => { setAll(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sectorStats = useMemo(() => {
    const counts = {};
    const hiring = {};
    for (const s of all) {
      counts[s.sector] = (counts[s.sector] || 0) + 1;
      if (s.hiring) hiring[s.sector] = (hiring[s.sector] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([sector, count]) => ({ sector, count, hiringCount: hiring[sector] || 0 }));
  }, [all]);

  const topArea = useMemo(() => {
    const counts = {};
    for (const s of all) if (s.area) counts[s.area] = (counts[s.area] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null;
  }, [all]);

  const hiringCount = useMemo(() => all.filter((s) => s.hiring).length, [all]);
  const topSector = sectorStats[0] ?? null;
  const maxCount = topSector?.count ?? 1;

  const sectors = useMemo(() => [...new Set(all.map((s) => s.sector))].sort(), [all]);
  const stages = useMemo(() => [...new Set(all.map((s) => s.fundingStage))].sort(), [all]);
  const grid = useMemo(() => {
    const c = {};
    for (const s of all) { const k = `${s.sector}|${s.fundingStage}`; c[k] = (c[k] || 0) + 1; }
    return c;
  }, [all]);
  const gridMax = useMemo(() => Math.max(1, ...Object.values(grid)), [grid]);

  return (
    <div className="page-with-nav">
      <SiteNav active="insights" />
      <div className="feed-page ins-page">

        {/* Hero */}
        <div className="ins-hero">
          <h1 className="ins-hero-title">Ecosystem Insights</h1>
          <p className="ins-hero-sub">Live data across {all.length.toLocaleString()} tracked Hyderabad startups</p>
        </div>

        {loading ? (
          <LoadingScreen label="Crunching the ecosystem numbers…" />
        ) : (
          <>
            {/* Stat strip */}
            <div className="ins-stats-row">
              <div className="ins-stat">
                <div className="ins-stat-value accent">{all.length.toLocaleString()}</div>
                <div className="ins-stat-label">Total startups</div>
              </div>
              <div className="ins-stat-div" />
              <div className="ins-stat">
                <div className="ins-stat-value green">{hiringCount}</div>
                <div className="ins-stat-label">Hiring now</div>
              </div>
              <div className="ins-stat-div" />
              <div className="ins-stat">
                <div className="ins-stat-value">{sectorStats.length}</div>
                <div className="ins-stat-label">Sectors</div>
              </div>
              {topArea && (
                <>
                  <div className="ins-stat-div" />
                  <div className="ins-stat">
                    <div className="ins-stat-value" style={{ fontSize: 18 }}>{topArea.name}</div>
                    <div className="ins-stat-label">Top area</div>
                  </div>
                </>
              )}
            </div>

            {/* Sector leaderboard */}
            <div className="ins-section">
              <div className="ins-section-head">
                <h2 className="ins-section-title">Sectors</h2>
                <span className="ins-section-sub">by startup count · tap to explore on map</span>
              </div>
              <div className="ins-sector-list">
                {sectorStats.map((s, i) => (
                  <SectorBar
                    key={s.sector}
                    sector={s.sector}
                    count={s.count}
                    hiringCount={s.hiringCount}
                    total={all.length}
                    rank={i + 1}
                    max={maxCount}
                  />
                ))}
              </div>
            </div>

            {/* Heatmap — collapsible secondary */}
            <div className="ins-section">
              <button
                type="button"
                className="ins-heatmap-toggle"
                onClick={() => setShowHeatmap((v) => !v)}
              >
                <span>Sector × Funding stage matrix</span>
                <span className="ins-toggle-caret">{showHeatmap ? "▾" : "▸"}</span>
              </button>

              {showHeatmap && (
                <>
                  <div className="hm-legend">
                    <span>Fewer</span>
                    <div className="hm-legend-scale">
                      {RAMP.map((c, i) => <span key={i} style={{ background: c }} />)}
                    </div>
                    <span>More ({gridMax})</span>
                  </div>
                  <div className="hm-card">
                    <div className="hm-scroll">
                      <table className="hm-table">
                        <thead>
                          <tr>
                            <th className="hm-corner" />
                            {stages.map((st) => <th key={st} className="hm-col">{st}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sectors.map((sec) => (
                            <tr key={sec}>
                              <th className="hm-row">{sec}</th>
                              {stages.map((st) => {
                                const count = grid[`${sec}|${st}`] || 0;
                                const step = stepFor(count, gridMax);
                                const isHov = hover?.sec === sec && hover?.st === st;
                                return (
                                  <td
                                    key={st}
                                    className={isHov ? "hm-cell hm-cell-hover" : "hm-cell"}
                                    style={{ background: RAMP[step], color: step >= 5 ? "#fff" : "var(--text-main)" }}
                                    onMouseEnter={() => setHover({ sec, st, count })}
                                    onMouseLeave={() => setHover(null)}
                                  >
                                    {count || ""}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="hm-tooltip-slot">
                    {hover
                      ? <span><strong>{hover.sec}</strong> · {hover.st}: <strong>{hover.count}</strong> startup{hover.count === 1 ? "" : "s"}</span>
                      : <span className="form-sub" style={{ margin: 0 }}>Hover a cell for details.</span>}
                  </div>
                </>
              )}
            </div>

            <p className="ins-footer">
              <Link href="/jobs">Browse open startup jobs →</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
