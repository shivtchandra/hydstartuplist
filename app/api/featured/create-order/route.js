import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { quoteFeatured } from "../../../../lib/featured-pricing.js";
import {
  amountToPaise,
  getRazorpayClient,
  getRazorpayKeyId,
  razorpayConfigured,
} from "../../../../lib/razorpay.js";

export const dynamic = "force-dynamic";

function bad(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/**
 * Create (or reuse) a featured booking + Razorpay order.
 * Body: name, website, contactEmail, days, startupId?, startPreference?, notes?, bookingId? (retry)
 */
export async function POST(req) {
  if (!razorpayConfigured()) {
    return bad("Payments are not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.", 503, {
      configured: false,
    });
  }

  const db = await getAdminDb();
  if (!db) {
    return bad("Booking backend not configured (FIREBASE_SERVICE_ACCOUNT missing).", 503, {
      configured: false,
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const name = String(body.name || "").trim();
  const website = String(body.website || "").trim();
  const contactEmail = String(body.contactEmail || "").trim();
  const days = Number(body.days);
  const startupId = String(body.startupId || "").trim() || null;
  const startPreference = String(body.startPreference || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  const existingBookingId = String(body.bookingId || "").trim() || null;

  if (!existingBookingId) {
    if (!name || !website || !contactEmail || !Number.isFinite(days)) {
      return bad("name, website, contactEmail, and days are required");
    }
  }

  const rzp = await getRazorpayClient();
  if (!rzp) {
    return bad("Payments are not configured yet.", 503, { configured: false });
  }

  try {
    let bookingId = existingBookingId;
    let quote;
    let bookingRef;

    if (bookingId) {
      bookingRef = db.collection("pending").doc(bookingId);
      const snap = await bookingRef.get();
      if (!snap.exists) return bad("Booking not found", 404);
      const data = snap.data();
      if (data.type !== "featured_booking" && data.intent !== "featured") {
        return bad("Not a featured booking", 400);
      }
      if (data.paymentStatus === "paid") {
        return NextResponse.json({
          ok: true,
          alreadyPaid: true,
          bookingId,
          amount: data.amount,
          currency: data.currency || "INR",
        });
      }
      quote = quoteFeatured(data.days);
    } else {
      quote = quoteFeatured(days);
      bookingRef = db.collection("pending").doc();
      bookingId = bookingRef.id;
      await bookingRef.set({
        type: "featured_booking",
        intent: "featured",
        status: "pending",
        name,
        website,
        contactEmail,
        startupId,
        days: quote.days,
        amount: quote.amount,
        currency: quote.currency,
        packageId: quote.packageId,
        effectiveDaily: quote.effectiveDaily,
        startPreference,
        notes,
        paymentStatus: "unpaid",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const receipt = `feat_${bookingId}`.slice(0, 40);
    const order = await rzp.orders.create({
      amount: amountToPaise(quote.amount),
      currency: "INR",
      receipt,
      notes: {
        bookingId,
        days: String(quote.days),
        type: "featured_booking",
      },
    });

    await bookingRef.set(
      {
        razorpayOrderId: order.id,
        paymentStatus: "unpaid",
        amount: quote.amount,
        currency: quote.currency,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      configured: true,
      bookingId,
      orderId: order.id,
      amount: quote.amount,
      amountPaise: amountToPaise(quote.amount),
      currency: "INR",
      days: quote.days,
      display: quote.display,
      keyId: getRazorpayKeyId(),
    });
  } catch (err) {
    console.error("[featured/create-order]", err?.message || err);
    return bad("Could not create payment order. Try again.", 500);
  }
}
