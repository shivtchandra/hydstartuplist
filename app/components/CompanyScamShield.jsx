"use client";

import { useState } from "react";
import { STAFFING_CONSULTANCY_DENYLIST } from "../../lib/job-content.js";

const VERIFIED_SAMPLE_EMPLOYERS = [
  { name: "Darwinbox", note: "Verified Enterprise SaaS Unicorn. Official ATS on Greenhouse / Darwinbox Careers. 0% fees." },
  { name: "Keka HR", note: "Verified SaaS Unicorn at DLF Cyber City. Direct ATS on Keka Portal. 0% fees." },
  { name: "Zenoti", note: "Verified Cloud Software Unicorn at Madhapur. Direct ATS. 0% fees." },
  { name: "HighRadius", note: "Verified Fintech SaaS Unicorn at HITEC City. Direct ATS. 0% fees." },
  { name: "Skyroot Aerospace", note: "Verified SpaceTech startup. Official ATS. 0% fees." },
  { name: "NxtWave", note: "Verified EdTech Scaleup at Financial District. Direct ATS on Freshteam. 0% fees." },
  { name: "Microsoft IDC", note: "Verified Tier-1 Tech Giant at Gachibowli. Official Microsoft Careers portal only." },
  { name: "ServiceNow", note: "Verified Global Enterprise Cloud at Knowledge City. Official ServiceNow Careers." },
  { name: "Google", note: "Verified Global Tech Giant at Financial District. Official Google Careers." },
  { name: "Amazon", note: "Verified Tech Giant at Mindspace / Financial District. Official Amazon.jobs only." },
];

export default function CompanyScamShield() {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState(null);

  function handleCheck(e) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;

    const isDenylisted = STAFFING_CONSULTANCY_DENYLIST.some((name) =>
      q.includes(name.toLowerCase()) || name.toLowerCase().includes(q)
    );

    if (isDenylisted) {
      setChecked({
        status: "consultancy",
        badge: "Third-Party Staffing Agency",
        message:
          "Identified as a third-party recruitment agency or contractor staffing firm. Roles may sit on external client payroll. Legitimate agencies never charge candidate fees.",
      });
      return;
    }

    if (
      /ameerpet|maitrivanam|placement consultancy|100% placement|job guarantee|backdoor|proxy|experience letter/i.test(
        q
      )
    ) {
      setChecked({
        status: "danger",
        badge: "High Risk Entity Alert",
        message:
          "Entity patterns match commercial placement training or proxy services. Background verification (EPFO UAN / Form 26AS) at major firms results in immediate termination and NSR blacklisting.",
      });
      return;
    }

    const verifiedMatch = VERIFIED_SAMPLE_EMPLOYERS.find((co) =>
      co.name.toLowerCase().includes(q) || q.includes(co.name.toLowerCase())
    );

    if (verifiedMatch) {
      setChecked({
        status: "verified",
        badge: "Verified Direct Employer",
        message: verifiedMatch.note,
      });
      return;
    }

    setChecked({
      status: "unknown",
      badge: "Unindexed / Requires Direct ATS Check",
      message:
        "Not on our staffing denylist. Ensure application connects to a corporate domain or verified ATS portal (Greenhouse, Lever, Zoho, Freshteam, Keka).",
    });
  }

  return (
    <div className="fresher-tool-card">
      <div className="fresher-tool-header">
        <p className="fresher-tool-kicker">Security &amp; Verification</p>
        <h3 className="fresher-tool-title">Employer &amp; Recruiter Legitimacy Lookup</h3>
        <p className="fresher-tool-sub">
          Verify whether an employer listing or recruiter outreach corresponds to a direct Hyderabad tech company, a staffing consultancy, or a flagged commercial training entity.
        </p>
      </div>

      <form onSubmit={handleCheck} className="scam-shield-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter company or consultancy name (e.g. Darwinbox, Adecco, Keka, Randstad)..."
          className="scam-shield-input"
        />
        <button type="submit" className="scam-shield-btn">
          Verify Employer
        </button>
      </form>

      {checked && (
        <div className={`scam-result-box ${checked.status}`}>
          <div className="scam-result-badge">
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: checked.status === "verified" ? "#059669" : checked.status === "unknown" ? "#6b7280" : checked.status === "consultancy" ? "#d97706" : "#dc2626"
            }} />
            <span>{checked.badge}</span>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: "12.5px" }}>{checked.message}</p>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
            Standard policy: Legitimate Hyderabad tech employers never request registration fees, training deposits, or document payments.
          </p>
        </div>
      )}
    </div>
  );
}
