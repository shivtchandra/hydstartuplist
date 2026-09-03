"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase.js";

const SEEN_KEY = "hsm_intent_v1";

// Shown once per visitor, ~1.1s after the map paints — they see the product
// first, then get the ask. Job seekers (the bulk of LinkedIn traffic) get an
// email capture instead of bouncing; everyone else lands straight on the map.
export default function IntentModal({ jobsTotal = 0, hiringCount = 0 }) {
  const [step, setStep] = useState(null); // null | "intent" | "jobseeker"
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let seen = null;
    try {
      seen = window.localStorage.getItem(SEEN_KEY);
    } catch {
      seen = "1"; // storage blocked — don't nag
    }
    if (seen) return;
    const t = setTimeout(() => setStep("intent"), 1100);
    return () => clearTimeout(t);
  }, []);

  function markSeen(intent) {
    try {
      window.localStorage.setItem(SEEN_KEY, intent || "dismissed");
    } catch {
      /* storage blocked — modal reappears next visit, acceptable */
    }
  }

  function choose(intent) {
    markSeen(intent);
    if (intent === "jobseeker") {
      setStep("jobseeker");
      return;
    }
    setStep(null);
  }

  function close() {
    markSeen("dismissed");
    setStep(null);
  }

  async function subscribe(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("saving");
    try {
      await addDoc(collection(db, "subscribers"), {
        email: email.trim(),
        wantsJobAlerts: true,
        source: "intent-modal",
        createdAt: serverTimestamp(),
      });
      setStatus("done");
    } catch (err) {
      console.error("intent subscribe failed:", err);
      setStatus("error");
    }
  }

  if (!step) return null;

  return (
    <div className="im-overlay" role="dialog" aria-modal="true" aria-labelledby="im-title">
      <div className="im-card">
        <button className="im-close" onClick={close} aria-label="Close">×</button>

        {step === "intent" && (
          <>
            <div className="im-mark" aria-hidden="true">
              <svg viewBox="0 0 100 120" width="22" height="26" fill="none">
                <rect x="21" y="18" width="15" height="64" rx="3" fill="currentColor" />
                <rect x="21" y="42" width="58" height="15" rx="3" fill="currentColor" />
                <path d="M64 18 H79 V57 C79 63 77 68 73.5 72.5 L71.5 75 L69 111 L66.3 75.5 L64.3 72.8 C61 68.2 64 63.4 64 57 Z" fill="currentColor" />
                <circle cx="71.5" cy="40" r="7" fill="#ff5722" />
              </svg>
            </div>
            <h2 id="im-title" className="im-title">What brings you here?</h2>
            <p className="im-sub">Pick one — we&apos;ll point you at the right thing. Takes a second.</p>

            <div className="im-options">
              <button className="im-option" onClick={() => choose("jobseeker")}>
                <span className="im-option-body">
                  <span className="im-option-name">Looking for a job</span>
                  <span className="im-option-desc">Roles at Hyderabad startups</span>
                </span>
                <span className="im-option-arrow" aria-hidden="true">›</span>
              </button>

              <Link href="/submit" className="im-option" onClick={() => markSeen("founder")}>
                <span className="im-option-body">
                  <span className="im-option-name">Founder or operator</span>
                  <span className="im-option-desc">Add your startup to the map</span>
                </span>
                <span className="im-option-arrow" aria-hidden="true">›</span>
              </Link>

              <button className="im-option" onClick={() => choose("browsing")}>
                <span className="im-option-body">
                  <span className="im-option-name">Just exploring</span>
                  <span className="im-option-desc">Show me what&apos;s on the map</span>
                </span>
                <span className="im-option-arrow" aria-hidden="true">›</span>
              </button>
            </div>
          </>
        )}

        {step === "jobseeker" && status !== "done" && (
          <>
            <h2 id="im-title" className="im-title">Hyderabad startup jobs, every week</h2>
            <p className="im-sub">
              {jobsTotal > 0 ? (
                <><strong>{jobsTotal}</strong> open roles right now across {hiringCount || "dozens of"} hiring startups.</>
              ) : (
                <>Fresh roles from Hyderabad startups, straight to your inbox.</>
              )}
            </p>

            <ul className="im-points">
              <li><strong>Pulled from company career pages</strong> — not reposted job-board noise.</li>
              <li><strong>Hyderabad only</strong> — startups and GCCs, nothing irrelevant.</li>
              <li><strong>Apply early</strong> — new roles land before they hit the big boards.</li>
            </ul>

            <form className="im-form" onSubmit={subscribe}>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Your email"
                required
              />
              <button className="btn cmd-submit" type="submit" disabled={status === "saving"}>
                {status === "saving" ? "…" : "Get the alerts →"}
              </button>
            </form>
            {status === "error" && <p className="im-error">Couldn&apos;t save — try again.</p>}

            <button className="im-skip" onClick={close}>I just want to browse the map</button>
          </>
        )}

        {step === "jobseeker" && status === "done" && (
          <>
            <h2 id="im-title" className="im-title">You&apos;re in.</h2>
            <p className="im-sub">
              We&apos;ll email you when new Hyderabad startup roles land. Meanwhile — {jobsTotal || "all"} roles are open now.
            </p>
            <div className="im-done-actions">
              <Link href="/jobs" className="btn cmd-submit" onClick={close}>Browse jobs →</Link>
              <button className="im-skip" onClick={close}>Back to the map</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
