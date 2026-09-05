import { getApproved } from "./store.js";
import { getAdminDb } from "./firebaseAdmin.js";
import { getSiteUrl } from "./site-url.js";
import { escapeEmail } from "./alerts.js";

export async function buildDigest() {
  const all = await getApproved();
  const hiring = all.filter((s) => s.hiring).sort((a, b) => (b.hiring.count || 0) - (a.hiring.count || 0)).slice(0, 5);
  const news = all
    .flatMap((s) => (s.news || []).map((n) => ({ ...n, companyName: s.name })))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 5);
  return { hiring, news, total: all.length, generatedAt: new Date().toISOString() };
}

// Returns null (not []) when FIREBASE_SERVICE_ACCOUNT isn't configured, so
// callers can distinguish "no subscribers" from "can't read the list yet".
export async function getSubscribers() {
  const db = await getAdminDb();
  if (!db) return null;
  const snap = await db.collection("subscribers").get();
  return snap.docs.map((d) => d.data());
}

export async function sendDigestEmail(to, digest) {
  if (!process.env.RESEND_API_KEY || !process.env.NEWSLETTER_FROM) return { sent: false, reason: "Email sender is not configured" };
  const subject = `${digest.hiring.length} Hyderabad startups hiring this week`;
  const html = `
    <h2>Hyderabad Startup Map — Weekly Digest</h2>
    <p>${digest.total} startups tracked.</p>
    <h3>Hiring now</h3>
    <ul>${digest.hiring.map((s) => `<li><a href="${getSiteUrl()}/?startup=${encodeURIComponent(s.id)}">${escapeEmail(s.name)}</a> — ${s.hiring.count} open roles</li>`).join("")}</ul>
    <h3>Recent news</h3>
    <ul>${digest.news.map((n) => `<li><a href="${escapeEmail(/^https?:\/\//i.test(n.url||'')?n.url:getSiteUrl()+'/news')}">${escapeEmail(n.title)}</a></li>`).join("")}</ul>
  `;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.NEWSLETTER_FROM, to, subject, html }),
  });
  return { sent: resp.ok, status: resp.status };
}
