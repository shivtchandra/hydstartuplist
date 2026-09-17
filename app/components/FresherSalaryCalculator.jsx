"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const ROLES = [
  { id: "sde", label: "Software Engineer (SDE-1 / Backend)", baseStartup: 8.5, baseGCC: 16.0, baseService: 4.2 },
  { id: "frontend", label: "Frontend / React Developer", baseStartup: 7.5, baseGCC: 14.0, baseService: 4.0 },
  { id: "data", label: "Data Analyst / Junior AI", baseStartup: 7.0, baseGCC: 13.5, baseService: 4.0 },
  { id: "qa", label: "QA & SDET-1 Tester", baseStartup: 5.8, baseGCC: 11.0, baseService: 3.8 },
  { id: "bda", label: "Non-Tech / Inside Sales (BDA)", baseStartup: 5.5, baseGCC: 7.5, baseService: 3.5 },
  { id: "intern", label: "Paid Intern (Pre-final / Final Year)", baseStartup: 3.6, baseGCC: 7.2, baseService: 2.4 },
];

const COLLEGES = [
  { id: "tier1", label: "Tier 1 (IIT / IIIT / BITS)", multiplier: 1.45 },
  { id: "tier2", label: "Top Autonomous (CBIT, VNR, Vasavi, JNTU)", multiplier: 1.15 },
  { id: "tier3", label: "Tier 3 Affiliated / General Engineering", multiplier: 1.0 },
];

const SKILL_LEVELS = [
  { id: "basic", label: "Basic (College coursework / beginner)", multiplier: 0.9 },
  { id: "intermediate", label: "Intermediate (2+ Deployed projects on GitHub)", multiplier: 1.1 },
  { id: "advanced", label: "Advanced (DSA LeetCode Medium+ & Full Stack Stack)", multiplier: 1.3 },
];

const LIVING_OPTIONS = [
  { id: "kphb_pg", label: "Sharing PG in KPHB / Kukatpally (Food incl.)", rent: 8000, metro: 1500, other: 3500 },
  { id: "madhapur_pg", label: "Sharing PG in Madhapur / Ayyappa Society", rent: 11000, metro: 1000, other: 4500 },
  { id: "gachibowli_flat", label: "Shared Flat in Gachibowli / Kondapur", rent: 14000, metro: 1500, other: 6000 },
  { id: "home", label: "Living with Family in Hyderabad", rent: 0, metro: 1500, other: 3000 },
];

export default function FresherSalaryCalculator() {
  const [roleId, setRoleId] = useState("sde");
  const [collegeId, setCollegeId] = useState("tier2");
  const [skillId, setSkillId] = useState("intermediate");
  const [livingId, setLivingId] = useState("kphb_pg");

  const result = useMemo(() => {
    const role = ROLES.find((r) => r.id === roleId) || ROLES[0];
    const college = COLLEGES.find((c) => c.id === collegeId) || COLLEGES[1];
    const skill = SKILL_LEVELS.find((s) => s.id === skillId) || SKILL_LEVELS[1];
    const living = LIVING_OPTIONS.find((l) => l.id === livingId) || LIVING_OPTIONS[0];

    // Estimated CTCs in Lakhs per annum
    const factor = college.multiplier * skill.multiplier;
    const startupCTC = Math.round(role.baseStartup * factor * 10) / 10;
    const gccCTC = Math.round(role.baseGCC * factor * 10) / 10;
    const serviceCTC = Math.round(role.baseService * (college.multiplier * 0.95) * 10) / 10;

    // Realistic target startup in-hand calculation
    const annualGross = startupCTC * 100000;
    const monthlyGross = Math.round(annualGross / 12);
    // Simple approximate deduction (PF 1800, Professional tax 200, basic slab)
    const monthlyTaxPF = monthlyGross > 50000 ? Math.round(monthlyGross * 0.08) : 2000;
    const monthlyInHand = monthlyGross - monthlyTaxPF;

    const totalLivingExpense = living.rent + living.metro + living.other;
    const monthlySavings = Math.max(0, monthlyInHand - totalLivingExpense);

    return {
      startupCTC,
      gccCTC,
      serviceCTC,
      monthlyGross,
      monthlyInHand,
      totalLivingExpense,
      monthlySavings,
      living,
    };
  }, [roleId, collegeId, skillId, livingId]);

  return (
    <div
      className="fresher-calculator-card"
      style={{
        background: "var(--bg-card, rgba(255, 255, 255, 0.75))",
        border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.1))",
        borderRadius: "14px",
        padding: "24px",
        margin: "24px 0",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "var(--text-main)" }}>
          🧮 Hyderabad Fresher Salary &amp; Reality Check Calculator (2026)
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
          Estimate your realistic CTC, monthly in-hand take-home, living expenses, and net savings in Hyderabad.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {/* Role Selector */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--text-main)" }}>
            1. Target Tech Role
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-glass, #cbd5e1)",
              background: "var(--bg-input, #fff)",
              fontSize: "13px",
              color: "var(--text-main)",
            }}
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* College Tier */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--text-main)" }}>
            2. College Category
          </label>
          <select
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-glass, #cbd5e1)",
              background: "var(--bg-input, #fff)",
              fontSize: "13px",
              color: "var(--text-main)",
            }}
          >
            {COLLEGES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Skill / Portfolio Level */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--text-main)" }}>
            3. Project &amp; Skill Level
          </label>
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-glass, #cbd5e1)",
              background: "var(--bg-input, #fff)",
              fontSize: "13px",
              color: "var(--text-main)",
            }}
          >
            {SKILL_LEVELS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Hyderabad Living Setup */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--text-main)" }}>
            4. Living &amp; PG Preference
          </label>
          <select
            value={livingId}
            onChange={(e) => setLivingId(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-glass, #cbd5e1)",
              background: "var(--bg-input, #fff)",
              fontSize: "13px",
              color: "var(--text-main)",
            }}
          >
            {LIVING_OPTIONS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Display */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.05)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          borderRadius: "10px",
          padding: "18px 20px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "14px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Expected Startup CTC
            </span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#059669" }}>
              ₹{result.startupCTC} LPA
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Tier-1 GCC: ₹{result.gccCTC}L | Service: ₹{result.serviceCTC}L
            </div>
          </div>

          <div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Est. Monthly In-Hand
            </span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-main)" }}>
              ₹{result.monthlyInHand.toLocaleString("en-IN")} / mo
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Gross: ₹{result.monthlyGross.toLocaleString("en-IN")}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Hyd Living Expense
            </span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#e11d48" }}>
              - ₹{result.totalLivingExpense.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Rent + Metro + Food
            </div>
          </div>

          <div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Net Monthly Savings
            </span>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0284c7" }}>
              ₹{result.monthlySavings.toLocaleString("en-IN")} / mo
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              ~{Math.round((result.monthlySavings / result.monthlyInHand) * 100) || 0}% of in-hand
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "12px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
            ⚡ Ready to apply? Filter 100% verified direct company postings on our map.
          </p>
          <Link
            href="/jobs/fresher"
            style={{
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#fff",
              background: "var(--accent-primary, #ff5722)",
              padding: "6px 14px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            Find Matching Roles →
          </Link>
        </div>
      </div>
    </div>
  );
}
