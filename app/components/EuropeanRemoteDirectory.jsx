"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const COUNTRIES = [
  "All Countries",
  "United Kingdom",
  "Germany",
  "France",
  "Netherlands",
  "Sweden",
  "Estonia",
  "Switzerland",
  "Ireland",
  "Spain",
  "Portugal",
];

export default function EuropeanRemoteDirectory({ companies = [], jobs = [] }) {
  const [activeTab, setActiveTab] = useState("roles"); // "roles" | "directory"
  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [query, setQuery] = useState("");

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (selectedCountry !== "All Countries") {
      list = list.filter((j) => (j.country || "").toLowerCase() === selectedCountry.toLowerCase());
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (j) =>
          (j.title || "").toLowerCase().includes(q) ||
          (j.company || "").toLowerCase().includes(q) ||
          (j.location || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, selectedCountry, query]);

  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (selectedCountry !== "All Countries") {
      list = list.filter((c) => (c.country || "").toLowerCase() === selectedCountry.toLowerCase());
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.sector || "").toLowerCase().includes(q) ||
          (c.hq || "").toLowerCase().includes(q) ||
          (c.remoteScope || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [companies, selectedCountry, query]);

  return (
    <div style={{ marginTop: 24, marginBottom: 36 }}>
      <div
        style={{
          border: "1px solid var(--border-glass, #e2e8f0)",
          borderRadius: 16,
          background: "var(--bg-card, #ffffff)",
          padding: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
              Verified European Tech Hub
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text-main, #0f172a)" }}>
              European Startups Hiring Remotely
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)", lineHeight: 1.5, maxWidth: 650 }}>
              Curated index of 100 technology companies across 10 European nations hiring remote engineers. Direct ATS portals with verified zero consultancy spam.
            </p>
          </div>

          <div style={{ display: "flex", gap: 6, background: "var(--bg-muted, #f1f5f9)", padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "roles" ? "var(--bg-card, #ffffff)" : "transparent",
                color: activeTab === "roles" ? "var(--text-main, #0f172a)" : "var(--text-muted, #64748b)",
                boxShadow: activeTab === "roles" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Live Remote Roles ({filteredJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: activeTab === "directory" ? "var(--bg-card, #ffffff)" : "transparent",
                color: activeTab === "directory" ? "var(--text-main, #0f172a)" : "var(--text-muted, #64748b)",
                boxShadow: activeTab === "directory" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              Company ATS Index ({filteredCompanies.length})
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20 }}>
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <input
              type="text"
              placeholder={activeTab === "roles" ? "Search roles, skills, or companies..." : "Search company, sector, or city..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-glass, #cbd5e1)",
                fontSize: 13,
                outline: "none",
                background: "var(--bg-color, #ffffff)",
                color: "var(--text-main, #0f172a)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {COUNTRIES.map((c) => {
              const isActive = selectedCountry === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCountry(c)}
                  className={`fresher-chip${isActive ? " is-active" : ""}`}
                  style={{
                    padding: "5px 11px",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content View: Roles vs Directory */}
        {activeTab === "roles" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 12, color: "var(--text-muted, #64748b)" }}>
              <span>Showing {filteredJobs.length} live remote tech roles</span>
              {selectedCountry !== "All Countries" && (
                <button
                  type="button"
                  onClick={() => setSelectedCountry("All Countries")}
                  style={{ background: "none", border: "none", color: "var(--brand, #2563eb)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
                >
                  Reset country filter
                </button>
              )}
            </div>

            {filteredJobs.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 13 }}>
                No active roles matched your current filters. Try searching a different keyword or resetting country filters.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
                {filteredJobs.slice(0, 60).map((j) => (
                  <div
                    key={j.id}
                    style={{
                      border: "1px solid var(--border-glass, #e2e8f0)",
                      borderRadius: 12,
                      padding: 16,
                      background: "var(--bg-card, #ffffff)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted, #64748b)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {j.company} · {j.country}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(16, 185, 129, 0.1)",
                            color: "#059669",
                            fontWeight: 600,
                          }}
                        >
                          Remote
                        </span>
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: "var(--text-main, #0f172a)", lineHeight: 1.4 }}>
                        {j.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                        Location: {j.location || "Remote"}
                      </p>
                    </div>

                    <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted, #94a3b8)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        via {j.atsProvider}
                      </span>
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "5px 12px",
                          borderRadius: 6,
                          background: "var(--text-main, #0f172a)",
                          color: "#ffffff",
                          fontSize: 11.5,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Apply Direct
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 12, color: "var(--text-muted, #64748b)" }}>
              <span>Showing {filteredCompanies.length} verified companies across Europe</span>
              {selectedCountry !== "All Countries" && (
                <button
                  type="button"
                  onClick={() => setSelectedCountry("All Countries")}
                  style={{ background: "none", border: "none", color: "var(--brand, #2563eb)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
                >
                  Reset country filter
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {filteredCompanies.map((c) => (
                <div
                  key={c.name}
                  style={{
                    border: "1px solid var(--border-glass, #e2e8f0)",
                    borderRadius: 12,
                    padding: 16,
                    background: "var(--bg-card, #ffffff)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-main, #0f172a)" }}>
                        {c.name}
                      </h3>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #64748b)" }}>
                        {c.country}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginBottom: 8 }}>
                      HQ: {c.hq} · {c.sector}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#059669", fontWeight: 600, marginBottom: 10 }}>
                      Policy: {c.remoteScope}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border-glass, #f1f5f9)" }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-muted, #94a3b8)", textTransform: "uppercase" }}>
                      {c.atsProvider}
                    </span>
                    <a
                      href={c.boardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "var(--brand, #2563eb)",
                        textDecoration: "none",
                      }}
                    >
                      Open Careers Board &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
