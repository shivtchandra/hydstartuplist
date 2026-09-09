"use client";

import { useState } from "react";
import { signInWithGoogle, signOutUser, useAuthUser } from "../../lib/auth-client.js";

/**
 * Quiet nav auth — never blocks browsing.
 * Organic conversion also happens via SoftLoginBanner / Google One Tap site-wide.
 */
export default function AuthButton({ compact = false }) {
  const { user, ready } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!ready) return null;

  async function onSignIn() {
    setBusy(true);
    setErr("");
    try {
      await signInWithGoogle();
    } catch (e) {
      setErr(e?.code === "auth/popup-closed-by-user" ? "" : "Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setBusy(true);
    try {
      await signOutUser();
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    const label = user.displayName?.split(" ")[0] || "Account";
    return (
      <button
        type="button"
        className="tn-auth tn-auth-in"
        onClick={onSignOut}
        disabled={busy}
        title={`${user.email || "Signed in"} — click to sign out`}
      >
        {compact ? (user.photoURL ? <img src={user.photoURL} alt="" width={22} height={22} /> : "Out") : label}
      </button>
    );
  }

  return (
    <span className="tn-auth-wrap">
      <button type="button" className="tn-auth" onClick={onSignIn} disabled={busy}>
        {busy ? "…" : compact ? "In" : "Sign in"}
      </button>
      {err ? <span className="tn-auth-err" role="status">{err}</span> : null}
    </span>
  );
}
