"use client";

import { useEffect, useState } from "react";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signOut as firebaseSignOut
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { readShortlist, writeShortlist } from "./shortlist.js";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getClientApp() {
  if (!firebaseConfig.apiKey) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getClientAuth() {
  const app = getClientApp();
  return app ? getAuth(app) : null;
}

function getClientDb() {
  const app = getClientApp();
  return app ? getFirestore(app) : null;
}

export function useAuthUser() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      setReady(true);
      return undefined;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  return { user, ready };
}

export async function signInWithGoogle() {
  const auth = getClientAuth();
  if (!auth) throw new Error("Sign-in is not configured yet.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  await mergeShortlistToCloud(cred.user.uid);
  return cred.user;
}

export async function signOutUser() {
  const auth = getClientAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

/** Merge local device shortlist with cloud; local wins on same job id if newer. */
export async function mergeShortlistToCloud(uid) {
  const db = getClientDb();
  if (!db || !uid) return readShortlist();
  const ref = doc(db, "user_shortlists", uid);
  const local = readShortlist();
  let remote = { jobs: {}, companies: [], searches: [] };
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) remote = snap.data() || remote;
  } catch {
    // Offline / rules — keep local only
    return local;
  }

  const jobs = { ...(remote.jobs || {}) };
  for (const [id, row] of Object.entries(local.jobs || {})) {
    const prev = jobs[id];
    if (!prev || String(row.at || "") >= String(prev.at || "")) jobs[id] = row;
  }
  const companies = [...new Set([...(remote.companies || []), ...(local.companies || [])])].slice(0, 100);
  const searches = [...(local.searches || []), ...(remote.searches || [])]
    .filter((s, i, arr) => i === arr.findIndex((x) => JSON.stringify(x.filters) === JSON.stringify(s.filters)))
    .slice(0, 20);

  const merged = { jobs, companies, searches };
  writeShortlist(merged);
  try {
    await setDoc(ref, { ...merged, updatedAt: new Date().toISOString() }, { merge: true });
  } catch {
    // Rules may block until configured — local still works
  }
  return merged;
}

export async function pushShortlistToCloud(uid, value) {
  const db = getClientDb();
  if (!db || !uid) return;
  try {
    await setDoc(
      doc(db, "user_shortlists", uid),
      { ...value, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch {
    /* ignore */
  }
}


/** Web OAuth client ID for Google One Tap (Firebase Console → Auth → Google → Web client ID). */
export function googleOneTapClientId() {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_GOOGLE_CLIENT_ID ||
    ""
  );
}

/** Complete sign-in from a Google ID token (One Tap / GIS). */
export async function signInWithGoogleIdToken(idToken) {
  const auth = getClientAuth();
  if (!auth) throw new Error("Sign-in is not configured yet.");
  if (!idToken) throw new Error("Missing Google credential.");
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  await mergeShortlistToCloud(cred.user.uid);
  return cred.user;
}

export function cancelGoogleOneTap() {
  try {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }
  } catch {}
}
