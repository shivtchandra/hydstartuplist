"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import StartupLogo from "./StartupLogo.jsx";

export default function ProductCompaniesClient({ startups }) {
  const [sector, setSector] = useState("");
  const sectors = useMemo(
    () => [...new Set(startups.map((s) => s.sector).filter(Boolean))].sort(),
    [startups]
  );
  const filtered = sector ? startups.filter((s) => s.sector === sector) : startups;

  return (
    <>
      <div className="feed-head">
        <h1>Product Companies in Hyderabad</h1>
        <p className="form-sub">
          {startups.length}+ product-focused tech startups and companies in Hyderabad — building
          their own software, tools, and platforms. Browse by sector or{" "}
          <Link href="/">explore on the map →</Link>
        </p>
        {sectors.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className={`filter-chip${!sector ? " active" : ""}`}
              onClick={() => setSector("")}
            >
              All
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
        )}
      </div>

      <div className="feed-list">
        {filtered.map((s) => (
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
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--text-muted)", padding: "32px 0" }}>
          No companies found for this filter.
        </p>
      )}
    </>
  );
}
