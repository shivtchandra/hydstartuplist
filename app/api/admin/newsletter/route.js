import { NextResponse } from "next/server";
import { buildDigest, getSubscribers, sendDigestEmail } from "../../../../lib/newsletter.js";
import { checkAdminPasscode } from "../../../../lib/admin-auth.js";

export const dynamic = "force-dynamic";

function checkPasscode(req) {
  const passcode = req.headers.get("x-admin-passcode");
  return checkAdminPasscode(req);
}

// GET = preview only (what would be sent, to how many people) — never sends.
export async function GET(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const digest = await buildDigest();
  const subscribers = await getSubscribers();

  return NextResponse.json({
    digest,
    subscriberCount: subscribers?.length ?? null,
    canSend: !!process.env.RESEND_API_KEY,
    note: subscribers === null ? "FIREBASE_SERVICE_ACCOUNT not configured — subscriber list unreadable" : undefined,
  });
}

// POST = actually send to every current subscriber. The admin page confirms
// with the user before calling this — it's a real, irreversible send once
// RESEND_API_KEY is configured (a safe no-op composing-only response until then).
export async function POST(req) {
  if (!checkPasscode(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const digest = await buildDigest();
  const subscribers = await getSubscribers();

  if (!subscribers) {
    return NextResponse.json({ ok: false, sent: 0, note: "FIREBASE_SERVICE_ACCOUNT not configured — can't read subscribers" });
  }
  if (subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, of: 0, note: "No subscribers yet" });
  }

  const results = [];
  for (const sub of subscribers) {
    results.push(await sendDigestEmail(sub.email, digest));
  }
  const sent = results.filter((r) => r.sent).length;

  return NextResponse.json({
    ok: true,
    sent,
    of: subscribers.length,
    note: sent === 0 ? "RESEND_API_KEY not configured — nothing actually sent" : undefined,
  });
}
