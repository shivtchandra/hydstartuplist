"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signInWithGoogle, useAuthUser } from "../../lib/auth-client.js";
import { isLikelyMobileUa, promptGoogleOneTapNow } from "./GoogleOneTap.jsx";

const SNOOZE_KEY = "hyd-soft-login-snooze-until";
/** "Not now" only pauses briefly — show again next visit / after cooldown. */
const SNOOZE_MS = 60 * 60 * 1000;

function isSnoozed() {
  try {
    const until = Number(sessionStorage.getItem(SNOOZE_KEY) || "0");
    return until > Date.now();
  } catch {
    return false;
  }
}

/**
 * Soft sign-in for logged-out visitors.
 * Desktop: pairs with One Tap chip. Mobile: primary CTA (One Tap rarely appears).
 * Shows every visit unless user snoozes briefly.
 */
export default function SoftLoginBanner({ force = false }) {
  const { user, ready } = useAuthUser();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isLikelyMobileUa());
    try {
      // Migrate off old session-forever dismiss keys
      sessionStorage.removeItem("hyd-soft-login-dismiss");
      sessionStorage.removeItem("hyd-one-tap-dismiss");
    } catch {}
  }, []);

  useEffect(() => {
    if (!ready || user) {
      setShow(false);
      return;
    }
    // Always re-offer on member surfaces (saved / radar) even if snoozed.
    const memberSurface =
      force ||
      pathname.startsWith("/saved") ||
      pathname.startsWith("/radar");
    if (!memberSurface && isSnoozed()) {
      setShow(false);
      return;
    }
    setShow(true);
  }, [ready, user, force, pathname]);

  useEffect(() => {
    if (!show || user || mobile) return;
    let cancelled = false;
    (async () => {
      await promptGoogleOneTapNow();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [show, user, mobile, pathname]);

  if (!show || user) return null;

  async function onSignIn() {
    setBusy(true);
    setErr("");
    try {
      if (!mobile) {
        const tapped = await promptGoogleOneTapNow();
        if (tapped) {
          setBusy(false);
          return;
        }
      }
      await signInWithGoogle();
      setShow(false);
    } catch (e) {
      if (e?.code !== "auth/popup-closed-by-user") setErr("Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    try {
      sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      sessionStorage.removeItem("hyd-soft-login-dismiss");
      sessionStorage.removeItem("hyd-one-tap-dismiss");
    } catch {}
    setShow(false);
  }

  return (
    <aside
      className={`soft-login${mobile ? " soft-login-mobile" : ""}`}
      aria-label="Optional sign-in"
    >
      <div className="soft-login-copy">
        <strong>{mobile ? "Sign in with Google" : "Keep your shortlist across devices"}</strong>
        <p>
          {mobile
            ? "Tap below to sign in. Map and jobs stay free — sign-in syncs saves and unlocks Radar."
            : "Google may show your account in the corner, or use the button. Map and jobs stay free."}
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
      {err ? (
        <p className="soft-login-err" role="status">
          {err}
        </p>
      ) : null}
    </aside>
  );
}
