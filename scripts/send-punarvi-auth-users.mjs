#!/usr/bin/env node
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.NEWSLETTER_FROM || "Mapping HYD <hello@mapmyhyd.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://startups.mapmyhyd.com";
const DRY = process.env.DRY === "1";

const EMAILS = [
  "beeram.santosh@gmail.com",
  "mdnazeer21r@gmail.com",
  "muvvalabhavana03@gmail.com",
  "mrutyunjaydhal42@gmail.com",
  "ggudidaanusha@gmail.com",
  "razamohammed222333@gmail.com",
  "purvas0803@gmail.com",
  "akankshanadipalli2006@gmail.com",
  "devasaniaravind28@gmail.com",
  "besthalokanath7@gmail.com",
  "anveshgyt@gmail.com",
  "duppadasudheer@gmail.com",
  "swathidornala5@gmail.com",
  "tepanox.uma@gmail.com",
  "vdksaikiran08@gmail.com",
  "ajaykesavarapu3@gmail.com",
  "kalyanijatavath10@gmail.com",
  "remarkable739@gmail.com",
  "harishjairam188@gmail.com",
  "jithendrapesala88@gmail.com",
  "parinamikabhanu05@gmail.com",
  "sandeepsunny13581@gmail.com",
  "nagalakshmi.mallisetti27@gmail.com",
  "xjasminex08@gmail.com",
  "ravi2182003@gmail.com",
  "vishnuorsu6125@gmail.com",
  "gandivamshikrishna94864@gmail.com",
  "rahul.chitala1818@gmail.com",
  "amitjangir972@gmail.com",
  "kandadasai054@gmail.com",
  "facebook.sharath@gmail.com",
  "allampally.nishitha@gmail.com",
  "varma.gadhiraju5725@gmail.com",
  "bonthukoushik64@gmail.com",
  "chethantejakumar@gmail.com",
  "ayyagaripavan@gmail.com",
  "parasakthi2220@gmail.com",
  "pavantej219@gmail.com",
  "hrushisaini@gmail.com",
  "anantha220402@gmail.com",
  "lankereshma5121@gmail.com",
  "sumiransharma44@gmail.com",
  "srikanthdurga.k@gmail.com",
  "rahulchowdary125@gmail.com",
  "shivachandra9490@gmail.com",
];

const subject = "Exclusive: Punarvi Energies is hiring — BD roles in Vijayawada";

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:24px 32px">
    <p style="color:#f97316;font-weight:700;font-size:13px;margin:0 0 4px;letter-spacing:.05em">MAPPING HYD · EXCLUSIVE JOBS</p>
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;line-height:1.3">Punarvi Energies is hiring — Clean Energy roles in Vijayawada</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#444;margin:0 0 20px;font-size:15px;line-height:1.6">Punarvi Energies Ltd. is a clean energy company based in Vijayawada looking for business development talent. Two exclusive roles open now:</p>

    <div style="background:#fff7ed;border:1.5px solid #f97316;border-radius:10px;padding:18px 20px;margin-bottom:12px">
      <p style="margin:0 0 4px;font-size:12px;color:#f97316;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Open Role</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1a1a2e">Business Development Manager</p>
    </div>

    <div style="background:#fff7ed;border:1.5px solid #f97316;border-radius:10px;padding:18px 20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:12px;color:#f97316;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Open Role</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1a1a2e">Business Development Executive</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px;width:110px">Qualification</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#222;font-size:14px;font-weight:500">Graduation</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px">Experience</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#222;font-size:14px;font-weight:500">3–5 Years</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px">Industry</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#222;font-size:14px;font-weight:500">Solar / Renewable Energy</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:13px">Location</td><td style="padding:8px 0;color:#222;font-size:14px;font-weight:500">Amaravathi, Vijayawada · AP</td></tr>
    </table>

    <p style="color:#444;font-size:14px;margin:0 0 12px">To apply, send your resume directly:</p>
    <p style="margin:0 0 6px"><a href="mailto:hr@punarvienergies.com" style="color:#f97316;text-decoration:none;font-weight:600">📧 hr@punarvienergies.com</a></p>
    <p style="margin:0 0 28px;color:#444;font-size:14px">📞 +91 7997033799 &nbsp;/&nbsp; +91 7287872877</p>

    <a href="${SITE}/jobs" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">Browse all open roles →</a>
  </div>
  <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee">
    <p style="margin:0;color:#999;font-size:12px">Mapping HYD · <a href="${SITE}" style="color:#999">startups.mapmyhyd.com</a> · You received this because you signed up on our platform.</p>
  </div>
</div>
</body>
</html>`;

if (!RESEND_KEY) { console.error("RESEND_API_KEY not set"); process.exit(1); }

console.log(`${DRY ? "DRY RUN" : "SENDING"} to ${EMAILS.length} users — from: ${FROM}`);

let sent = 0, failed = 0;
for (const email of EMAILS) {
  if (DRY) { console.log("DRY →", email); continue; }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    });
    const data = await resp.json();
    if (resp.ok) { sent++; console.log("✓", email); }
    else { failed++; console.error("✗", email, JSON.stringify(data)); }
  } catch (err) {
    failed++; console.error("✗", email, err.message);
  }
  await new Promise(r => setTimeout(r, 150));
}

console.log(DRY ? `Dry run — ${EMAILS.length} would receive` : `Done: ${sent} sent, ${failed} failed`);
process.exit(0);
