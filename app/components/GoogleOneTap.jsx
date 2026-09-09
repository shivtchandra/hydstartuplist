"use client";

import { useEffect, useRef } from "react";
import {
  cancelGoogleOneTap,
  googleOneTapClientId,
  signInWithGoogleIdToken,
  useAuthUser,
} from "../../lib/auth-client.js";
import { readShortlist } from "../../lib/shortlist.js";

const DISMISS_KEY = "hyd-one-tap-dismiss";
const SCRIPT_ID = "google-gsi-client";

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google?.accounts?.id));
      existing.addEventListener("error", () => reject(new Error("gsi load failed")));
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google?.accounts?.id);
    s.onerror = () => reject(new Error("gsi load failed"));
    document.head.appendChild(s);
  });
}

function shouldOfferOneTap(force) {
  try {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return false;
  } catch {}
  if (force) return true;
  try {
    const sl = readShortlist();
    const n = Object.keys(sl.jobs || {}).length + (sl.searches || []).length;
    if (n >= 1) return true;
  } catch {}
  // Light organic offer for return visits on jobs/saved paths only (handled by force from parents)
  return false;
}

/**
 * Google One Tap — account chip appears without clicking Sign in.
 * Does not block the map. Only prompts when user already has local saves,
 * or when a parent passes force (e.g. /saved).
 */
export default function GoogleOneTap({ force = false }) {
  const { user, ready } = useAuthUser();
  const prompted = useRef(false);

  useEffect(() => {
    if (!ready || user) {
      cancelGoogleOneTap();
      return undefined;
    }
    const clientId = googleOneTapClientId();
    if (!clientId) return undefined;
    if (!shouldOfferOneTap(force)) return undefined;
    if (prompted.current) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const accountsId = await loadGsiScript();
        if (cancelled || !accountsId) return;

        accountsId.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              if (!response?.credential) return;
              await signInWithGoogleIdToken(response.credential);
            } catch (err) {
              console.warn("One Tap sign-in failed", err?.code || err?.message || err);
            }
          },
          auto_select: true,
          cancel_on_tap_outside: true,
          context: "use",
          itp_support: true,
          use_fedcm_for_prompt: true,
        });

        prompted.current = true;
        accountsId.prompt((notification) => {
          if (!notification) return;
          // User closed / suppressed — don't nag this session
          if (
            notification.isNotDisplayed?.() ||
            notification.isSkippedMoment?.() ||
            notification.isDismissedMoment?.()
          ) {
            try {
              if (notification.getDismissedReason?.() === "credential_returned") return;
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {}
          }
        });
      } catch (err) {
        console.warn("One Tap unavailable", err?.message || err);
      }
    })();

    return () => {
      cancelled = true;
      cancelGoogleOneTap();
    };
  }, [ready, user, force]);

  return null;
}

/** Call from banners to re-show One Tap if available; returns false if not configured. */
export async function promptGoogleOneTapNow() {
  const clientId = googleOneTapClientId();
  if (!clientId) return false;
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {}
  try {
    const accountsId = await loadGsiScript();
    if (!accountsId) return false;
    accountsId.prompt();
    return true;
  } catch {
    return false;
  }
}
