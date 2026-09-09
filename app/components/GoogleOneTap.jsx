"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  cancelGoogleOneTap,
  googleOneTapClientId,
  signInWithGoogleIdToken,
  useAuthUser,
} from "../../lib/auth-client.js";

const SNOOZE_KEY = "hyd-one-tap-snooze-until";
const SCRIPT_ID = "google-gsi-client";
/** Explicit dismiss only snoozes briefly — user asked for prompt every visit. */
const SNOOZE_MS = 45 * 60 * 1000;

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

function isSnoozed() {
  try {
    const until = Number(sessionStorage.getItem(SNOOZE_KEY) || "0");
    return until > Date.now();
  } catch {
    return false;
  }
}

function snooze() {
  try {
    sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {}
}

/** One Tap is unreliable on iOS Safari / many mobile WebViews. */
export function isLikelyMobileUa() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );
}

/**
 * Google One Tap — desktop account chip (auto).
 * Mobile browsers rarely show One Tap; SoftLoginBanner covers that.
 * Re-prompts on each route while logged out (short snooze only if user closes chip).
 */
export default function GoogleOneTap({ force = false }) {
  const { user, ready } = useAuthUser();
  const pathname = usePathname();
  const lastPromptPath = useRef("");

  useEffect(() => {
    if (!ready || user) {
      cancelGoogleOneTap();
      return undefined;
    }
    const clientId = googleOneTapClientId();
    if (!clientId) return undefined;
    if (!force && isSnoozed()) return undefined;
    // Skip One Tap on mobile — it almost never paints; banner handles CTA.
    if (!force && isLikelyMobileUa()) return undefined;
    if (lastPromptPath.current === pathname) return undefined;

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
          context: "signin",
          itp_support: true,
          // FedCM often returns isNotDisplayed on mobile / locked-down browsers.
          use_fedcm_for_prompt: false,
        });

        lastPromptPath.current = pathname;
        accountsId.prompt((notification) => {
          if (!notification) return;
          if (notification.isDismissedMoment?.()) {
            const reason = notification.getDismissedReason?.();
            if (reason && reason !== "credential_returned") snooze();
          }
        });
      } catch (err) {
        console.warn("One Tap unavailable", err?.message || err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, force, pathname]);

  return null;
}

/** Call from banners to re-show One Tap if available; returns false if not configured / mobile. */
export async function promptGoogleOneTapNow() {
  const clientId = googleOneTapClientId();
  if (!clientId) return false;
  if (isLikelyMobileUa()) return false;
  try {
    sessionStorage.removeItem(SNOOZE_KEY);
    sessionStorage.removeItem("hyd-one-tap-dismiss");
  } catch {}
  try {
    const accountsId = await loadGsiScript();
    if (!accountsId) return false;
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
      context: "signin",
      itp_support: true,
      use_fedcm_for_prompt: false,
    });
    accountsId.prompt();
    return true;
  } catch {
    return false;
  }
}
