"use client";

import { useEffect, useMemo, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";

const RAMP = ["#fdf1ec", "#fbe0d3", "#f6c3ab", "#f0a17e", "#e97e54", "#e0562b", "#b8441f", "#8f3418"];

function stepFor(count, max) {
  if (!count) return 0;
  const t = Math.sqrt(count) / Math.sqrt(max || 1);
  return Math.min(RAMP.length - 1, 1 + Math.floor(t * (RAMP.length - 2)));
}

export default function InsightsPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    fetch("/api/startups")
      .then((r) => r.json())
      .then((d) => { setAll(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => [...new Set(all.map((s) => s.sector))].sort(), [all]);
  const stages = useMemo(() => [...new Set(all.map((s) => s.fundingStage))].sort(), [all]);

  const grid = useMemo(() => {
    const counts = {};
    for (const s of all) {
      const key = `${s.sector}|${s.fundingStage}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [all]);

  const max = useMemo(() => Math.max(1, ...Object.values(grid)), [grid]);

  const topSector = useMemo(() => {
    const counts = {};
    all.forEach((s) => { counts[s.sector] = (counts[s.sector] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : "N/A";
  }, [all]);

  const hiringCount = useMemo(() => all.filter((s) => s.hiring).length, [all]);

  return (
    <div className="page-with-nav">
      <SiteNav active="insights" />
      <div className="feed-page">
      <div className="feed-head">
        <h1 className="form-title">Ecosystem Insights</h1>
        <p className="form-sub">
          Sector × funding-stage density matrix across all {all.length.toLocaleString()} tracked Hyderabad startups.
        </p>
      </div>

      {loading ? (
        <LoadingScreen label="Crunching the ecosystem numbers…" />
      ) : (
        <>
          <div className="feed-list" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div className="s-card" style={{ cursor: "default" }}>
              <div className="s-card-sub">Total Tracked</div>
              <div className="s-card-name" style={{ fontSize: 26, color: "var(--accent-primary)" }}>
                {all.length.toLocaleString()}
              </div>
            </div>
            <div className="s-card" style={{ cursor: "default" }}>
              <div className="s-card-sub">Top Sector</div>
              <div className="s-card-name" style={{ fontSize: 20 }}>
                {topSector}
              </div>
            </div>
            <div className="s-card" style={{ cursor: "default" }}>
              <div className="s-card-sub">Hiring Now</div>
              <div className="s-card-name" style={{ fontSize: 26, color: "var(--badge-hiring-text)" }}>
                {hiringCount}
              </div>
            </div>
          </div>

          <div className="hm-legend" style={{ marginTop: 12 }}>
            <span>Fewer</span>
            <div className="hm-legend-scale">
              {RAMP.map((c, i) => <span key={i} style={{ background: c }} />)}
            </div>
            <span>More ({max})</span>
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
                        const step = stepFor(count, max);
                        const isHover = hover && hover.sec === sec && hover.st === st;
                        return (
                          <td
                            key={st}
                            className={isHover ? "hm-cell hm-cell-hover" : "hm-cell"}
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
              : <span className="form-sub" style={{ margin: 0 }}>Hover a cell for details. Scroll table horizontally for full stage breakdown.</span>}
          </div>
        </>
      )}
      </div>
    </div>
  );
}

