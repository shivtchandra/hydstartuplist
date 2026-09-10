"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { signInWithGoogle, signOutUser, useAuthUser } from "../../lib/auth-client.js";

/**
 * Quiet nav auth — name + editorial utility dropdown when signed in.
 * Never blocks browsing.
 */
export default function AuthButton({ compact = false }) {
  const { user, ready } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [user?.uid]);

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
    setOpen(false);
    try {
      await signOutUser();
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    const label = user.displayName?.split(" ")[0] || "Account";

    return (
      <span className={`tn-auth-wrap tn-auth-signed${open ? " is-open" : ""}`} ref={wrapRef}>
        <button
          type="button"
          className="tn-auth-trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          title={user.email || "Signed in"}
        >
          <span className="tn-auth-name">{label}</span>
          <span className="tn-auth-caret" aria-hidden="true">
            ▾
          </span>
        </button>

        <div
          id={menuId}
          className={`tn-auth-menu${open ? " is-open" : ""}`}
          role="menu"
          aria-hidden={!open}
        >
          <div className="tn-auth-menu-head" role="presentation">
            {label}
          </div>
          <div className="tn-auth-menu-rule" role="separator" />
          <Link
            href="/saved"
            className="tn-auth-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Saved
          </Link>
          <div className="tn-auth-menu-rule" role="separator" />
          <button
            type="button"
            className="tn-auth-menu-item tn-auth-menu-logout"
            role="menuitem"
            onClick={onSignOut}
            disabled={busy}
          >
            {busy ? "…" : "Logout"}
          </button>
        </div>
      </span>
    );
  }

  return (
    <span className="tn-auth-wrap" ref={wrapRef}>
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
