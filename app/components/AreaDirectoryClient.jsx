"use client";

import { useState } from "react";
import Link from "next/link";
import StartupLogo from "./StartupLogo.jsx";
import { prettyName } from "../../lib/startupUi.js";
import { jobUrlId } from "../../lib/jobs-seo.js";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "";
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function AreaDirectoryClient({
  areaName,
  areaSlug,
  startups = [],
  jobs = [],
}) {
  const [activeTab, setActiveTab] = useState("companies");

  return (
    <section className="industry-section">
      {/* Dual Tab Switcher */}
      <div
        style={{
          display: "inline-flex",
          gap: "4px",
          padding: "4px",
          borderRadius: "10px",
          background: "var(--surface-3, #f1f3f5)",
          border: "1px solid var(--line, #e2e8f0)",
          marginBottom: "16px",
        }}
        role="tablist"
        aria-label={`${areaName} directory view`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "companies"}
          onClick={() => setActiveTab("companies")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            fontSize: "13px",
            fontWeight: "650",
            cursor: "pointer",
            background: activeTab === "companies" ? "white" : "transparent",
            color: activeTab === "companies" ? "var(--ink, #0f172a)" : "var(--ink-2, #64748b)",
            boxShadow: activeTab === "companies" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          🏢 Mapped Companies ({startups.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "jobs"}
          onClick={() => setActiveTab("jobs")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            fontSize: "13px",
            fontWeight: "650",
            cursor: "pointer",
            background: activeTab === "jobs" ? "white" : "transparent",
            color: activeTab === "jobs" ? "#ff5722" : "var(--ink-2, #64748b)",
            boxShadow: activeTab === "jobs" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s ease",
          }}
        >
          ⚡ Live Openings ({jobs.length})
        </button>
      </div>

      {activeTab === "companies" ? (
        <>
          <div className="feed-list">
            {startups.map((s) => (
              <Link
                key={s.id}
                className="feed-row feed-row-link"
                href={`/startups/${s.slug}`}
              >
                <StartupLogo name={s.name} website={s.website} size={40} />
                <div className="feed-row-body">
                  <div className="feed-row-name">
                    {prettyName(s.name)}
                    {s.hiring ? <span className="hiring-badge">Hiring</span> : null}
                  </div>
                  <div className="feed-row-sub">
                    {[s.sector, s.fundingStage].filter(Boolean).join(" · ")}
                  </div>
                  {s.description && (
                    <div className="feed-row-desc">{s.description}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {startups.length === 0 && (
            <p style={{ color: "var(--text-muted)", padding: "24px 0" }}>
              No companies currently mapped in this corridor.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="industry-section-sub" style={{ marginBottom: "12px" }}>
            Live engineering, product, and AI roles at mapped {areaName} companies.{" "}
            <Link href={`/jobs/in/${areaSlug}`}>Explore full {areaName} jobs board →</Link>
          </p>
          <div className="feed-list">
            {jobs.map((j) => (
              <Link
                key={j.id}
                className="feed-row feed-row-link"
                href={`/jobs/${jobUrlId(j.id)}`}
              >
                <StartupLogo name={j.company} size={40} />
                <div className="feed-row-body">
                  <div className="feed-row-name">{j.title}</div>
                  <div className="feed-row-sub">
                    <strong>{j.company}</strong> · {j.location || areaName}
                    {j.postedAt && <> · <span>{timeAgo(j.postedAt)}</span></>}
                  </div>
                </div>
                <span
                  className="hiring-badge"
                  style={{
                    background: "rgba(255, 87, 34, 0.1)",
                    color: "#ff5722",
                    border: "1px solid rgba(255, 87, 34, 0.2)",
                  }}
                >
                  Direct ATS ↗
                </span>
              </Link>
            ))}
          </div>
          {jobs.length === 0 && (
            <p style={{ color: "var(--text-muted)", padding: "24px 0" }}>
              No active job openings currently listed for {areaName}. Check back soon or{" "}
              <Link href="/jobs">browse all Hyderabad jobs →</Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
