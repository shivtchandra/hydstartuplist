// Shared Firebase Admin accessor for server-only code (cron routes, store.js
// overlay, auth verification). Needs FIREBASE_SERVICE_ACCOUNT (a service-account
// JSON, stringified) — without it, callers should treat null as "not configured".
let cachedApp = null;

async function getAdminApp() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.HYD_BUILD_OFFLINE === "1") {
    return null;
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  if (!cachedApp) {
    cachedApp = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return cachedApp;
}

export async function getAdminDb() {
  const app = await getAdminApp();
  if (!app) return null;
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(app);
}

export async function getAdminAuth() {
  const app = await getAdminApp();
  if (!app) return null;
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(app);
}

/** Verify Firebase ID token from Authorization: Bearer <token>. Returns decoded claims or null. */
export async function verifyBearerIdToken(req) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const auth = await getAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(match[1].trim());
  } catch {
    return null;
  }
}
