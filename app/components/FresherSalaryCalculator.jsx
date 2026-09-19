"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const ROLES = [
  {
    id: "sde",
    label: "Software Engineer (SDE-1)",
    shortLabel: "SDE-1",
    path: "/jobs/fresher/software-engineer",
    defaultCTC: 8.5,
    startups: { range: "₹7.5 – ₹14.0 LPA", typical: "₹8.5L Base", companies: "Darwinbox, Keka, HighRadius, Zenoti" },
    gccs: { range: "₹14.0 – ₹26.0 LPA", typical: "₹16.0L Base + Stocks", companies: "ServiceNow, Microsoft, Qualcomm, Amazon" },
    services: { range: "₹3.5 – ₹7.0 LPA", typical: "₹4.2L Base", companies: "TCS Digital, Cognizant, Wipro" },
    criteria: "DSA fundamentals (LeetCode Easy/Med) + 2 live deployed full-stack web/backend projects.",
  },
  {
    id: "frontend",
    label: "Frontend & UI Engineer",
    shortLabel: "Frontend",
    path: "/jobs/fresher/frontend",
    defaultCTC: 7.5,
    startups: { range: "₹6.5 – ₹11.0 LPA", typical: "₹7.5L Base", companies: "Darwinbox, NxtWave, Zaggle, FreightFox" },
    gccs: { range: "₹12.0 – ₹18.0 LPA", typical: "₹14.0L Base", companies: "ServiceNow UI Labs, EPAM, Salesforce" },
    services: { range: "₹3.6 – ₹5.5 LPA", typical: "₹4.0L Base", companies: "Infosys, Tech Mahindra, ValueLabs" },
    criteria: "Clean React / Next.js / TypeScript code, responsive design, and live portfolio demos.",
  },
  {
    id: "data",
    label: "Data Analyst & Junior AI",
    shortLabel: "Data & AI",
    path: "/jobs/fresher/data-analyst",
    defaultCTC: 7.0,
    startups: { range: "₹6.5 – ₹10.5 LPA", typical: "₹7.0L Base", companies: "HighRadius AI, Gramener, Darwinbox Data" },
    gccs: { range: "₹10.0 – ₹16.0 LPA", typical: "₹12.5L Base", companies: "Wells Fargo, FactSet, S&P Global, Deloitte" },
    services: { range: "₹3.6 – ₹5.0 LPA", typical: "₹4.0L Base", companies: "TCS Analytics, Cognizant Data Insights" },
    criteria: "Advanced SQL (joins, window functions), Python (Pandas), and live dashboard projects.",
  },
  {
    id: "qa",
    label: "QA & SDET-1 Automation",
    shortLabel: "QA / SDET",
    path: "/jobs/fresher/qa-testing",
    defaultCTC: 6.0,
    startups: { range: "₹5.0 – ₹8.5 LPA", typical: "₹6.0L Base", companies: "Keka QA, Darwinbox SDET, Prolifics" },
    gccs: { range: "₹9.0 – ₹15.0 LPA", typical: "₹11.0L Base", companies: "ServiceNow QE, Qualcomm Test, Broadridge" },
    services: { range: "₹3.5 – ₹4.8 LPA", typical: "₹3.8L Base", companies: "Capgemini, Wipro Testing, ValueLabs" },
    criteria: "Test automation (Selenium / Playwright / Cypress, Java or Python) + API testing via Postman.",
  },
  {
    id: "intern",
    label: "Paid Tech Internships",
    shortLabel: "Internships",
    path: "/jobs/fresher/internships",
    defaultCTC: 3.6,
    isIntern: true,
    startups: { range: "₹20,000 – ₹45,000 / mo", typical: "₹25,000 / mo", companies: "Skyroot, Darwinbox, Keka, T-Hub Startups" },
    gccs: { range: "₹50,000 – ₹1,20,000 / mo", typical: "₹65,000 / mo", companies: "ServiceNow, Microsoft, Uber, Amazon" },
    services: { range: "₹10,000 – ₹18,000 / mo", typical: "₹12,000 / mo", companies: "Wipro Internship, Virtusa, Local agencies" },
    criteria: "Strong core CS fundamentals. 3–6 month performance leads to full-time Pre-Placement Offers (PPO).",
  },
  {
    id: "nontech",
    label: "Inside Sales & Business Dev (BDA)",
    shortLabel: "Non-Tech / Sales",
    path: "/jobs/fresher/non-tech",
    defaultCTC: 5.5,
    startups: { range: "₹4.5 – ₹7.5 LPA", typical: "₹4.5L Base + ₹2.5L Inc", companies: "NxtWave, Darwinbox SDR, Teachnook" },
    gccs: { range: "₹6.0 – ₹9.0 LPA", typical: "₹6.5L Base", companies: "Amazon Operations, Google Ops Center" },
    services: { range: "₹3.0 – ₹4.2 LPA", typical: "₹3.5L Base", companies: "Tech Mahindra BPS, Teleperformance" },
    criteria: "Fluent communication, CRM familiarity, and structured outreach pipeline understanding.",
  },
];

const LIVING_OPTIONS = [
  { id: "kphb_pg", label: "Sharing PG in KPHB / Kukatpally", cost: 13000, desc: "₹8k Rent + ₹1.5k Metro + ₹3.5k Food & Misc" },
  { id: "madhapur_pg", label: "Sharing PG in Madhapur / Ayyappa", cost: 16500, desc: "₹11k Rent + ₹1k Commute + ₹4.5k Food & Misc" },
  { id: "gachibowli_flat", label: "Shared 2BHK/3BHK in Gachibowli", cost: 21500, desc: "₹14k Rent + ₹1.5k Commute + ₹6k Living" },
  { id: "home", label: "Living with Family in Hyderabad", cost: 4500, desc: "₹0 Rent + ₹1.5k Metro + ₹3k Personal Exp" },
];

const COLLEGE_TIERS = [
  {
    name: "Tier 1 (IIT / IIIT / BITS)",
    stat: "38% crack > ₹25 LPA",
    desc: "Global tech giants, HFTs, and day-0 on-campus shortlists with rigorous algorithmic interviews.",
  },
  {
    name: "Top Autonomous (CBIT, VNR, Vasavi, JNTU)",
    stat: "18% crack > ₹8 LPA",
    desc: "Top 15–18% enter product startups & GCCs (₹8–16 LPA); remaining 80%+ compete in mass IT or off-campus.",
  },
  {
    name: "General Engineering Colleges (Telangana)",
    stat: "55%+ compete off-campus",
    desc: "Requires 2+ deployed GitHub projects, DSA foundations, and direct ATS applications to land ₹6–10 LPA roles.",
  },
];

export default function FresherSalaryCalculator() {
  const [selectedRole, setSelectedRole] = useState(ROLES[0].id);
  const [customCTC, setCustomCTC] = useState(ROLES[0].defaultCTC);
  const [selectedLiving, setSelectedLiving] = useState(LIVING_OPTIONS[0].id);
  const [showRealityCheck, setShowRealityCheck] = useState(false);

  const role = useMemo(() => {
    return ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  }, [selectedRole]);

  const handleRoleChange = (id) => {
    setSelectedRole(id);
    const target = ROLES.find((r) => r.id === id);
    if (target) setCustomCTC(target.defaultCTC);
  };

  const living = useMemo(() => {
    return LIVING_OPTIONS.find((l) => l.id === selectedLiving) || LIVING_OPTIONS[0];
  }, [selectedLiving]);

  // Financial Math
  const { monthlyGross, monthlyInHand, monthlyTaxPF, monthlySavings, retentionPct } = useMemo(() => {
    if (role.isIntern) {
      const stipend = 25000;
      const expense = living.cost;
      const savings = Math.max(0, stipend - expense);
      return {
        monthlyGross: stipend,
        monthlyInHand: stipend,
        monthlyTaxPF: 0,
        monthlySavings: savings,
        retentionPct: Math.round((savings / stipend) * 100),
      };
    }

    const annual = Number(customCTC) * 100000;
    const gross = Math.round(annual / 12);
    // Standard Indian deductions: EPF (12% of basic ~6% of gross) + Telangana PT (₹200) + TDS
    const taxPF = gross > 125000 ? Math.round(gross * 0.20) : gross > 65000 ? Math.round(gross * 0.12) : 2200;
    const inHand = gross - taxPF;
    const savings = Math.max(0, inHand - living.cost);
    const retention = inHand > 0 ? Math.round((savings / inHand) * 100) : 0;

    return {
      monthlyGross: gross,
      monthlyInHand: inHand,
      monthlyTaxPF: taxPF,
      monthlySavings: savings,
      retentionPct: retention,
    };
  }, [customCTC, living.cost, role.isIntern]);

  return (
    <div className="fresher-tool-card" style={{ padding: "20px 22px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <div>
          <span className="fresher-tool-kicker" style={{ display: "inline-block", color: "var(--accent-primary, #ff5722)" }}>
            Interactive Salary &amp; Savings Benchmark
          </span>
          <h3 className="fresher-tool-title" style={{ margin: "2px 0 4px", fontSize: "17px" }}>
            Hyderabad Entry-Level Tech Pay &amp; Take-Home
          </h3>
          <p className="fresher-tool-sub" style={{ fontSize: "12.5px" }}>
            Real market packages across Product Startups, GCCs, and IT Services with estimated in-hand take-home.
          </p>
        </div>
        <Link
          href={role.path}
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--accent-primary, #ff5722)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 12px",
            borderRadius: "6px",
            background: "rgba(255, 87, 34, 0.08)",
          }}
        >
          View Live {role.shortLabel} Roles →
        </Link>
      </div>

      {/* Role Selector Pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {ROLES.map((r) => {
          const isActive = r.id === selectedRole;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => handleRoleChange(r.id)}
              style={{
                appearance: "none",
                border: isActive ? "1px solid var(--accent-primary, #ff5722)" : "1px solid var(--border-glass, #e2e8f0)",
                background: isActive ? "var(--accent-primary, #ff5722)" : "var(--bg-color, #ffffff)",
                color: isActive ? "#ffffff" : "var(--text-main)",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {r.shortLabel}
            </button>
          );
        })}
      </div>

      {/* 3-Tier Market Compensation Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        {/* Product Startups */}
        <div
          style={{
            background: "var(--bg-glass, rgba(0, 0, 0, 0.02))",
            border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.08))",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#059669", letterSpacing: "0.04em" }}>
              Product Startups
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{role.startups.typical}</span>
          </div>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-main)", margin: "2px 0 6px" }}>
            {role.startups.range}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.35 }}>
            <strong style={{ color: "var(--text-main)", fontWeight: 600 }}>Hirers:</strong> {role.startups.companies}
          </div>
        </div>

        {/* GCCs & Tech Giants */}
        <div
          style={{
            background: "rgba(2, 132, 199, 0.03)",
            border: "1px solid rgba(2, 132, 199, 0.18)",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#0284c7", letterSpacing: "0.04em" }}>
              GCCs &amp; Global Tech
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{role.gccs.typical}</span>
          </div>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-main)", margin: "2px 0 6px" }}>
            {role.gccs.range}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.35 }}>
            <strong style={{ color: "var(--text-main)", fontWeight: 600 }}>Hirers:</strong> {role.gccs.companies}
          </div>
        </div>

        {/* IT Services */}
        <div
          style={{
            background: "var(--bg-glass, rgba(0, 0, 0, 0.02))",
            border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.08))",
            borderRadius: "10px",
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
              IT Services
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{role.services.typical}</span>
          </div>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text-main)", margin: "2px 0 6px" }}>
            {role.services.range}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.35 }}>
            <strong style={{ color: "var(--text-main)", fontWeight: 600 }}>Hirers:</strong> {role.services.companies}
          </div>
        </div>
      </div>

      {/* Interactive Take-Home & Expense Estimator */}
      <div
        style={{
          background: "var(--surface-card, #ffffff)",
          border: "1px solid var(--border-glass, #e2e8f0)",
          borderRadius: "10px",
          padding: "14px 16px",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-main)" }}>
            Monthly In-Hand &amp; Hyderabad Living Expense Estimator
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="ctc-select" style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 500 }}>
              Package:
            </label>
            <select
              id="ctc-select"
              value={customCTC}
              onChange={(e) => setCustomCTC(Number(e.target.value))}
              style={{
                appearance: "none",
                background: "var(--bg-glass, rgba(0,0,0,0.02))",
                border: "1px solid var(--border-glass, #cbd5e1)",
                borderRadius: "6px",
                padding: "4px 24px 4px 8px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-main)",
                cursor: "pointer",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 6px center",
                backgroundSize: "10px",
              }}
            >
              <option value={4.2}>₹4.2 LPA (IT Services)</option>
              <option value={6.5}>₹6.5 LPA (Entry Startup)</option>
              <option value={8.5}>₹8.5 LPA (Standard Startup)</option>
              <option value={12.0}>₹12.0 LPA (Mid Scaleup)</option>
              <option value={16.0}>₹16.0 LPA (Tier-1 GCC Base)</option>
              <option value={22.0}>₹22.0 LPA (High-Tier GCC)</option>
            </select>
          </div>
        </div>

        {/* Expense Selector */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginBottom: "14px" }}>
          {LIVING_OPTIONS.map((l) => {
            const isSel = l.id === selectedLiving;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLiving(l.id)}
                style={{
                  appearance: "none",
                  textAlign: "left",
                  background: isSel ? "rgba(255, 87, 34, 0.05)" : "var(--bg-glass, rgba(0,0,0,0.01))",
                  border: isSel ? "1px solid var(--accent-primary, #ff5722)" : "1px solid var(--border-glass, #e2e8f0)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: isSel ? 700 : 500, color: "var(--text-main)" }}>
                    {l.label.split("(")[0]}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: isSel ? "var(--accent-primary, #ff5722)" : "var(--text-muted)" }}>
                    ₹{l.cost.toLocaleString("en-IN")}/mo
                  </span>
                </div>
                <span style={{ fontSize: "10.5px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                  {l.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Calculation Result Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px",
            background: "var(--bg-glass, rgba(0,0,0,0.02))",
            borderRadius: "8px",
            padding: "10px 14px",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Est. In-Hand
            </span>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#059669" }}>
              ₹{monthlyInHand.toLocaleString("en-IN")}<span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>/mo</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Living Expenses
            </span>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-main)" }}>
              ₹{living.cost.toLocaleString("en-IN")}<span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>/mo</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Net Savings
            </span>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#0284c7" }}>
              ₹{monthlySavings.toLocaleString("en-IN")}<span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>/mo</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Retention
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <div style={{ flex: 1, height: "6px", background: "var(--border-glass, #cbd5e1)", borderRadius: "3px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, retentionPct))}%`,
                    height: "100%",
                    background: retentionPct > 50 ? "#059669" : retentionPct > 25 ? "#0284c7" : "#eab308",
                    borderRadius: "3px",
                  }}
                />
              </div>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-main)" }}>{retentionPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hiring Requirement Snippet */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          fontSize: "11.5px",
          color: "var(--text-muted)",
          lineHeight: 1.4,
          padding: "8px 10px",
          borderRadius: "6px",
          background: "rgba(0,0,0,0.015)",
        }}
      >
        <span style={{ color: "var(--accent-primary, #ff5722)", fontWeight: 700 }}>Key Readiness:</span>
        <span>{role.criteria}</span>
      </div>

      {/* Expandable College Reality Check */}
      <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-glass, rgba(0,0,0,0.06))", paddingTop: "10px" }}>
        <button
          type="button"
          onClick={() => setShowRealityCheck((prev) => !prev)}
          style={{
            appearance: "none",
            background: "none",
            border: "none",
            padding: 0,
            fontSize: "11.5px",
            fontWeight: 600,
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>{showRealityCheck ? "▲ Hide" : "▼ View"} College Tier &amp; Placement Reality Check</span>
        </button>

        {showRealityCheck && (
          <div
            style={{
              marginTop: "10px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "8px",
            }}
          >
            {COLLEGE_TIERS.map((tier, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-glass, rgba(0,0,0,0.02))",
                  border: "1px solid var(--border-glass, #e2e8f0)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                  <strong style={{ fontSize: "11.5px", color: "var(--text-main)" }}>{tier.name}</strong>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669" }}>{tier.stat}</span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.35 }}>
                  {tier.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



