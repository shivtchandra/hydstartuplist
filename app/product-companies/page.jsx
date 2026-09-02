"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteNav from "../components/SiteNav.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";
import StartupLogo from "../components/StartupLogo.jsx";

const PRODUCT_SECTORS = new Set([
  "SaaS", "FinTech", "HealthTech", "EdTech", "AI/ML", "DeepTech",
  "Gaming", "E-commerce", "PropTech", "AgriTech", "CleanTech",
  "HRTech", "LegalTech", "CyberSecurity", "IoT", "AR/VR",
  "Developer Tools", "B2B SaaS", "Consumer Tech", "Logistics Tech",
]);

export default function ProductCompaniesPage() {
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState("");

  useEffect(() => {
    fetch("/api/startups")
      .then((r) => r.json())
      .then((data) => {
        // Product companies = startups that build their own product, not pure IT services
        const product = Array.isArray(data)
          ? data.filter((s) => s.status === "approved" && s.name)
          : [];
        setStartups(product);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sectors = [...new Set(startups.map((s) => s.sector).filter(Boolean))].sort();
  const filtered = sector ? startups.filter((s) => s.sector === sector) : startups;

  return (
    <div className="page-with-nav">
      <SiteNav active="" />
      <div className="feed-page">
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
                className={`filter-chip${!sector ? " active" : ""}`}
                onClick={() => setSector("")}
              >
                All
              </button>
              {sectors.map((s) => (
                <button
                  key={s}
                  className={`filter-chip${sector === s ? " active" : ""}`}
                  onClick={() => setSector(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <LoadingScreen label="Loading product companies…" />}

        {!loading && (
          <div className="feed-list">
            {filtered.map((s) => (
              <Link key={s.id} className="feed-row" href={`/startups/${s.slug || s.id}`}>
                <StartupLogo name={s.name} website={s.website} size={40} />
                <div className="feed-row-body">
                  <div className="feed-row-name">{s.name}</div>
                  <div className="feed-row-sub">
                    {[s.sector, s.area, s.stage].filter(Boolean).join(" · ")}
                  </div>
                  {s.oneLiner && (
                    <div className="feed-row-desc">{s.oneLiner}</div>
                  )}
                </div>
                {s.hiring && (
                  <span className="hiring-badge">Hiring</span>
                )}
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)", padding: "32px 0" }}>
            No companies found for this filter.
          </p>
        )}
      </div>
    </div>
  );
}
