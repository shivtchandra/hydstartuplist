import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { verifyWebhookSignature } from "../../../../lib/razorpay.js";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook (payment.captured / order.paid).
 * Configure URL: https://<host>/api/featured/webhook
 * Requires RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Webhook secret not configured" }, { status: 503 });
  }

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = event?.event || "";
  if (eventName !== "payment.captured" && eventName !== "order.paid") {
    return NextResponse.json({ ok: true, ignored: true, event: eventName });
  }

  const payEntity = event?.payload?.payment?.entity || null;
  const orderEntity = event?.payload?.order?.entity || null;
  const orderId = payEntity?.order_id || orderEntity?.id || null;
  const paymentId = payEntity?.id || null;
  const bookingId =
    payEntity?.notes?.bookingId ||
    orderEntity?.notes?.bookingId ||
    null;

  const db = await getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Firestore not configured" }, { status: 503 });
  }

  try {
    let ref = null;
    if (bookingId) {
      ref = db.collection("pending").doc(String(bookingId));
      const snap = await ref.get();
      if (!snap.exists) ref = null;
    }

    if (!ref && orderId) {
      const q = await db
        .collection("pending")
        .where("razorpayOrderId", "==", orderId)
        .limit(1)
        .get();
      if (!q.empty) ref = q.docs[0].ref;
    }

    if (!ref) {
      console.error("[featured/webhook] booking not found for order", orderId);
      return NextResponse.json({ ok: true, matched: false });
    }

    await ref.set(
      {
        paymentStatus: "paid",
        status: "paid_pending_review",
        ...(orderId ? { razorpayOrderId: orderId } : {}),
        ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        paymentSource: "webhook",
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, matched: true });
  } catch (err) {
    console.error("[featured/webhook]", err?.message || err);
    return NextResponse.json({ ok: false, error: "Webhook handler failed" }, { status: 500 });
  }
}
