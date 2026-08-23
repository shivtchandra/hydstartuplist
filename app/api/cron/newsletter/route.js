import { NextResponse } from "next/server";
import { getApproved } from "../../../../lib/store.js";

// Weekly digest — triggered by Vercel Cron (vercel.json: Sundays 09:00 IST).
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

function buildDigest() {
  const all = getApproved();
  const hiring = all.filter((s) => s.hiring).sort((a, b) => (b.hiring.count || 0) - (a.hiring.count || 0)).slice(0, 5);
  const news = all
    .flatMap((s) => (s.news || []).map((n) => ({ ...n, companyName: s.name })))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 5);
  return { hiring, news, total: all.length, generatedAt: new Date().toISOString() };
}

async function getSubscribers() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null; // not configured yet
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = getFirestore(app);
  const snap = await db.collection("subscribers").get();
  return snap.docs.map((d) => d.data());
}

async function sendEmail(to, digest) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "RESEND_API_KEY not set" };
  const subject = `${digest.hiring.length} Hyderabad startups hiring this week`;
  const html = `
    <h2>Hyderabad Startup Map — Weekly Digest</h2>
    <p>${digest.total} startups tracked.</p>
    <h3>Hiring now</h3>
    <ul>${digest.hiring.map((s) => `<li><a href="https://hyderabadstartupmap.example">${s.name}</a> — ${s.hiring.count} open roles</li>`).join("")}</ul>
    <h3>Recent news</h3>
    <ul>${digest.news.map((n) => `<li><a href="${n.url}">${n.title}</a></li>`).join("")}</ul>
  `;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Hyderabad Startup Map <digest@yourdomain.com>", to, subject, html }),
  });
  return { sent: resp.ok, status: resp.status };
}

export async function GET(req) {
  // Vercel Cron sends this header automatically when CRON_SECRET is set —
  // rejects anyone else from triggering a mass-send by hitting the URL.
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const digest = buildDigest();
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
    results.push(await sendEmail(sub.email, digest));
  }
  const sent = results.filter((r) => r.sent).length;

  return NextResponse.json({ ok: true, sent, of: subscribers.length, note: sent === 0 ? "RESEND_API_KEY not configured" : undefined });
}
