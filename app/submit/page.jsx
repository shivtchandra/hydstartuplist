"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase.js";

const SECTORS = ["AI", "Fintech", "Edtech", "Healthtech", "SaaS", "Gaming", "Logistics", "D2C", "Deeptech", "Consumer", "Other"];
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Growth", "Bootstrapped", "Public", "Recognised"];

function SubmitForm() {
  const params = useSearchParams();
  const claimFor = params.get("claim") || null;
  const claimName = params.get("name") || "";

  const [form, setForm] = useState({
    name: claimName, website: "", sector: "AI", fundingStage: "Seed", area: "", description: "", hiring: false,
  });
  const [status, setStatus] = useState("idle"); // idle | saving | done | error
  const [error, setError] = useState("");

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      await addDoc(collection(db, "pending"), {
        ...form,
        name: form.name.trim(),
        website: form.website.trim(),
        area: form.area.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        ...(claimFor ? { claimFor } : {}),
      });
      setStatus("done");
    } catch (err) {
      setError(err.message || "Could not submit. Try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="form-page">
        <div className="form-card form-done">
          <div className="form-check">✓</div>
          <h2>Submitted for review</h2>
          <p>
            {claimFor
              ? "Thanks! Your claim is pending review. Once approved, this listing will show your updates."
              : "Thanks! Your startup is now pending. Once approved it will appear on the map."}
          </p>
          <Link className="btn" href="/">Back to map</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-card">
        <Link className="form-back" href="/">← Back to map</Link>
        <h1 className="form-title">{claimFor ? `Claim "${claimName}"` : "Submit a startup"}</h1>
        <p className="form-sub">
          {claimFor
            ? "Update this listing's details. Changes are reviewed before they go live."
            : "Add a Hyderabad startup to the map. Submissions are reviewed before they go live."}
        </p>
        <form onSubmit={handleSubmit} className="form-grid">
          <label className="field">
            <span>Startup name *</span>
            <input
              placeholder="e.g. Zenoti"
              value={form.name}
              onChange={update("name")}
              readOnly={!!claimFor}
              required
            />
          </label>
          <label className="field">
            <span>Website</span>
            <input placeholder="https://…" value={form.website} onChange={update("website")} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Sector</span>
              <select value={form.sector} onChange={update("sector")}>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Funding stage</span>
              <select value={form.fundingStage} onChange={update("fundingStage")}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Area / locality *</span>
            <input placeholder="e.g. HITEC City, Hyderabad" value={form.area} onChange={update("area")} required />
          </label>
          <label className="field">
            <span>One-line description</span>
            <textarea placeholder="What does it do?" value={form.description} onChange={update("description")} rows={3} />
          </label>
          <label className="field-check">
            <input
              type="checkbox"
              checked={form.hiring}
              onChange={(e) => setForm({ ...form, hiring: e.target.checked })}
            />
            <span>We're currently hiring</span>
          </label>
          {status === "error" && <div className="form-error">{error}</div>}
          <button className="btn cmd-submit" type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Submitting…" : claimFor ? "Submit claim for review" : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={null}>
      <SubmitForm />
    </Suspense>
  );
}
