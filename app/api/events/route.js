import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin.js";
import { safeEvent } from "../../../lib/engagement.js";
import { FieldValue } from "firebase-admin/firestore";
export const dynamic = "force-dynamic";

async function persistEvent(event) {
  try {
    const db = await getAdminDb();
    if (!db) return;

    const started = event.started || Date.now();
    const age = Date.now() - started;
    if (age > 1800000 || age < 0) return;

    const offset = Math.max(0, Math.min(1800000, age));
    const ref = db.collection("engagement_sessions").doc(event.session);

    const basePayload = {
      started,
      expiresAt: new Date(started + 35 * 86400000),
      product: event.product || "startups",
      variant: event.variant || "new",
      device: event.device || "desktop",
      source: event.source || "other",
    };

    if (event.event === "page") {
      await ref.set(
        {
          ...basePayload,
          pages: {
            [event.path]: FieldValue.increment(1),
          },
          events: {
            page: offset,
          },
        },
        { merge: true }
      );
    } else {
      const payload = {
        ...basePayload,
        events: {
          [event.event]: offset,
        },
      };
      if (event.event === "google_login" && event.loginMethod) {
        payload.loginMethod = event.loginMethod;
      }
      await ref.set(payload, { merge: true });
    }
  } catch (err) {
    console.error("engagement write failed:", err?.message || err);
  }
}

export async function POST(req) {
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return new NextResponse(null, { status: 403 });
  }
  const raw = await req.text();
  if (raw.length > 1024) return new NextResponse(null, { status: 413 });
  let event;
  try {
    event = safeEvent(JSON.parse(raw));
  } catch {}
  if (!event) return new NextResponse(null, { status: 400 });

  // Do not block navigation/UI on Firestore — queue and return.
  void persistEvent(event);
  return new NextResponse(null, { status: 204 });
}
