import { NextResponse } from "next/server";
import { buildDigest, getSubscribers, sendDigestEmail } from "../../../../lib/newsletter.js";

// Weekly digest — triggered by Vercel Cron (vercel.json: Sundays 09:00 IST).
// Also triggerable on-demand from the admin panel (/api/admin/newsletter),
// which shares this same digest/send logic via lib/newsletter.js.
//
// Two things this needs before it can actually send, neither wired yet:
//   1. RESEND_API_KEY        — sign up at resend.com, create an API key.
//   2. FIREBASE_SERVICE_ACCOUNT — a service account JSON (Firebase console →
//      Project settings → Service accounts → Generate new private key),
//      stored as an env var (stringified JSON). The subscribers list has no
//      public read rule (deliberately — see lib/firebase.js rules note), so
//      reading it server-side needs admin credentials, not the client SDK
//      used everywhere else in this app.
// Until both exist, this route composes the digest and logs it — it does
// NOT send real email to real people.
export const dynamic = "force-dynamic";

export async function GET(req) {
  // Vercel Cron sends this header automatically when CRON_SECRET is set —
  // rejects anyone else from triggering a mass-send by hitting the URL.
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const digest = await buildDigest();
  const subscribers = await getSubscribers();

  if (!subscribers) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      note: "FIREBASE_SERVICE_ACCOUNT not configured — digest composed but subscriber list unreadable. Logged only.",
      digest,
    });
  }

  const results = [];
  for (const sub of subscribers) {
    results.push(await sendDigestEmail(sub.email, digest));
  }
  const sent = results.filter((r) => r.sent).length;

  return NextResponse.json({ ok: true, sent, of: subscribers.length, note: sent === 0 ? "RESEND_API_KEY not configured" : undefined });
}
