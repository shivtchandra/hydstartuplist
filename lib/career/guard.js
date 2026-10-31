// Shared request guard for the AI career routes: same-origin, body size cap,
// and a best-effort per-IP limit. The limiter lives in Worker isolate memory,
// so it only blunts bursts; a Cloudflare rate-limiting rule on /api/career/*
// is the durable cap.
import { NextResponse } from "next/server";
import { isAllowedOrigin } from "../same-origin.js";

const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();

function clientIp(req) {
  return req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "unknown";
}

export function rateLimited(req, bucket, max) {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

/** Returns { body } or { response } (an error response to return as-is). */
export async function readGuardedJson(req, { bucket, max, maxBytes }) {
  if (!isAllowedOrigin(req)) return { response: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  if (rateLimited(req, bucket, max)) {
    return { response: NextResponse.json({ error: "Too many requests. Try again in a few minutes.", code: "RATE_LIMITED" }, { status: 429 }) };
  }
  const text = await req.text();
  if (text.length > maxBytes) return { response: NextResponse.json({ error: "Request too large", code: "INPUT_TOO_LONG" }, { status: 413 }) };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { response: NextResponse.json({ error: "Invalid request" }, { status: 400 }) };
  }
}
