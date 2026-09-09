"use client";

import { useEffect, useState } from "react";
import { signInWithGoogle, useAuthUser } from "../../lib/auth-client.js";
import { readShortlist } from "../../lib/shortlist.js";
import { promptGoogleOneTapNow } from "./GoogleOneTap.jsx";

const DISMISS_KEY = "hyd-soft-login-dismiss";

/**
 * Organic login — prefer Google One Tap (account chip, no Login click).
 * Fallback: Continue with Google popup. Never walls the map.
 */
export default function SoftLoginBanner({ force = false }) {
  const { user, ready } = useAuthUser();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ready || user) {
      setShow(false);
      return;
    }
    try {
      if (!force && sessionStorage.getItem(DISMISS_KEY) === "1") {
        setShow(false);
        return;
      }
    } catch {}
    const sl = readShortlist();
    const savedCount = Object.keys(sl.jobs || {}).length + (sl.searches || []).length;
    setShow(force || savedCount >= 1);
  }, [ready, user, force]);

  // When banner becomes relevant, try One Tap automatically (no button click)
  useEffect(() => {
    if (!show || user) return;
    let cancelled = false;
    (async () => {
      const ok = await promptGoogleOneTapNow();
      if (cancelled || ok) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [show, user]);

  if (!show || user) return null;

  async function onSignIn() {
    setBusy(true);
    setErr("");
    try {
      const tapped = await promptGoogleOneTapNow();
      if (!tapped) await signInWithGoogle();
      setShow(false);
    } catch (e) {
      if (e?.code !== "auth/popup-closed-by-user") setErr("Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
      sessionStorage.setItem("hyd-one-tap-dismiss", "1");
    } catch {}
    setShow(false);
  }

  return (
    <aside className="soft-login" aria-label="Optional sign-in">
      <div className="soft-login-copy">
        <strong>Keep your shortlist across devices</strong>
        <p>
          If Google shows your account in the corner, tap it — no Login button needed. Map and jobs stay free either way.
        </p>
      </div>
      <div className="soft-login-actions">
        <button type="button" className="soft-login-primary" onClick={onSignIn} disabled={busy}>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        <button type="button" className="soft-login-dismiss" onClick={dismiss}>
          Not now
        </button>
      </div>
      {err ? <p className="soft-login-err" role="status">{err}</p> : null}
    </aside>
  );
}
