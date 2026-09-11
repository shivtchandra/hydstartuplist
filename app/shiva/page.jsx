"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection, getDocs, deleteDoc, doc, query, orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase.js";

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
  const [approvedStartups, setApprovedStartups] = useState([]);
  const [approvedBusyId, setApprovedBusyId] = useState(null);
  const [showHiddenApproved, setShowHiddenApproved] = useState(false);
  const [approvedQuery, setApprovedQuery] = useState("");
  const [featuredReqs, setFeaturedReqs] = useState([]);
  const [frBusyId, setFrBusyId] = useState(null);
  const [placeOpenId, setPlaceOpenId] = useState(null);
  const [showPlacedFeatured, setShowPlacedFeatured] = useState(false);
  const [lastMapLink, setLastMapLink] = useState("");
  const [siteInfo, setSiteInfo] = useState({}); // requestId -> { preview, matches, loading }
  const [pf, setPf] = useState({ type: "featured", startupId: "", days: 14, startsAt: "", label: "Sponsored" });

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  async function fetchSite(item) {
    setSiteInfo((s) => ({ ...s, [item.id]: { loading: true } }));
    try {
      const res = await fetch(
        `/api/admin/site-preview?url=${encodeURIComponent(item.website || "")}&name=${encodeURIComponent(item.name || "")}`,
        { headers: { "x-admin-passcode": code } }
      ).then((r) => r.json());
      setSiteInfo((s) => ({ ...s, [item.id]: { ...res, loading: false } }));
    } catch (e) {
      setSiteInfo((s) => ({ ...s, [item.id]: { loading: false, error: e.message } }));
    }
  }

  function openPlace(item) {
    const matchedId = siteInfo[item.id]?.matches?.[0]?.id || "";
    setPlaceOpenId(item.id);
    setPf({
      type: "featured",
      startupId: item.placedStartupId || item.startupId || matchedId,
      days: item.days || 14,
      startsAt: today(),
      label: "Sponsored",
    });
    if (!siteInfo[item.id]) fetchSite(item);
  }

  async function activateSlot(item) {
    const matches = siteInfo[item.id]?.matches || [];
    const selectedMatch = matches.find((m) => m.id === pf.startupId.trim());
    if (pf.type === "featured" && !pf.startupId.trim()) {
      setNote("A startup ID is required to place a featured pin — use a matched startup below or paste an ID.");
      setLastMapLink("");
      return;
    }
    if (pf.type === "featured" && matches.length > 0 && !selectedMatch) {
      setNote("Use one of the matched map listing IDs before activating. The display name will not work as a startupId.");
      setLastMapLink("");
      return;
    }
    if (pf.type === "gcc" && !pf.startupId.trim()) {
      setNote("Enter the GCC id to spotlight.");
      setLastMapLink("");
      return;
    }
    setFrBusyId(item.id);
    try {
      const payload = {
        action: "activate",
        type: pf.type,
        days: Number(pf.days) || item.days || 14,
        startsAt: pf.startsAt || today(),
        label: pf.label || "Sponsored",
        requestId: item.id,
      };
      if (pf.type === "featured") payload.startupId = pf.startupId.trim();
      else if (pf.type === "gcc") payload.gccId = pf.startupId.trim();
      else payload.match = { companyIncludes: pf.startupId.trim() || item.name };

      const res = await fetch("/api/admin/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": code },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (!res.ok) {
        setNote("Activate failed: " + (res.error || "unknown"));
        setLastMapLink("");
        return;
      }
      setFeaturedReqs((rs) => rs.map((x) => (
        x.id === item.id
          ? { ...x, status: "placed", placedStartupId: pf.type === "featured" ? pf.startupId.trim() : x.placedStartupId }
          : x
      )));
      setPlaceOpenId(null);
      setLastMapLink(pf.type === "featured" ? `/?startup=${encodeURIComponent(pf.startupId.trim())}` : "");
      setNote(`Live — ${item.name} placed as ${pf.type} until ${new Date(res.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`);
    } catch (e) {
      setNote("Activate failed: " + e.message);
      setLastMapLink("");
    } finally {
      setFrBusyId(null);
    }
  }

  async function loadFeatured() {
    try {
      const res = await fetch("/api/admin/featured", { headers: { "x-admin-passcode": code } }).then((r) => r.json());
      const reqs = res.requests || [];
      setFeaturedReqs(reqs);
      // Fetch each site's details up front so the admin sees who they are
      // (logo + title + matched listing) without clicking into a request.
      reqs.forEach((it) => fetchSite(it));
    } catch (e) {
      setNote((n) => n || "Featured requests load failed: " + e.message);
    }
  }

  async function loadApprovedStartups() {
    try {
      const res = await fetch("/api/admin/startups", { headers: { "x-admin-passcode": code } }).then((r) => r.json());
      setApprovedStartups(res.startups || []);
    } catch (e) {
      setNote((n) => n || "Approved listings load failed: " + e.message);
    }
  }

  async function toggleStartupVisible(item) {
    const nextActive = item.active === false;
    setApprovedBusyId(item.id);
    setNote("");
    try {
      const res = await fetch("/api/admin/startups", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": code },
        body: JSON.stringify({ id: item.id, active: nextActive }),
      }).then((r) => r.json());
      if (!res.ok) {
        setNote("Listing visibility update failed: " + (res.error || "unknown"));
        return;
      }
      setApprovedStartups((xs) => xs.map((x) => (x.id === item.id ? { ...x, active: nextActive } : x)));
      setNote(nextActive ? `Visible again — ${item.name} is back on the map.` : `Hidden — ${item.name} is off the public map.`);
      setLastMapLink(nextActive ? `/?startup=${encodeURIComponent(item.id)}` : "");
    } catch (e) {
      setNote("Listing visibility update failed: " + e.message);
    } finally {
      setApprovedBusyId(null);
    }
  }

  async function setFeaturedStatus(item, status) {
    setFrBusyId(item.id);
    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": code },
        body: JSON.stringify({ id: item.id, status }),
      }).then((r) => r.json());
      if (!res.ok) {
        setNote("Featured update failed: " + (res.error || "unknown"));
        return;
      }
      setFeaturedReqs((rs) => rs.map((x) => (
        x.id === item.id
          ? {
              ...x,
              status,
              ...(status === "rejected" ? { placementVisible: false } : {}),
            }
          : x
      )));
      if (status === "rejected") {
        setNote(item.placedSlotId ? `Removed — ${item.name} is no longer visible on the map.` : `Rejected — ${item.name}.`);
        setLastMapLink("");
      }
    } catch (e) {
      setNote("Featured update failed: " + e.message);
    } finally {
      setFrBusyId(null);
    }
  }

  async function togglePlacementVisible(item) {
    if (!item.placedSlotId) {
      setNote("No placed slot found yet. Activate the slot once before toggling visibility.");
      setLastMapLink("");
      return;
    }
    const nextVisible = item.placementVisible === false;
    setFrBusyId(item.id);
    setNote("");
    try {
      const res = await fetch("/api/admin/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-passcode": code },
        body: JSON.stringify({
          action: nextVisible ? "show" : "deactivate",
          id: item.placedSlotId,
          requestId: item.id,
        }),
      }).then((r) => r.json());
      if (!res.ok) {
        setNote("Visibility toggle failed: " + (res.error || "unknown"));
        setLastMapLink("");
        return;
      }
      setFeaturedReqs((rs) => rs.map((x) => (
        x.id === item.id ? { ...x, placementVisible: nextVisible } : x
      )));
      setNote(nextVisible ? `Visible again — ${item.name} is back on the map.` : `Hidden — ${item.name} is no longer visible as Featured.`);
      setLastMapLink(nextVisible && (item.placedStartupId || item.startupId) ? `/?startup=${encodeURIComponent(item.placedStartupId || item.startupId)}` : "");
    } catch (e) {
      setNote("Visibility toggle failed: " + e.message);
      setLastMapLink("");
    } finally {
      setFrBusyId(null);
    }
  }

  async function loadHiring() {
    try {
      const res = await fetch("/api/admin/hiring", { headers: { "x-admin-passcode": code } }).then((r) => r.json());
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
        headers: { "Content-Type": "application/json", "x-admin-passcode": code },
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
      const res = await fetch("/api/admin/newsletter", { headers: { "x-admin-passcode": code } }).then((r) => r.json());
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
      const res = await fetch("/api/admin/newsletter", { method: "POST", headers: { "x-admin-passcode": code } }).then((r) => r.json());
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
      const subRes = await fetch("/api/admin/subscribers", { headers: { "x-admin-passcode": code } }).then((r) => r.json());
      setSubscribers(subRes.subscribers || []);
    } catch (e) {
      setNote((n) => n || "Subscribers load failed: " + e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authed) { load(); loadNewsletterPreview(); loadHiring(); loadFeatured(); loadApprovedStartups(); }
  }, [authed]);

  async function approve(item) {
    setBusyId(item.id);
    setNote("");
    setLastMapLink("");
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
      loadApprovedStartups();
      if (res.id) setLastMapLink(`/?startup=${encodeURIComponent(res.id)}`);
      setNote(
        res.claimed
          ? `Claim applied — ${item.name}'s listing updated (verified). ${res.total} total on the map.`
          : `Approved ${item.name} → placed at ${res.address}. Now live on the map (${res.total} total).`
      );
    } catch (e) {
      setNote("Approve failed: " + e.message);
      setLastMapLink("");
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
      setLastMapLink("");
    } catch (e) {
      setNote("Dismiss failed: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  const visibleFeaturedReqs = useMemo(
    () => (showPlacedFeatured ? featuredReqs : featuredReqs.filter((r) => r.status !== "placed")),
    [featuredReqs, showPlacedFeatured]
  );
  const visibleApprovedStartups = useMemo(() => {
    const base = showHiddenApproved ? approvedStartups : approvedStartups.filter((s) => s.active !== false);
    const q = approvedQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (s) =>
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.website || "").toLowerCase().includes(q) ||
        String(s.area || "").toLowerCase().includes(q) ||
        String(s.id || "").toLowerCase().includes(q)
    );
  }, [approvedStartups, showHiddenApproved, approvedQuery]);

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
          <h1 className="form-title">Ops</h1>
          <p className="form-sub">Enter the passcode to review submissions.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setNote("Checking…");
              try {
                const r = await fetch("/api/admin/startups", {
                  headers: { "x-admin-passcode": code },
                });
                if (!r.ok) throw new Error("unauthorized");
                setAuthed(true);
                setNote("");
              } catch {
                setNote("Wrong passcode.");
              }
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
          <button
            className="btn btn-ghost"
            onClick={() => {
              load();
              loadApprovedStartups();
              loadFeatured();
              loadHiring();
            }}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link className="btn btn-ghost" href="/shiva/sources">Funnel</Link>
          <Link className="btn btn-ghost" href="/">Map</Link>
        </div>
      </div>

      {note && (
        <div className="admin-note admin-note-row">
          <span>{note}</span>
          {lastMapLink && (
            <Link className="btn btn-ghost admin-note-link" href={lastMapLink}>
              View listing on map
            </Link>
          )}
        </div>
      )}

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
          <h2 className="form-title" style={{ margin: 0, fontSize: 20 }}>Approved listings</h2>
          <p className="form-sub" style={{ margin: "2px 0 0" }}>
            {approvedStartups.length.toLocaleString()} approved map listings.
            Hide removes a startup from the public map without deleting the approval record.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            type="search"
            placeholder="Search approved…"
            value={approvedQuery}
            onChange={(e) => setApprovedQuery(e.target.value)}
            style={{ minWidth: 200, maxWidth: 280 }}
            aria-label="Search approved listings"
          />
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={showHiddenApproved}
              onChange={(e) => setShowHiddenApproved(e.target.checked)}
            />
            <span>Show hidden</span>
          </label>
        </div>
      </div>

      {visibleApprovedStartups.length === 0 && (
        <p className="form-sub">
          {approvedStartups.length === 0 ? "No approved listings yet." : "Hidden approved listings are hidden."}
        </p>
      )}

      <div className="admin-list">
        {visibleApprovedStartups.slice(0, approvedQuery.trim() ? 200 : 80).map((s) => (
          <div key={s.id} className="admin-row">
            <div className="admin-info">
              <div className="admin-name">
                {s.name}
                {s.active === false && <span className="admin-stale-badge">Hidden</span>}
                {s.verified && <span className="admin-claim-badge">Verified</span>}
              </div>
              <div className="admin-meta">
                {s.sector} · {s.fundingStage} · {s.area}
                {s.addedAt && <> · approved {new Date(s.addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>}
              </div>
              <div className="admin-desc">
                <code>{s.id}</code>
                {s.website && <> · <a href={s.website} target="_blank" rel="noreferrer">{s.website.replace(/^https?:\/\//, "")}</a></>}
                {s.hiring && <> · hiring</>}
              </div>
            </div>
            <div className="admin-actions">
              {s.active !== false && (
                <Link className="btn btn-ghost" href={`/?startup=${encodeURIComponent(s.id)}`}>
                  View on map
                </Link>
              )}
              <button className="btn btn-ghost" disabled={approvedBusyId === s.id} onClick={() => toggleStartupVisible(s)}>
                {approvedBusyId === s.id ? "…" : s.active === false ? "Show on map" : "Hide from map"}
              </button>
            </div>
          </div>
        ))}
        {visibleApprovedStartups.length > (approvedQuery.trim() ? 200 : 80) && (
          <div className="sb-more">
            Showing {approvedQuery.trim() ? 200 : 80} of {visibleApprovedStartups.length.toLocaleString()} —
            search to find the rest.
          </div>
        )}
      </div>

      <div className="admin-head" style={{ marginTop: 32 }}>
        <div>
          <h2 className="form-title" style={{ margin: 0, fontSize: 20 }}>Featured pin requests (UPI)</h2>
          <p className="form-sub" style={{ margin: "2px 0 0" }}>
            {featuredReqs.filter((r) => r.status === "pending_verification").length} awaiting verification.
            Confirm the UPI transaction landed in your account → Verify → Place on map (picks the spot and
            goes live instantly, no redeploy).
          </p>
        </div>
        <label className="admin-toggle">
          <input
            type="checkbox"
            checked={showPlacedFeatured}
            onChange={(e) => setShowPlacedFeatured(e.target.checked)}
          />
          <span>Show placed</span>
        </label>
      </div>

      {visibleFeaturedReqs.length === 0 && (
        <p className="form-sub">
          {featuredReqs.length === 0 ? "No featured requests yet." : "Placed featured requests are hidden."}
        </p>
      )}

      <div className="admin-list">
        {visibleFeaturedReqs.map((r) => (
          <div key={r.id} className="admin-req-block">
            <div className="admin-row">
            <div className="admin-info">
              <div className="admin-name">
                {r.name}
                {r.status === "verified" && <span className="admin-claim-badge">Verified</span>}
                {r.status === "rejected" && <span className="admin-stale-badge">Rejected</span>}
                {r.status === "placed" && r.placementVisible === false && <span className="admin-stale-badge">Hidden</span>}
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
                {r.logoUrl && (
                  <>
                    {" · "}
                    <a href={r.logoUrl} target="_blank" rel="noreferrer">submitted logo</a>
                  </>
                )}
                {" · "}{r.contactEmail}
                {r.notes && <> · {r.notes}</>}
              </div>

              {/* Fetched site identity — shown up front so you can vet them. */}
              {siteInfo[r.id]?.loading && <div className="admin-site-mini-loading">Fetching site details…</div>}
              {siteInfo[r.id]?.preview && (
                <div className="admin-site-mini">
                  <img
                    className="admin-site-favicon"
                    src={`https://www.google.com/s/2/favicons?sz=64&domain_url=${encodeURIComponent(r.website || "")}`}
                    alt=""
                  />
                  <div className="admin-site-mini-body">
                    <div className="admin-site-mini-title">{siteInfo[r.id].preview.title || r.name}</div>
                    {siteInfo[r.id].preview.description && (
                      <div className="admin-site-mini-desc">{siteInfo[r.id].preview.description}</div>
                    )}
                    {siteInfo[r.id].matches?.length > 0 && (
                      <div className="admin-site-mini-match">
                        On map as: {siteInfo[r.id].matches.map((m) => m.name).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="admin-actions">
              {r.status === "pending_verification" && (
                <button className="btn cmd-submit" disabled={frBusyId === r.id} onClick={() => setFeaturedStatus(r, "verified")}>
                  {frBusyId === r.id ? "…" : "Verify"}
                </button>
              )}
              {(r.status === "verified" || r.status === "placed") && (
                <button className="btn cmd-submit" disabled={frBusyId === r.id} onClick={() => (placeOpenId === r.id ? setPlaceOpenId(null) : openPlace(r))}>
                  {r.status === "placed" ? "Placed ✓ · edit" : placeOpenId === r.id ? "Close" : "Place on map"}
                </button>
              )}
              {r.status === "placed" && (
                <button className="btn btn-ghost" disabled={frBusyId === r.id} onClick={() => togglePlacementVisible(r)}>
                  {r.placementVisible === false ? "Show on map" : "Hide from map"}
                </button>
              )}
              {r.status === "placed" && siteInfo[r.id]?.matches?.some((m) => m.id === (r.placedStartupId || r.startupId)) && (
                <Link className="btn btn-ghost" href={`/?startup=${encodeURIComponent(r.placedStartupId || r.startupId)}`}>
                  View on map
                </Link>
              )}
              {r.status === "placed" && (
                <button className="btn btn-ghost" disabled={frBusyId === r.id} onClick={() => setFeaturedStatus(r, "rejected")}>
                  Remove from map
                </button>
              )}
              {r.status !== "rejected" && r.status !== "placed" && (
                <button className="btn btn-ghost" disabled={frBusyId === r.id} onClick={() => setFeaturedStatus(r, "rejected")}>
                  Reject
                </button>
              )}
            </div>
            </div>

            {placeOpenId === r.id && (
          <div className="place-panel">
            {/* Who are they — fetched from their site + startup matches */}
            <div className="place-site">
              {siteInfo[r.id]?.loading && <span className="form-sub">Fetching {(r.website || "").replace(/^https?:\/\//, "")}…</span>}
              {siteInfo[r.id]?.preview && (
                <div className="place-site-card">
                  {siteInfo[r.id].preview.image && (
                    <img src={siteInfo[r.id].preview.image} alt="" className="place-site-img" />
                  )}
                  <div>
                    <div className="place-site-title">{siteInfo[r.id].preview.title || r.name}</div>
                    {siteInfo[r.id].preview.description && (
                      <div className="place-site-desc">{siteInfo[r.id].preview.description}</div>
                    )}
                  </div>
                </div>
              )}
              {siteInfo[r.id]?.matches?.length > 0 && (
                <div className="place-matches">
                  <span className="form-sub">Matched map listings — click to use its ID:</span>
                  {siteInfo[r.id].matches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`place-match-chip${pf.startupId === m.id ? " is-selected" : ""}`}
                      onClick={() => setPf((p) => ({ ...p, startupId: m.id }))}
                    >
                      {m.name} <code>{m.id.slice(0, 8)}</code>
                    </button>
                  ))}
                </div>
              )}
              {siteInfo[r.id] && !siteInfo[r.id].loading && !siteInfo[r.id].matches?.length && (
                <span className="form-sub">No existing map listing matched — they may need a free /submit first, then paste that ID.</span>
              )}
            </div>

            {/* Where to place them */}
            <div className="place-grid">
              <label className="field">
                <span>Spot</span>
                <select value={pf.type} onChange={(e) => setPf((p) => ({ ...p, type: e.target.value }))}>
                  <option value="featured">Featured pin (map)</option>
                  <option value="gcc">GCC hiring spotlight</option>
                  <option value="jobBoost">Sponsored job boost</option>
                </select>
              </label>
              <label className="field">
                <span>{pf.type === "featured" ? "Matched startup ID" : pf.type === "gcc" ? "GCC ID" : "Company match"}</span>
                <input
                  value={pf.startupId}
                  onChange={(e) => setPf((p) => ({ ...p, startupId: e.target.value }))}
                  placeholder={pf.type === "featured" ? "Click a matched listing above" : pf.type === "gcc" ? "gccId" : "company name to boost"}
                />
              </label>
              <label className="field">
                <span>Start</span>
                <input type="date" value={pf.startsAt} onChange={(e) => setPf((p) => ({ ...p, startsAt: e.target.value }))} />
              </label>
              <label className="field">
                <span>Days</span>
                <input type="number" min={1} value={pf.days} onChange={(e) => setPf((p) => ({ ...p, days: Number(e.target.value) || 1 }))} />
              </label>
            </div>
            <button className="btn cmd-submit" disabled={frBusyId === r.id} onClick={() => activateSlot(r)}>
              {frBusyId === r.id ? "Activating…" : "Activate slot — goes live now"}
            </button>
          </div>
        )}
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
