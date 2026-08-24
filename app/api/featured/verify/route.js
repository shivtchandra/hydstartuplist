import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { razorpayConfigured, verifyPaymentSignature } from "../../../../lib/razorpay.js";

export const dynamic = "force-dynamic";

/**
 * Client-side checkout success → verify HMAC and mark booking paid.
 * Body: bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature
 */
export async function POST(req) {
  if (!razorpayConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Payments are not configured.", configured: false },
      { status: 503 }
    );
  }

  const db = await getAdminDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Booking backend not configured.", configured: false },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const bookingId = String(body.bookingId || "").trim();
  const orderId = String(body.razorpay_order_id || "").trim();
  const paymentId = String(body.razorpay_payment_id || "").trim();
  const signature = String(body.razorpay_signature || "").trim();

  if (!bookingId || !orderId || !paymentId || !signature) {
    return NextResponse.json({ ok: false, error: "Missing verification fields" }, { status: 400 });
  }

  const valid = await verifyPaymentSignature({ orderId, paymentId, signature });
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid payment signature" }, { status: 400 });
  }

  try {
    const ref = db.collection("pending").doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
    }
    const data = snap.data();
    if (data.razorpayOrderId && data.razorpayOrderId !== orderId) {
      return NextResponse.json({ ok: false, error: "Order mismatch" }, { status: 400 });
    }
    if (data.paymentStatus === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true, bookingId, paymentStatus: "paid" });
    }

    await ref.set(
      {
        paymentStatus: "paid",
        status: "paid_pending_review",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      bookingId,
      paymentStatus: "paid",
      status: "paid_pending_review",
    });
  } catch (err) {
    console.error("[featured/verify]", err?.message || err);
    return NextResponse.json({ ok: false, error: "Could not update booking" }, { status: 500 });
  }
}
