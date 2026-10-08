"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import StartupLogo from "./StartupLogo.jsx";
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

export default function ProductCompaniesClient({ startups = [], jobs = [] }) {
  const [activeTab, setActiveTab] = useState("companies");
  const [sector, setSector] = useState("");
  const [jobLevel, setJobLevel] = useState("all");

  const sectors = useMemo(
    () => [...new Set(startups.map((s) => s.sector).filter(Boolean))].sort(),
    [startups]
  );
  const filteredStartups = sector ? startups.filter((s) => s.sector === sector) : startups;

  const filteredJobs = useMemo(() => {
    if (jobLevel === "all") return jobs;
    if (jobLevel === "fresher") {
      return jobs.filter(
        (j) =>
          j.level === "intern" ||
          j.level === "junior" ||
          /fresher|intern|trainee|junior|entry/i.test(j.title)
      );
    }
    return jobs.filter((j) => j.level === jobLevel);
  }, [jobs, jobLevel]);

  return (
    <>
      <div className="feed-head">
        <h1>Top Product Companies in Hyderabad</h1>
        <p className="form-sub">
          {startups.length}+ verified product tech companies and startups in Hyderabad — building
          their own software, tools, and platforms with live direct-apply career portals. Browse by sector or{" "}
          <Link href="/">explore on the map →</Link>
        </p>

        {/* Dual Tab Switcher */}
        <div
          style={{
            display: "inline-flex",
            gap: "4px",
            padding: "4px",
            borderRadius: "10px",
            background: "var(--surface-3, #f1f3f5)",
            border: "1px solid var(--line, #e2e8f0)",
            margin: "16px 0 12px 0",
          }}
          role="tablist"
          aria-label="Product Companies View"
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
            🏢 Companies ({startups.length})
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
          sectors.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className={`filter-chip${!sector ? " active" : ""}`}
                onClick={() => setSector("")}
              >
                All Sectors ({startups.length})
              </button>
              {sectors.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`filter-chip${sector === s ? " active" : ""}`}
                  onClick={() => setSector(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className={`filter-chip${jobLevel === "all" ? " active" : ""}`}
              onClick={() => setJobLevel("all")}
            >
              All Openings ({jobs.length})
            </button>
            <button
              type="button"
              className={`filter-chip${jobLevel === "fresher" ? " active" : ""}`}
              onClick={() => setJobLevel("fresher")}
            >
              Freshers &amp; Interns
            </button>
            <button
              type="button"
              className={`filter-chip${jobLevel === "mid" ? " active" : ""}`}
              onClick={() => setJobLevel("mid")}
            >
              Mid-Level
            </button>
            <button
              type="button"
              className={`filter-chip${jobLevel === "senior" ? " active" : ""}`}
              onClick={() => setJobLevel("senior")}
            >
              Senior / Lead
            </button>
          </div>
        )}
      </div>

      {activeTab === "companies" ? (
        <div className="feed-list">
          {filteredStartups.map((s) => (
            <Link key={s.id} className="feed-row" href={`/startups/${s.slug || s.id}`}>
              <StartupLogo name={s.name} website={s.website} size={40} />
              <div className="feed-row-body">
                <div className="feed-row-name">{s.name}</div>
                <div className="feed-row-sub">
                  {[s.sector, s.area, s.stage || s.fundingStage].filter(Boolean).join(" · ")}
                </div>
                {(s.oneLiner || s.description) && (
                  <div className="feed-row-desc">{s.oneLiner || s.description}</div>
                )}
              </div>
              {s.hiring && <span className="hiring-badge">Hiring</span>}
            </Link>
          ))}
          {filteredStartups.length === 0 && (
            <p style={{ color: "var(--text-muted)", padding: "32px 0" }}>
              No companies found for this filter.
            </p>
          )}
        </div>
      ) : (
        <div className="feed-list">
          {filteredJobs.map((j) => (
            <Link key={j.id} className="feed-row" href={`/jobs/${jobUrlId(j.id)}`}>
              <StartupLogo name={j.company} size={40} />
              <div className="feed-row-body">
                <div className="feed-row-name">{j.title}</div>
                <div className="feed-row-sub">
                  <strong>{j.company}</strong> · {j.location}
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
          {filteredJobs.length === 0 && (
            <p style={{ color: "var(--text-muted)", padding: "32px 0" }}>
              No open roles found matching this criteria.
            </p>
          )}
        </div>
      )}
    </>
  );
}
