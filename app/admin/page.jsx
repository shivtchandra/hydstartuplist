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
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    if (authed) { load(); loadNewsletterPreview(); }
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
              </div>
              <div className="tags">
                <span className="tag">{item.sector}</span>
                <span className="tag tag-stage">{item.fundingStage}</span>
              </div>
              <div className="admin-desc">{item.description || <em>no description</em>}</div>
              <div className="admin-meta">
                {item.area}
                {item.website && <> · <a href={item.website} target="_blank" rel="noreferrer">{item.website.replace(/^https?:\/\//, "")}</a></>}
              </div>
            </div>
            <div className="admin-actions">
              <button className="btn cmd-submit" disabled={busyId === item.id} onClick={() => approve(item)}>
                {busyId === item.id ? "…" : "Approve"}
              </button>
              <button className="btn btn-ghost" disabled={busyId === item.id} onClick={() => reject(item)}>
                Reject
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
