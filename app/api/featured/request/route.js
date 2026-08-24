import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebaseAdmin.js";
import { quoteFeatured } from "../../../../lib/featured-pricing.js";

export const dynamic = "force-dynamic";

// Manual UPI flow: the buyer pays to our UPI VPA, then submits the UPI
// transaction/reference id here. We store the request as pending_verification;
// an admin confirms the payment landed and then activates the Sponsored slot.
const UPI_VPA = process.env.FEATURED_UPI_VPA || "shivachandra9490-1@okaxis";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { name, website, logoUrl, contactEmail, startupId, days, startPreference, notes, upiTxnId } = body;

  if (!name || !website || !contactEmail || !days || !upiTxnId) {
    return NextResponse.json(
      { error: "name, website, contactEmail, days and upiTxnId are required" },
      { status: 400 }
    );
  }

  // Re-quote server-side so the stored amount can't be tampered with by the client.
  const quote = quoteFeatured(Number(days));

  const db = await getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Storage not configured (FIREBASE_SERVICE_ACCOUNT missing)." },
      { status: 500 }
    );
  }

  const doc = {
    name: String(name).trim(),
    website: String(website).trim(),
    logoUrl: logoUrl ? String(logoUrl).trim() : null,
    contactEmail: String(contactEmail).trim(),
    startupId: startupId ? String(startupId).trim() : null,
    days: quote.days,
    amount: quote.amount,
    packageId: quote.packageId,
    startPreference: startPreference || null,
    notes: notes ? String(notes).trim() : null,
    upiVpa: UPI_VPA,
    upiTxnId: String(upiTxnId).trim(),
    status: "pending_verification",
    createdAt: new Date().toISOString(),
  };

  const ref = await db.collection("featured_requests").add(doc);
  return NextResponse.json({ ok: true, requestId: ref.id, amount: quote.amount });
}
