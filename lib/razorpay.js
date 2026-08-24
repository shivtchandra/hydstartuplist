/**
 * Razorpay helpers (server-only). Never import from client components.
 * Amounts for the Razorpay API are always in paise (INR × 100).
 */

export function razorpayConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || null;
}

/** Lazy-load the SDK so missing deps / keys don't crash module import. */
export async function getRazorpayClient() {
  if (!razorpayConfigured()) return null;
  const Razorpay = (await import("razorpay")).default;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export function amountToPaise(amountInr) {
  return Math.round(Number(amountInr) || 0) * 100;
}

/** Verify checkout success signature (order_id|payment_id). */
export async function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature || !process.env.RAZORPAY_KEY_SECRET) {
    return false;
  }
  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

/** Verify Razorpay webhook HMAC (X-Razorpay-Signature over raw body). */
export async function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature || rawBody == null) return false;
  const crypto = await import("crypto");
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}
