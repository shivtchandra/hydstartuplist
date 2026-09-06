"use client";

import { useState } from "react";
import { trackEvent } from "../../lib/engagement-client.js";

export default function ShareJobButton({ url, title }) {
  const [note, setNote] = useState("");

  async function share() {
    const text = `${title} — Hyderabad role on Mapping HYD`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        trackEvent("share", "job-page");
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
      trackEvent("share", "job-page");
      window.setTimeout(() => setNote(""), 2000);
    } catch {
      setNote(url);
    }
  }

  return (
    <button type="button" className="btn btn-ghost job-share-btn" onClick={share}>
      {note || "Share"}
    </button>
  );
}
