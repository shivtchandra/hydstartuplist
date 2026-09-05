// Shared Firebase Admin accessor for server-only code (cron routes, store.js
// overlay). Needs FIREBASE_SERVICE_ACCOUNT (a service-account JSON, stringified)
// set as an env var — without it, callers should treat a null return as
// "feature not configured yet" and no-op, not throw.
let cachedApp = null;

export async function getAdminDb() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.HYD_BUILD_OFFLINE === "1") return null;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (!cachedApp) {
    cachedApp = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getFirestore(cachedApp);
}
