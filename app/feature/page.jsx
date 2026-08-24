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

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Checkout only runs in the browser"));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

function FeatureForm() {
  const params = useSearchParams();
  const prefillId = params.get("startupId") || params.get("id") || "";
  const prefillName = params.get("name") || "";

  const [form, setForm] = useState({
    name: prefillName,
    website: "",
    contactEmail: "",
    startupId: prefillId,
    startPreference: "",
    notes: "",
  });
  const [daysMode, setDaysMode] = useState(14);
  const [customDays, setCustomDays] = useState(21);
  const [status, setStatus] = useState("idle"); // idle | saving | checkout | done | unpaid | error
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  const selectedDays = daysMode === "custom" ? customDays : daysMode;
  const quote = useMemo(() => quoteFeatured(selectedDays), [selectedDays]);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function openCheckout(order) {
    await loadRazorpayScript();
    setStatus("checkout");

    return new Promise((resolve) => {
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency || "INR",
        name: "Hyderabad Startup Map",
        description: `Featured pin · ${order.days} days`,
        order_id: order.orderId,
        prefill: {
          name: form.name.trim(),
          email: form.contactEmail.trim(),
        },
        notes: {
          bookingId: order.bookingId,
        },
        theme: { color: "#1a1a1a" },
        handler: async (response) => {
          try {
            const verify = await fetch("/api/featured/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: order.bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            }).then((r) => r.json());

            if (!verify.ok) {
              setError(verify.error || "Payment received but verification failed. Contact us with your payment ID.");
              setConfirmed({
                days: order.days,
                amount: order.amount,
                display: order.display,
                bookingId: order.bookingId,
              });
              setStatus("unpaid");
              resolve("verify_failed");
              return;
            }

            setConfirmed({
              days: order.days,
              amount: order.amount,
              display: order.display,
              bookingId: order.bookingId,
              paid: true,
            });
            setStatus("done");
            resolve("paid");
          } catch (err) {
            setError(err.message || "Verification failed");
            setConfirmed({
              days: order.days,
              amount: order.amount,
              display: order.display,
              bookingId: order.bookingId,
            });
            setStatus("unpaid");
            resolve("verify_error");
          }
        },
        modal: {
          ondismiss: () => {
            setConfirmed({
              days: order.days,
              amount: order.amount,
              display: order.display,
              bookingId: order.bookingId,
            });
            setBookingId(order.bookingId);
            setStatus("unpaid");
            setError("Payment was not completed. You can retry anytime — your booking is saved.");
            resolve("dismissed");
          },
        },
      });

      rzp.on("payment.failed", (resp) => {
        const desc = resp?.error?.description || "Payment failed";
        setError(desc);
        setConfirmed({
          days: order.days,
          amount: order.amount,
          display: order.display,
          bookingId: order.bookingId,
        });
        setBookingId(order.bookingId);
        setStatus("unpaid");
        resolve("failed");
      });

      rzp.open();
    });
  }

  async function createOrderAndPay({ retry = false } = {}) {
    setStatus("saving");
    setError("");
    const q = quoteFeatured(selectedDays);

    try {
      const payload = retry && bookingId
        ? { bookingId }
        : {
            name: form.name.trim(),
            website: form.website.trim(),
            contactEmail: form.contactEmail.trim(),
            startupId: form.startupId.trim() || null,
            days: q.days,
            startPreference: form.startPreference || null,
            notes: form.notes.trim() || null,
          };

      const res = await fetch("/api/featured/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res.alreadyPaid) {
        setConfirmed({
          days: q.days,
          amount: res.amount,
          display: formatINR(res.amount),
          bookingId: res.bookingId,
          paid: true,
        });
        setStatus("done");
        return;
      }

      if (!res.ok) {
        setError(
          res.configured === false
            ? res.error || "Payments are not configured yet. Please try again later."
            : res.error || "Could not start checkout."
        );
        // Keep retry screen if we already have a booking; otherwise show form error.
        setStatus(bookingId || (retry && confirmed) ? "unpaid" : "error");
        return;
      }

      setBookingId(res.bookingId);
      await openCheckout(res);
    } catch (err) {
      setError(err.message || "Could not start payment. Try again.");
      setStatus("error");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await createOrderAndPay({ retry: false });
  }

  async function handleRetry() {
    await createOrderAndPay({ retry: true });
  }

  if (status === "done" && confirmed?.paid) {
    return (
      <div className="form-page feature-page">
        <div className="form-card form-done">
          <div className="form-check">✓</div>
          <h2>Payment received</h2>
          <p className="feature-confirm-line">
            {confirmed.days} days · {confirmed.display}
          </p>
          <p>
            Thanks — your featured spot is paid and queued for review. We&apos;ll activate the Sponsored pin
            once availability is confirmed (max {FEATURED_PRICING.maxPins} featured pins).
          </p>
          {confirmed.bookingId ? (
            <p className="feature-pay-note">Reference: {confirmed.bookingId}</p>
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

  const showUnpaid =
    confirmed &&
    !confirmed.paid &&
    (status === "unpaid" || status === "saving" || status === "checkout");

  if (showUnpaid) {
    const busy = status === "saving" || status === "checkout";
    return (
      <div className="form-page feature-page">
        <div className="form-card form-done">
          <h2>Payment incomplete</h2>
          <p className="feature-confirm-line">
            {confirmed.days} days · {confirmed.display}
          </p>
          <p>
            Your booking is saved as unpaid. Complete payment to lock the featured request —
            limited inventory (max {FEATURED_PRICING.maxPins}).
          </p>
          {error && status === "unpaid" ? <div className="form-error">{error}</div> : null}
          <div className="feature-done-actions">
            <button className="btn cmd-submit" type="button" onClick={handleRetry} disabled={busy}>
              {status === "saving"
                ? "Creating order…"
                : status === "checkout"
                  ? "Waiting for payment…"
                  : `Retry payment · ${confirmed.display}`}
            </button>
            <Link className="feature-link-muted" href="/">
              ← Back to map
            </Link>
          </div>
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
          Limited featured pins (max {FEATURED_PRICING.maxPins}) · Pay securely via Razorpay on submit
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
                {row.label} · {row.days} days
              </span>
              <span className="feature-pricing-amt">{row.display}</span>
              <span className="feature-pricing-per">{row.perDay}</span>
            </div>
          ))}
          <div className="feature-pricing-foot">
            Custom length: {formatINR(FEATURED_PRICING.dailyRate)}/day (min {FEATURED_PRICING.minDays} days)
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
                    <span className="fdc-days">{p.days} days</span>
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
              {quote.days} days · ~{formatINR(quote.effectiveDaily)}/day · INR · Razorpay checkout
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

          <button
            className="btn cmd-submit"
            type="submit"
            disabled={status === "saving" || status === "checkout"}
          >
            {status === "saving"
              ? "Creating order…"
              : status === "checkout"
                ? "Waiting for payment…"
                : `Pay ${quote.display} · Get featured`}
          </button>
          <p className="feature-pay-note">
            You&apos;ll pay now via Razorpay. After payment we review and activate your Sponsored pin.
            Map listing itself stays free — <Link href="/submit">submit a basic pin</Link> anytime.
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
