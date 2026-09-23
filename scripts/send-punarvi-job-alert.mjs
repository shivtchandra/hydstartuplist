#!/usr/bin/env node
// One-off: email all subscribers about Punarvi Energies exclusive job openings.
// Run: node scripts/send-punarvi-job-alert.mjs
// Dry-run (no send): DRY=1 node scripts/send-punarvi-job-alert.mjs
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const { getAdminDb } = await import("../lib/firebaseAdmin.js");

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.NEWSLETTER_FROM || "Mapping HYD <hello@mapmyhyd.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://startups.mapmyhyd.com";
const DRY = process.env.DRY === "1";

if (!RESEND_KEY) { console.error("RESEND_API_KEY not set"); process.exit(1); }

const db = await getAdminDb();
const snap = await db.collection("subscribers").get();
const subscribers = snap.docs.map(d => d.data()).filter(s => s.email && !s.email.includes("example.com"));

console.log(`Sending to ${subscribers.length} subscribers (DRY=${DRY})`);
console.log("From:", FROM);

const subject = "Exclusive opportunity: Punarvi Energies is hiring in Vijayawada";

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:24px 32px">
    <p style="color:#f97316;font-weight:700;font-size:13px;margin:0 0 4px;letter-spacing:.05em">MAPPING HYD · EXCLUSIVE JOBS</p>
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;line-height:1.3">Punarvi Energies is hiring — Clean Energy roles in Vijayawada</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#444;margin:0 0 20px;font-size:15px;line-height:1.6">Punarvi Energies Ltd. — a clean energy company based in Vijayawada — is looking for business development talent. Two roles open now:</p>

    <div style="background:#fff7ed;border:1.5px solid #f97316;border-radius:10px;padding:18px 20px;margin-bottom:12px">
      <p style="margin:0 0 4px;font-size:13px;color:#f97316;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Open Role</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1a1a2e">Business Development Manager</p>
    </div>

    <div style="background:#fff7ed;border:1.5px solid #f97316;border-radius:10px;padding:18px 20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;color:#f97316;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Open Role</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1a1a2e">Business Development Executive</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px;width:110px">Qualification</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#222;font-size:14px;font-weight:500">Graduation</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px">Experience</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#222;font-size:14px;font-weight:500">3–5 Years</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px">Industry</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#222;font-size:14px;font-weight:500">Solar / Renewable Energy</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#888;font-size:13px">Location</td>
        <td style="padding:8px 0;color:#222;font-size:14px;font-weight:500">Amaravathi, Vijayawada · Andhra Pradesh</td>
      </tr>
    </table>

    <p style="color:#444;font-size:14px;margin:0 0 20px">To apply, send your resume directly to Punarvi Energies:</p>
    <p style="margin:0 0 8px">
      <a href="mailto:hr@punarvienergies.com" style="color:#f97316;text-decoration:none;font-weight:600">📧 hr@punarvienergies.com</a>
    </p>
    <p style="margin:0 0 24px">
      <span style="color:#444;font-size:14px">📞 +91 7997033799 &nbsp;/&nbsp; +91 7287872877</span>
    </p>

    <a href="${SITE}/jobs" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">View all Hyderabad jobs →</a>
  </div>
  <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee">
    <p style="margin:0;color:#999;font-size:12px">Mapping HYD · <a href="${SITE}" style="color:#999">startups.mapmyhyd.com</a></p>
  </div>
</div>
</body>
</html>
`;

let sent = 0, failed = 0;
for (const sub of subscribers) {
  if (DRY) { console.log("DRY →", sub.email); continue; }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: sub.email, subject, html }),
    });
    const data = await resp.json();
    if (resp.ok) { sent++; console.log("✓", sub.email); }
    else { failed++; console.error("✗", sub.email, data); }
  } catch (err) {
    failed++; console.error("✗", sub.email, err.message);
  }
  await new Promise(r => setTimeout(r, 200)); // rate-limit
}

console.log(DRY ? `Dry run done — ${subscribers.length} would receive` : `Done: ${sent} sent, ${failed} failed`);
process.exit(0);
