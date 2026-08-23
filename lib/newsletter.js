import { getApproved } from "./store.js";
import { getAdminDb } from "./firebaseAdmin.js";

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
