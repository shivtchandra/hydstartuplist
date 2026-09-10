"use client";

import { useState } from "react";
import { signInWithGoogle, signOutUser, useAuthUser } from "../../lib/auth-client.js";

/**
 * Quiet nav auth — never blocks browsing.
 * Signed-in: first name + explicit Log out (name alone was easy to miss).
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
    if (compact) {
      return (
        <span className="tn-auth-wrap tn-auth-signed">
          <button
            type="button"
            className="tn-auth tn-auth-out"
            onClick={onSignOut}
            disabled={busy}
            title={`${user.email || "Signed in"} — log out`}
            aria-label="Log out"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" width={22} height={22} />
            ) : (
              "Out"
            )}
          </button>
        </span>
      );
    }
    return (
      <span className="tn-auth-wrap tn-auth-signed">
        <span className="tn-auth-name" title={user.email || "Signed in"}>
          {label}
        </span>
        <button
          type="button"
          className="tn-auth tn-auth-out"
          onClick={onSignOut}
          disabled={busy}
          aria-label="Log out"
        >
          {busy ? "…" : "Log out"}
        </button>
      </span>
    );
  }

  return (
    <span className="tn-auth-wrap">
      <button type="button" className="tn-auth" onClick={onSignIn} disabled={busy}>
        {busy ? "…" : compact ? "In" : "Sign in"}
      </button>
      {err ? (
        <span className="tn-auth-err" role="status">
          {err}
        </span>
      ) : null}
    </span>
  );
}
