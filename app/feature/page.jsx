"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FEATURED_PRICING,
  formatINR,
  quoteFeatured,
  featuredPricingTable,
} from "../../lib/featured-pricing.js";

const PRESETS = FEATURED_PRICING.packages;
const TABLE = featuredPricingTable();

// Manual UPI payment: buyer pays this VPA, then submits the UPI transaction id.
const UPI_VPA = "shivachandra9490-1@okaxis";
const UPI_PAYEE = "Hyderabad Startup Map";

/** "1 day" / "14 days" */
const nDays = (n) => `${n} day${Number(n) === 1 ? "" : "s"}`;

/** Build a upi:// intent link that pre-fills payee + amount in any UPI app. */
function upiLink(amount, note) {
  const p = new URLSearchParams({
    pa: UPI_VPA,
    pn: UPI_PAYEE,
    am: String(amount),
    cu: "INR",
    tn: note || "Featured pin",
  });
  return `upi://pay?${p.toString()}`;
}

function FeatureForm() {
  const params = useSearchParams();
  const prefillId = params.get("startupId") || params.get("id") || "";
  const prefillName = params.get("name") || "";

  const [form, setForm] = useState({
    name: prefillName,
    website: "",
    logoUrl: "",
    contactEmail: "",
    startupId: prefillId,
    startPreference: "",
    notes: "",
  });
  const [daysMode, setDaysMode] = useState(14);
  const [customDays, setCustomDays] = useState(21);
  const [status, setStatus] = useState("idle"); // idle | pay | saving | done | error
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const [upiTxnId, setUpiTxnId] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedDays = daysMode === "custom" ? customDays : daysMode;
  const quote = useMemo(() => quoteFeatured(selectedDays), [selectedDays]);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(UPI_VPA);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the VPA is shown for manual copy anyway */
    }
  }

  // Step 1: form submit — validate, then move to the UPI pay screen (no write yet;
  // we only record a request once the buyer says they've paid and gives a txn id).
  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.website.trim() || !form.contactEmail.trim()) {
      setError("Please fill startup name, website and contact email.");
      return;
    }
    setStatus("pay");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Step 2: buyer has paid via UPI and entered the transaction id — record it.
  async function submitTxn() {
    if (!upiTxnId.trim()) {
      setError("Enter the UPI transaction / reference ID from your payment app.");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/featured/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          website: form.website.trim(),
          logoUrl: form.logoUrl.trim() || null,
          contactEmail: form.contactEmail.trim(),
          startupId: form.startupId.trim() || null,
          days: quote.days,
          startPreference: form.startPreference || null,
          notes: form.notes.trim() || null,
          upiTxnId: upiTxnId.trim(),
        }),
      }).then((r) => r.json());

      if (!res.ok) {
        setError(res.error || "Could not submit your request. Try again.");
        setStatus("pay");
        return;
      }
      setConfirmed({ days: quote.days, display: quote.display, requestId: res.requestId });
      setStatus("done");
    } catch (err) {
      setError(err.message || "Could not submit. Try again.");
      setStatus("pay");
    }
  }

  if (status === "done") {
    return (
      <div className="form-page feature-page">
        <div className="form-card form-done">
          <div className="form-check">✓</div>
          <h2>Request received</h2>
          <p className="feature-confirm-line">
            {nDays(confirmed.days)} · {confirmed.display}
          </p>
          <p>
            Thanks — we&apos;ve got your payment details. We&apos;ll verify the UPI transaction and
            activate your Sponsored pin (max {FEATURED_PRICING.maxPins} featured pins). You&apos;ll hear
            from us at <strong>{form.contactEmail.trim()}</strong>.
          </p>
          {confirmed.requestId ? (
            <p className="feature-pay-note">Reference: {confirmed.requestId}</p>
          ) : null}
          <div className="feature-done-actions">
            <Link className="btn cmd-submit" href="/">
              ← Back to map
            </Link>
            <Link className="feature-link-muted" href="/submit">
              Free map listing instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "pay" || status === "saving") {
    const busy = status === "saving";
    return (
      <div className="form-page feature-page">
        <div className="form-card">
          <button type="button" className="form-back" onClick={() => setStatus("idle")}>
            ← Edit details
          </button>
          <h1 className="form-title">Pay by UPI</h1>
          <p className="form-sub">
            Pay <strong>{quote.display}</strong> for <strong>{form.name.trim()}</strong> ({nDays(quote.days)}),
            then enter your UPI transaction ID below. We verify it and activate your Sponsored pin.
          </p>

          <div className="upi-pay-box">
            <div className="upi-amount">
              <span className="upi-amount-kicker">Amount</span>
              <strong>{quote.display}</strong>
            </div>
            <div className="upi-vpa-row">
              <div className="upi-vpa">
                <span className="upi-vpa-label">Pay to UPI ID</span>
                <span className="upi-vpa-value">{UPI_VPA}</span>
              </div>
              <button type="button" className="btn btn-ghost upi-copy" onClick={copyVpa}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <a className="btn cmd-submit upi-app-btn" href={upiLink(quote.amount, `Featured ${quote.days}d`)}>
              Open UPI app to pay
            </a>
            <p className="upi-hint">
              On desktop? Open any UPI app (GPay / PhonePe / Paytm) on your phone, pay <strong>{quote.display}</strong> to
              the ID above, then come back and paste the transaction ID.
            </p>
          </div>

          <label className="field">
            <span>UPI transaction / reference ID *</span>
            <input
              placeholder="e.g. 4312xxxxxx or UTR from your UPI app"
              value={upiTxnId}
              onChange={(e) => setUpiTxnId(e.target.value)}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="btn cmd-submit" type="button" onClick={submitTxn} disabled={busy}>
            {busy ? "Submitting…" : "I've paid — submit for verification"}
          </button>
          <p className="feature-pay-note">
            No auto-charge. This just records that you paid {quote.display} to {UPI_VPA}; we confirm it manually
            before your pin goes live.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page feature-page">
      <div className="form-card">
        <Link className="form-back" href="/">
          ← Back to map
        </Link>
        <h1 className="form-title">Get featured on the map</h1>
        <p className="form-sub">
          Sponsored pin above free listings — larger marker, Sponsored badge, Featured shelf.
          Basic listings stay free. Limited inventory (max {FEATURED_PRICING.maxPins} featured pins).
        </p>

        <div className="feature-scarcity" role="note">
          Limited featured pins (max {FEATURED_PRICING.maxPins}) · Pay by UPI, we verify &amp; activate
        </div>

        <div className="feature-pricing-table" aria-label="Featured pin pricing">
          <div className="feature-pricing-head">
            <span>Duration</span>
            <span>Price</span>
            <span className="feature-pricing-per">Per day</span>
          </div>
          {TABLE.map((row) => (
            <div key={row.days} className="feature-pricing-row">
              <span>
                {row.label} · {nDays(row.days)}
              </span>
              <span className="feature-pricing-amt">{row.display}</span>
              <span className="feature-pricing-per">{row.perDay}</span>
            </div>
          ))}
          <div className="feature-pricing-foot">
            Custom length: {formatINR(FEATURED_PRICING.dailyRate)}/day (min {FEATURED_PRICING.minDays} day{FEATURED_PRICING.minDays === 1 ? "" : "s"})
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <fieldset className="feature-days-fieldset">
            <legend>How long should it run?</legend>
            <div className="feature-day-presets" role="group" aria-label="Duration packages">
              {PRESETS.map((p) => {
                const active = daysMode === p.days;
                const q = quoteFeatured(p.days);
                return (
                  <button
                    key={p.days}
                    type="button"
                    className={`feature-day-chip${active ? " is-active" : ""}`}
                    onClick={() => setDaysMode(p.days)}
                    aria-pressed={active}
                  >
                    <span className="fdc-label">{p.label}</span>
                    <span className="fdc-days">{nDays(p.days)}</span>
                    <span className="fdc-price">{q.display}</span>
                    {p.blurb ? <span className="fdc-blurb">{p.blurb}</span> : null}
                  </button>
                );
              })}
              <button
                type="button"
                className={`feature-day-chip${daysMode === "custom" ? " is-active" : ""}`}
                onClick={() => setDaysMode("custom")}
                aria-pressed={daysMode === "custom"}
              >
                <span className="fdc-label">Custom</span>
                <span className="fdc-days">Your length</span>
                <span className="fdc-price">{formatINR(FEATURED_PRICING.dailyRate)}/day</span>
              </button>
            </div>
            {daysMode === "custom" && (
              <label className="field feature-custom-days">
                <span>Number of days *</span>
                <input
                  type="number"
                  min={FEATURED_PRICING.minDays}
                  max={FEATURED_PRICING.maxDays}
                  value={customDays}
                  onChange={(e) => setCustomDays(Number(e.target.value) || FEATURED_PRICING.minDays)}
                  required
                />
              </label>
            )}
          </fieldset>

          <div className="feature-quote" aria-live="polite">
            <div className="feature-quote-main">
              <span className="feature-quote-kicker">Total due now</span>
              <strong className="feature-quote-amount">{quote.display}</strong>
            </div>
            <span className="feature-quote-meta">
              {nDays(quote.days)} · ~{formatINR(quote.effectiveDaily)}/day · INR · pay by UPI
            </span>
          </div>

          <label className="field">
            <span>Startup name *</span>
            <input
              placeholder="e.g. Zenoti"
              value={form.name}
              onChange={update("name")}
              required
            />
          </label>
          <label className="field">
            <span>Website *</span>
            <input
              type="url"
              placeholder="https://…"
              value={form.website}
              onChange={update("website")}
              required
            />
          </label>
          <label className="field">
            <span>Logo or product image URL (optional)</span>
            <input
              type="url"
              placeholder="https://…/logo.png"
              value={form.logoUrl}
              onChange={update("logoUrl")}
            />
          </label>
          <label className="field">
            <span>Contact email *</span>
            <input
              type="email"
              placeholder="you@company.com"
              value={form.contactEmail}
              onChange={update("contactEmail")}
              required
            />
          </label>
          <label className="field">
            <span>Existing map listing ID (optional)</span>
            <input
              placeholder="Paste startupId if you already have a pin"
              value={form.startupId}
              onChange={update("startupId")}
            />
          </label>
          <label className="field">
            <span>Preferred start date (optional)</span>
            <input
              type="date"
              value={form.startPreference}
              onChange={update("startPreference")}
            />
          </label>
          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              placeholder="Anything we should know?"
              value={form.notes}
              onChange={update("notes")}
              rows={2}
            />
          </label>

          {status === "error" && <div className="form-error">{error}</div>}

          <button className="btn cmd-submit" type="submit">
            Continue to UPI payment · {quote.display}
          </button>
          <p className="feature-pay-note">
            Next you&apos;ll pay {quote.display} by UPI and submit the transaction ID. We verify it and
            activate your Sponsored pin. Map listing itself stays free —{" "}
            <Link href="/submit">submit a basic pin</Link> anytime.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function FeaturePage() {
  return (
    <Suspense fallback={null}>
      <FeatureForm />
    </Suspense>
  );
}
