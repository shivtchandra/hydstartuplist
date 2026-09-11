import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebaseAdmin.js";
import { safeEvent } from "../../../lib/engagement.js";
export const dynamic = "force-dynamic";

async function persistEvent(event) {
  try {
    const db = await getAdminDb();
    if (!db) return;
    const ref = db.collection("engagement_sessions").doc(event.session);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const old = snap.data();
      const started = old?.started || Date.now();
      if (Date.now() - started > 1800000) return;

      // Page views: count per sanitized path (can fire multiple times).
      if (event.event === "page") {
        const pages = { ...(old?.pages || {}) };
        pages[event.path] = (pages[event.path] || 0) + 1;
        const events = { ...(old?.events || {}) };
        if (events.page === undefined) events.page = Date.now() - started;
        tx.set(
          ref,
          {
            started,
            expiresAt: new Date(started + 35 * 86400000),
            product: old?.product || event.product || "startups",
            variant: old?.variant || event.variant,
            device: old?.device || event.device,
            source: old?.source || event.source,
            events,
            pages,
          },
          { merge: true }
        );
        return;
      }

      // Funnel events: first occurrence only (existing behaviour).
      if (old?.events?.[event.event] !== undefined) return;
      tx.set(
        ref,
        {
          started,
          expiresAt: new Date(started + 35 * 86400000),
          product: old?.product || event.product || "startups",
          variant: old?.variant || event.variant,
          device: old?.device || event.device,
          source: old?.source || event.source,
          events: { ...old?.events, [event.event]: Date.now() - started },
        },
        { merge: true }
      );
    });
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
