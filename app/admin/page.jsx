"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection, getDocs, deleteDoc, doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase.js";

const PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState("");
  const [nlPreview, setNlPreview] = useState(null);
  const [nlBusy, setNlBusy] = useState(false);
  const [nlResult, setNlResult] = useState(null);
  const [hiring, setHiring] = useState([]);
  const [hiringBusyId, setHiringBusyId] = useState(null);
  const [featuredReqs, setFeaturedReqs] = useState([]);
  const [frBusyId, setFrBusyId] = useState(null);

  async function loadFeatured() {
    try {
      const res = await fetch("/api/admin/featured", { headers: { "x-admin-passcode": PASSCODE } }).then((r) => r.json());
      setFeaturedReqs(res.requests || []);
    } catch (e) {
      setNote((n) => n || "Featured requests load failed: " + e.message);
    }
  }

  async function setFeaturedStatus(item, status) {
    setFrBusyId(item.id);
    try {
      await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": PASSCODE },
        body: JSON.stringify({ id: item.id, status }),
      });
      setFeaturedReqs((rs) => rs.map((x) => (x.id === item.id ? { ...x, status } : x)));
    } catch (e) {
      setNote("Featured update failed: " + e.message);
    } finally {
      setFrBusyId(null);
    }
  }

  async function loadHiring() {
    try {
      const res = await fetch("/api/admin/hiring", { headers: { "x-admin-passcode": PASSCODE } }).then((r) => r.json());
      setHiring(res.results || []);
    } catch (e) {
      setNote((n) => n || "Hiring results load failed: " + e.message);
    }
  }

  async function toggleHiringHidden(item) {
    setHiringBusyId(item.id);
    try {
      await fetch("/api/admin/hiring", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": PASSCODE },
        body: JSON.stringify({ id: item.id, hidden: !item.hiringHidden }),
      });
      setHiring((h) => h.map((x) => (x.id === item.id ? { ...x, hiringHidden: !x.hiringHidden } : x)));
    } catch (e) {
      setNote("Hide toggle failed: " + e.message);
    } finally {
      setHiringBusyId(null);
    }
  }

  async function loadNewsletterPreview() {
    try {
      const res = await fetch("/api/admin/newsletter", { headers: { "x-admin-passcode": PASSCODE } }).then((r) => r.json());
      setNlPreview(res);
    } catch (e) {
      setNlPreview({ note: "Preview failed: " + e.message });
    }
  }

  async function sendNewsletter() {
    if (!confirm(`Send the weekly digest to ${nlPreview?.subscriberCount ?? "all"} subscribers now?`)) return;
    setNlBusy(true);
    setNlResult(null);
    try {
      const res = await fetch("/api/admin/newsletter", { method: "POST", headers: { "x-admin-passcode": PASSCODE } }).then((r) => r.json());
      setNlResult(res);
    } catch (e) {
      setNlResult({ ok: false, note: "Send failed: " + e.message });
    } finally {
      setNlBusy(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "pending"), orderBy("createdAt", "desc")));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const aFeat = a.intent === "featured" || a.type === "featured_booking";
        const bFeat = b.intent === "featured" || b.type === "featured_booking";
        if (aFeat && bFeat) {
          const aPaid = a.paymentStatus === "paid" ? 0 : 1;
          const bPaid = b.paymentStatus === "paid" ? 0 : 1;
          if (aPaid !== bPaid) return aPaid - bPaid;
        }
        return 0;
      });
      setPending(rows);
    } catch (e) {
      setNote("Load failed: " + e.message);
    }
    try {
      const subRes = await fetch("/api/admin/subscribers", { headers: { "x-admin-passcode": PASSCODE } }).then((r) => r.json());
      setSubscribers(subRes.subscribers || []);
    } catch (e) {
      setNote((n) => n || "Subscribers load failed: " + e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authed) { load(); loadNewsletterPreview(); loadHiring(); loadFeatured(); }
  }, [authed]);

  async function approve(item) {
    setBusyId(item.id);
    setNote("");
    try {
      // Geocode + append to the in-code dataset (startups.json). No Firestore write.
      const res = await fetch("/api/startups/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }).then((r) => r.json());

      if (!res.ok) {
        setNote(`"${item.name}": ${res.reason || res.error || "could not approve"}. Fix the area and resubmit, or reject.`);
        setBusyId(null);
        return;
      }

      await deleteDoc(doc(db, "pending", item.id));
      setPending((p) => p.filter((x) => x.id !== item.id));
      setNote(
        res.claimed
          ? `Claim applied — ${item.name}'s listing updated (verified). ${res.total} total on the map.`
          : `Approved ${item.name} → placed at ${res.address}. Now live on the map (${res.total} total).`
      );
    } catch (e) {
      setNote("Approve failed: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function dismissFeatured(item) {
    if (!confirm(`Mark featured request for "${item.name}" as handled and remove from queue?`)) return;
    setBusyId(item.id);
    try {
      await deleteDoc(doc(db, "pending", item.id));
      setPending((p) => p.filter((x) => x.id !== item.id));
      setNote(`Handled featured request — ${item.name} (${item.days}d · ₹${(item.amount || 0).toLocaleString("en-IN")}).`);
    } catch (e) {
      setNote("Dismiss failed: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(item) {
    if (!confirm(`Reject and delete "${item.name}"?`)) return;
    setBusyId(item.id);
    try {
      await deleteDoc(doc(db, "pending", item.id));
      setPending((p) => p.filter((x) => x.id !== item.id));
    } catch (e) {
      setNote("Reject failed: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!authed) {
    return (
      <div className="form-page">
        <div className="form-card" style={{ maxWidth: 380 }}>
          <h1 className="form-title">Admin</h1>
          <p className="form-sub">Enter the passcode to review submissions.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code === PASSCODE && PASSCODE) { setAuthed(true); setNote(""); }
              else setNote("Wrong passcode.");
            }}
            className="form-grid"
          >
            <input type="password" placeholder="Passcode" value={code} onChange={(e) => setCode(e.target.value)} />
            {note && <div className="form-error">{note}</div>}
            <button className="btn cmd-submit" type="submit">Enter</button>
          </form>
          <Link className="form-back" href="/" style={{ marginTop: 12 }}>← Back to map</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1 className="form-title" style={{ margin: 0 }}>Pending submissions</h1>
          <p className="form-sub" style={{ margin: "2px 0 0" }}>{pending.length} awaiting review</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link className="btn btn-ghost" href="/">Map</Link>
        </div>
      </div>

      {note && <div className="admin-note">{note}</div>}

      {!loading && pending.length === 0 && <p className="form-sub">Nothing pending. All caught up.</p>}

      <div className="admin-list">
        {pending.map((item) => (
          <div key={item.id} className="admin-row">
            <div className="admin-info">
              <div className="admin-name">
                {item.name}
                {item.claimFor && <span className="admin-claim-badge">Claim</span>}
                {(item.intent === "featured" || item.type === "featured_booking") && (
                  <>
                    <span className="admin-claim-badge">Featured · {item.days}d · ₹{(item.amount || 0).toLocaleString("en-IN")}</span>
                    <span className={`admin-pay-badge ${item.paymentStatus === "paid" ? "is-paid" : "is-unpaid"}`}>
                      {item.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                    </span>
                    {item.status === "paid_pending_review" && (
                      <span className="admin-claim-badge">Awaiting activation</span>
                    )}
                  </>
                )}
              </div>
              <div className="tags">
                {item.sector && <span className="tag">{item.sector}</span>}
                {item.fundingStage && <span className="tag tag-stage">{item.fundingStage}</span>}
                {item.contactEmail && <span className="tag">{item.contactEmail}</span>}
              </div>
              <div className="admin-desc">
                {item.intent === "featured" || item.type === "featured_booking"
                  ? (item.notes || (
                      <em>
                        {item.paymentStatus === "paid"
                          ? "Featured booking — paid, activate Sponsored pin when ready"
                          : "Featured booking — unpaid (checkout incomplete or not configured)"}
                      </em>
                    ))
                  : (item.description || <em>no description</em>)}
              </div>
              <div className="admin-meta">
                {item.area || (item.startupId ? `startupId: ${item.startupId}` : null)}
                {item.website && <> · <a href={item.website} target="_blank" rel="noreferrer">{item.website.replace(/^https?:\/\//, "")}</a></>}
                {item.startPreference && <> · start {item.startPreference}</>}
                {(item.intent === "featured" || item.type === "featured_booking") && item.razorpayPaymentId && (
                  <> · pay {item.razorpayPaymentId}</>
                )}
              </div>
            </div>
            <div className="admin-actions">
              {item.intent === "featured" || item.type === "featured_booking" ? (
                <button
                  className="btn cmd-submit"
                  disabled={busyId === item.id}
                  onClick={() => dismissFeatured(item)}
                  title="Dismiss after you activate the Sponsored placement"
                >
                  {busyId === item.id ? "…" : "Mark handled"}
                </button>
              ) : (
                <button className="btn cmd-submit" disabled={busyId === item.id} onClick={() => approve(item)}>
                  {busyId === item.id ? "…" : "Approve"}
                </button>
              )}
              <button className="btn btn-ghost" disabled={busyId === item.id} onClick={() => reject(item)}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-head" style={{ marginTop: 32 }}>
        <div>
          <h2 className="form-title" style={{ margin: 0, fontSize: 20 }}>Featured pin requests (UPI)</h2>
          <p className="form-sub" style={{ margin: "2px 0 0" }}>
            {featuredReqs.filter((r) => r.status === "pending_verification").length} awaiting verification.
            Confirm the UPI transaction landed in your account, mark it Verified, then add the slot to
            data/placements.json.
          </p>
        </div>
      </div>

      {featuredReqs.length === 0 && <p className="form-sub">No featured requests yet.</p>}

      <div className="admin-list">
        {featuredReqs.map((r) => (
          <div key={r.id} className="admin-row">
            <div className="admin-info">
              <div className="admin-name">
                {r.name}
                {r.status === "verified" && <span className="admin-claim-badge">Verified</span>}
                {r.status === "rejected" && <span className="admin-stale-badge">Rejected</span>}
                {r.status === "pending_verification" && <span className="admin-stale-badge" style={{ background: "var(--accent-soft)", color: "var(--accent-primary)" }}>Pending</span>}
              </div>
              <div className="admin-meta">
                ₹{(r.amount ?? 0).toLocaleString("en-IN")} · {r.days} days
                {r.startupId && <> · id {r.startupId}</>}
                {r.createdAt && <> · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>}
              </div>
              <div className="admin-desc">
                UPI txn: <strong>{r.upiTxnId}</strong> → {r.upiVpa}
                {" · "}
                <a href={r.website} target="_blank" rel="noreferrer">{(r.website || "").replace(/^https?:\/\//, "")}</a>
                {" · "}{r.contactEmail}
                {r.notes && <> · {r.notes}</>}
              </div>
            </div>
            <div className="admin-actions">
              {r.status !== "verified" && (
                <button className="btn cmd-submit" disabled={frBusyId === r.id} onClick={() => setFeaturedStatus(r, "verified")}>
                  {frBusyId === r.id ? "…" : "Verify"}
                </button>
              )}
              {r.status !== "rejected" && (
                <button className="btn btn-ghost" disabled={frBusyId === r.id} onClick={() => setFeaturedStatus(r, "rejected")}>
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-head" style={{ marginTop: 32 }}>
        <div>
          <h2 className="form-title" style={{ margin: 0, fontSize: 20 }}>Hiring scraper results</h2>
          <p className="form-sub" style={{ margin: "2px 0 0" }}>
            {hiring.length} companies with a detected hiring result. Anything older than 7 days auto-hides from
            the public site; hide any wrong/stale one manually here too.
          </p>
        </div>
      </div>

      {hiring.length === 0 && <p className="form-sub">No scraper results yet — run check-hiring.</p>}

      <div className="admin-list">
        {hiring.map((h) => (
          <div key={h.id} className="admin-row">
            <div className="admin-info">
              <div className="admin-name">
                {h.name}
                {!h.fresh && <span className="admin-stale-badge">Stale</span>}
                {h.hiringHidden && <span className="admin-claim-badge" style={{ color: "var(--text-light)", background: "var(--border-subtle)" }}>Hidden</span>}
              </div>
              <div className="admin-meta">
                {h.hiring.count ?? h.hiring.roles?.length ?? 0} roles · via {h.hiring.source || "unknown"}
                {h.hiring.checkedAt && <> · checked {new Date(h.hiring.checkedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>}
              </div>
              {h.hiring.roles?.length > 0 && (
                <div className="admin-desc">{h.hiring.roles.slice(0, 3).map((r) => r.title).join(" · ")}</div>
              )}
            </div>
            <div className="admin-actions">
              <button className="btn btn-ghost" disabled={hiringBusyId === h.id} onClick={() => toggleHiringHidden(h)}>
                {hiringBusyId === h.id ? "…" : h.hiringHidden ? "Unhide" : "Hide"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-head" style={{ marginTop: 32 }}>
        <div>
          <h2 className="form-title" style={{ margin: 0, fontSize: 20 }}>Weekly newsletter</h2>
          <p className="form-sub" style={{ margin: "2px 0 0" }}>
            {nlPreview?.subscriberCount ?? "…"} subscriber{nlPreview?.subscriberCount === 1 ? "" : "s"} would receive this.
          </p>
        </div>
      </div>

      <div className="admin-newsletter-card">
        <div>
          {nlPreview?.digest && (
            <div>
              {nlPreview.digest.hiring.length} hiring picks · {nlPreview.digest.news.length} news items · {nlPreview.digest.total.toLocaleString()} startups tracked
            </div>
          )}
          {!nlPreview?.canSend && (
            <div className="admin-newsletter-preview" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
              RESEND_API_KEY isn't set yet — sending is a safe no-op until it is (nothing goes out, this just composes and logs).
            </div>
          )}
          {nlPreview?.note && <div className="admin-newsletter-preview" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>{nlPreview.note}</div>}
        </div>
        <button className="btn cmd-submit" disabled={nlBusy || !nlPreview} onClick={sendNewsletter}>
          {nlBusy ? "Sending…" : "Send now"}
        </button>
      </div>

      {nlResult && (
        <div className="admin-note" style={{ marginTop: 12 }}>
          {nlResult.ok
            ? `Sent to ${nlResult.sent} of ${nlResult.of ?? nlResult.sent} subscribers.${nlResult.note ? ` (${nlResult.note})` : ""}`
            : nlResult.note || "Send failed."}
        </div>
      )}

      <div className="admin-head" style={{ marginTop: 32 }}>
        <div>
          <h2 className="form-title" style={{ margin: 0, fontSize: 20 }}>Newsletter subscribers</h2>
          <p className="form-sub" style={{ margin: "2px 0 0" }}>{subscribers.length} subscribed</p>
        </div>
      </div>

      {!loading && subscribers.length === 0 && <p className="form-sub">No subscribers yet.</p>}

      <div className="admin-list">
        {subscribers.map((s) => (
          <div key={s.id} className="admin-row">
            <div className="admin-info">
              <div className="admin-name">{s.email}</div>
              <div className="admin-meta">
                {s.wantsJobAlerts ? "Wants job alerts" : "News only"}
                {s.source && <> · {s.source}</>}
                {s.createdAt && <> · {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
