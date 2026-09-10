"use client";

import { useState } from "react";

const EARLY_FILTERS = { level: "early" };

/**
 * Email-first retention hook for /jobs/fresher.
 * Reuses POST /api/alerts — no Google required.
 */
export default function FresherAlertCta({ compact = false }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("Sending confirmation…");
    try {
      const r = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          filters: EARLY_FILTERS,
          frequency: "daily",
        }),
      });
      const d = await r.json().catch(() => ({}));
      setStatus(d.message || d.error || (r.ok ? "Check your email to confirm." : "Could not subscribe."));
    } catch {
      setStatus("Could not subscribe. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`fresher-alert${compact ? " fresher-alert--compact" : ""}`}
      aria-label="Fresher job email alerts"
    >
      <h2 className="fresher-alert__title">Email me new fresher roles</h2>
      <p className="fresher-alert__copy">
        Daily digest when new intern / early-career openings hit the map. Confirm your
        address to start — nothing is sent until you confirm, and quiet days stay quiet.
      </p>
      <form className="fresher-alert__form" onSubmit={onSubmit}>
        <input
          id="fresher-alert-email"
          type="email"
          name="email"
          aria-label="Email address"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="fresher-alert__btn" disabled={busy}>
          {busy ? "Sending…" : "Send confirmation"}
        </button>
      </form>
      {status ? (
        <p className="fresher-alert__status" role="status">
          {status}
        </p>
      ) : null}
    </section>
  );
}
