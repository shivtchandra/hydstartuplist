// Shared Firebase Admin accessor for server-only code (cron routes, store.js
// overlay, auth verification). Needs FIREBASE_SERVICE_ACCOUNT (a service-account
// JSON, stringified) — without it, callers should treat null as "not configured".
let firestoreSettingsApplied = false;
let cachedApp = null;
let initFailed = false;
let initError = null;

function finalizeServiceAccount(parsed) {
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

/**
 * Accepts raw Vercel/env pastes from .env.local (quotes, broken PEM newlines, etc.).
 */
export function parseServiceAccount(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return finalizeServiceAccount(raw);
  let s = String(raw).trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  // Strip wrapping quotes from copy-paste: '{"type":...}'
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"') && s.charAt(1) === "{")
  ) {
    s = s.slice(1, -1);
  }

  let parsed;
  try {
    parsed = JSON.parse(s);
  } catch (firstErr) {
    // Vercel UI often turns \n inside private_key into real newlines → invalid JSON.
    const repaired = s.replace(/("private_key"\s*:\s*")([\s\S]*?)("\s*,)/, (_m, a, key, b) => {
      const esc = key
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\n/g, "\\n");
      return a + esc + b;
    });
    try {
      parsed = JSON.parse(repaired);
    } catch {
      throw firstErr;
    }
  }
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return finalizeServiceAccount(parsed);
}

export function firebaseAdminInitError() {
  return initError;
}

async function getAdminApp() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.HYD_BUILD_OFFLINE === "1") {
    return null;
  }
  if (!(process.env.FIREBASE_SERVICE_ACCOUNT || "").trim()) return null;
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
    initError = String(err?.message || err).slice(0, 200);
    console.error("[firebaseAdmin] init failed:", initError);
    return null;
  }
}

export async function getAdminDb() {
  const app = await getAdminApp();
  if (!app) return null;
  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(app);
    // settings() may only run once per app lifetime. Under Next HMR / concurrent
    // requests, several callers can race past the flag — treat "already initialized"
    // as success so we still return a usable db (otherwise every later call fails).
    if (!firestoreSettingsApplied) {
      try {
        db.settings({ ignoreUndefinedProperties: true });
      } catch (err) {
        const msg = String(err?.message || err);
        if (!/already been initialized/i.test(msg)) throw err;
      }
      firestoreSettingsApplied = true;
    }
    return db;
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

let lastVerifyError = null;
/** Short reason the most recent verifyBearerIdToken call failed (for diagnostics). */
export function lastIdTokenError() {
  return lastVerifyError;
}

/** Verify Firebase ID token from Authorization: Bearer <token>. Returns decoded claims or null. */
export async function verifyBearerIdToken(req) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  // Library-free check first: firebase-admin init is unreliable on Vercel.
  try {
    const { verifyFirebaseIdToken } = await import("./id-token.js");
    return await verifyFirebaseIdToken(token);
  } catch (err) {
    lastVerifyError = err?.code || "verify-failed";
    console.warn("[auth] lite verify failed:", lastVerifyError);
  }
  for (const getAuthFn of [getAdminAuth, getTokenVerifierAuth]) {
    const auth = await getAuthFn();
    if (!auth) continue;
    try {
      return await auth.verifyIdToken(token);
    } catch (err) {
      console.warn("[firebaseAdmin] verifyIdToken failed:", err?.code || err?.message || err);
    }
  }
  return null;
}

let verifierApp = null;

/** ID-token verification needs only the project id (Google's public certs), not a
 *  service account, so sign-in checks keep working if FIREBASE_SERVICE_ACCOUNT is broken. */
async function getTokenVerifierAuth() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  try {
    const { initializeApp, getApps } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    if (!verifierApp) {
      verifierApp =
        getApps().find((a) => a.name === "id-token-verifier") ||
        initializeApp({ projectId }, "id-token-verifier");
    }
    return getAuth(verifierApp);
  } catch (err) {
    console.error("[firebaseAdmin] token verifier failed:", err?.message || err);
    return null;
  }
}
