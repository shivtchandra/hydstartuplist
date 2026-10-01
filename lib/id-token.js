// Firebase ID-token verification without firebase-admin.
// Checks the RS256 signature against Google's published securetoken certs and
// the standard claims (aud, iss, exp, iat, sub). Used because firebase-admin
// initialisation is unreliable on the Vercel runtime.
import crypto from "node:crypto";

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache = { certs: null, expiresAt: 0 };

async function getCerts() {
  if (certCache.certs && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL, { cache: "no-store" });
  if (!res.ok) throw Object.assign(new Error("certs fetch failed"), { code: "certs-unavailable" });
  const certs = await res.json();
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") || "")?.[1] || 3600);
  certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

function b64urlJson(part) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

/** Returns decoded claims, or throws an Error with a short `code`. */
export async function verifyFirebaseIdToken(token, projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  const fail = (code) => Object.assign(new Error(code), { code });
  if (!projectId) throw fail("no-project-id");
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw fail("malformed");

  let header, payload;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch {
    throw fail("malformed");
  }
  if (header.alg !== "RS256" || !header.kid) throw fail("bad-header");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw fail("wrong-audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw fail("wrong-issuer");
  if (typeof payload.exp !== "number" || payload.exp <= now - 60) throw fail("expired");
  if (typeof payload.iat !== "number" || payload.iat > now + 300) throw fail("issued-in-future");
  if (!payload.sub) throw fail("no-subject");

  const certs = await getCerts();
  const pem = certs[header.kid];
  if (!pem) throw fail("unknown-key");
  const ok = crypto
    .createVerify("RSA-SHA256")
    .update(`${parts[0]}.${parts[1]}`)
    .verify(pem, Buffer.from(parts[2], "base64url"));
  if (!ok) throw fail("bad-signature");

  return { ...payload, uid: payload.sub };
}
