"use client";

import { useState } from "react";
import Link from "next/link";
import { STAFFING_CONSULTANCY_DENYLIST } from "../../lib/job-content.js";

const VERIFIED_SAMPLE_EMPLOYERS = [
  { name: "Darwinbox", status: "verified", note: "Verified Enterprise SaaS Unicorn. Official ATS on Greenhouse / Darwinbox Careers. 0% fees." },
  { name: "Keka HR", status: "verified", note: "Verified SaaS Unicorn at DLF Cyber City. Direct ATS on Keka Portal. 0% fees." },
  { name: "Zenoti", status: "verified", note: "Verified Cloud Software Unicorn at Madhapur. Direct ATS. 0% fees." },
  { name: "HighRadius", status: "verified", note: "Verified Fintech SaaS Unicorn at HITEC City. Direct ATS. 0% fees." },
  { name: "Skyroot Aerospace", status: "verified", note: "Verified SpaceTech startup. Official ATS. 0% fees." },
  { name: "NxtWave", status: "verified", note: "Verified EdTech Scaleup at Financial District. Direct ATS on Freshteam. 0% fees." },
  { name: "Microsoft IDC", status: "verified", note: "Verified Tier-1 Tech Giant at Gachibowli. Official Microsoft Careers portal only." },
  { name: "ServiceNow", status: "verified", note: "Verified Global Enterprise Cloud at Knowledge City. Official ServiceNow Careers." },
  { name: "Google", status: "verified", note: "Verified Global Tech Giant at Financial District. Official Google Careers." },
  { name: "Amazon", status: "verified", note: "Verified Tech Giant at Mindspace / Financial District. Official Amazon.jobs only." },
];

export default function CompanyScamShield() {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState(null);

  function handleCheck(e) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;

    // 1. Check known denylist consultancies
    const isDenylisted = STAFFING_CONSULTANCY_DENYLIST.some((name) =>
      q.includes(name.toLowerCase()) || name.toLowerCase().includes(q)
    );

    if (isDenylisted) {
      setChecked({
        name: query,
        status: "consultancy",
        badge: "🟡 Staffing / Recruitment Agency",
        color: "#d97706",
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.3)",
        message:
          "This is a third-party staffing consultancy or recruitment agency. You may be placed on contractor payroll. Never pay any registration fees or document charges.",
      });
      return;
    }

    // 2. Check known Ameerpet scam phrases
    if (
      /ameerpet|maitrivanam|placement consultancy|100% placement|job guarantee|backdoor|proxy|experience letter/i.test(
        q
      )
    ) {
      setChecked({
        name: query,
        status: "danger",
        badge: "🔴 High Scam Risk / Paid Placement Warning",
        color: "#dc2626",
        bg: "rgba(239, 68, 68, 0.08)",
        border: "rgba(239, 68, 68, 0.3)",
        message:
          "Warning: Entities advertising paid job guarantees, proxy interviews, or fake experience letters carry severe risks. Corporate BGV (EPFO/26AS) triggers immediate termination and NASSCOM NSR blacklisting.",
      });
      return;
    }

    // 3. Check verified startups
    const verifiedMatch = VERIFIED_SAMPLE_EMPLOYERS.find((co) =>
      co.name.toLowerCase().includes(q) || q.includes(co.name.toLowerCase())
    );

    if (verifiedMatch) {
      setChecked({
        name: verifiedMatch.name,
        status: "verified",
        badge: "🟢 100% Verified Direct Employer",
        color: "#059669",
        bg: "rgba(16, 185, 129, 0.08)",
        border: "rgba(16, 185, 129, 0.3)",
        message: verifiedMatch.note,
      });
      return;
    }

    // 4. Default general guidance
    setChecked({
      name: query,
      status: "unknown",
      badge: "ℹ️ Unmapped / Needs Direct Verification",
      color: "var(--text-muted)",
      bg: "rgba(0, 0, 0, 0.04)",
      border: "var(--border-glass, #cbd5e1)",
      message:
        "Not in our local spam denylist, but verify that the company has a registered physical office in Hyderabad and applies directly via their official domain or ATS (Greenhouse/Lever/Zoho/Freshteam/Keka).",
    });
  }

  return (
    <div
      className="scam-shield-card"
      style={{
        background: "var(--bg-card, rgba(255, 255, 255, 0.75))",
        border: "1px solid var(--border-glass, rgba(0, 0, 0, 0.1))",
        borderRadius: "14px",
        padding: "24px",
        margin: "24px 0",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: "var(--text-main)" }}>
          🛡️ Hyderabad Recruiter &amp; Company Scam Shield
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
          Verify if an employer or recruiter message is a legitimate direct company, staffing agency, or fee-charging entity.
        </p>
      </div>

      <form onSubmit={handleCheck} style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter company or consultancy name (e.g. Darwinbox, Adecco, Keka, Randstad)..."
          style={{
            flex: "1 1 280px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid var(--border-glass, #cbd5e1)",
            background: "var(--bg-input, #fff)",
            fontSize: "13.5px",
            color: "var(--text-main)",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            background: "var(--accent-primary, #ff5722)",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Check Legitimacy
        </button>
      </form>

      {checked && (
        <div
          style={{
            background: checked.bg,
            border: `1px solid ${checked.border}`,
            borderRadius: "10px",
            padding: "16px",
            marginTop: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontWeight: 800, fontSize: "14px", color: checked.color }}>
              {checked.badge}
            </span>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--text-main)", lineHeight: 1.5 }}>
            {checked.message}
          </p>
          <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>
            Rule of thumb: Legitimate Hyderabad tech employers NEVER ask for money, training fees, or document security deposits.
          </p>
        </div>
      )}
    </div>
  );
}
