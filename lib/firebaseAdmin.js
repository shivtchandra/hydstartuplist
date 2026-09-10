// Shared Firebase Admin accessor for server-only code (cron routes, store.js
// overlay, auth verification). Needs FIREBASE_SERVICE_ACCOUNT (a service-account
// JSON, stringified) — without it, callers should treat null as "not configured".
let cachedApp = null;
let initFailed = false;

/**
 * Accepts raw Vercel/env pastes from .env.local (often wrapped in single quotes).
 */
export function parseServiceAccount(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  let s = String(raw).trim();
  // Strip wrapping quotes from copy-paste: '{"type":...}'
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"') && s.charAt(1) === "{")
  ) {
    s = s.slice(1, -1);
  }
  let parsed = JSON.parse(s);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  if (!parsed || typeof parsed !== "object" || !parsed.client_email) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not a service-account JSON object");
  }
  if (typeof parsed.private_key === "string") {
    // Expand literal \n only when PEM has no real newlines yet
    if (parsed.private_key.includes("BEGIN") && !parsed.private_key.includes("\n")) {
      parsed = {
        ...parsed,
        private_key: parsed.private_key.replace(/\\n/g, "\n"),
      };
    }
  }
  return parsed;
}

async function getAdminApp() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.HYD_BUILD_OFFLINE === "1") {
    return null;
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  if (initFailed) return null;
  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    if (!cachedApp) {
      const sa = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
      cachedApp = getApps().length
        ? getApps()[0]
        : initializeApp({ credential: cert(sa) });
    }
    return cachedApp;
  } catch (err) {
    initFailed = true;
    cachedApp = null;
    console.error("[firebaseAdmin] init failed:", err?.message || err);
    return null;
  }
}

export async function getAdminDb() {
  const app = await getAdminApp();
  if (!app) return null;
  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    return getFirestore(app);
  } catch (err) {
    console.error("[firebaseAdmin] firestore failed:", err?.message || err);
    return null;
  }
}

export async function getAdminAuth() {
  const app = await getAdminApp();
  if (!app) return null;
  try {
    const { getAuth } = await import("firebase-admin/auth");
    return getAuth(app);
  } catch (err) {
    console.error("[firebaseAdmin] auth failed:", err?.message || err);
    return null;
  }
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
