#!/usr/bin/env node
// Email Firebase Auth users (signed-up emails only) via Resend.
// Mostly Mapping HYD jobs digest; ~20% exclusive Punarvi highlight.
// Dry-run: DRY=1 node scripts/send-punarvi-auth-users.mjs
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.NEWSLETTER_FROM || "Mapping HYD <hello@mapmyhyd.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://startups.mapmyhyd.com";
const DRY = process.env.DRY === "1";

if (!RESEND_KEY) {
  console.error("RESEND_API_KEY not set");
  process.exit(1);
}

const { getAdminAuth } = await import("../lib/firebaseAdmin.js");
const auth = await getAdminAuth();
if (!auth) {
  console.error("Firebase Auth not configured");
  process.exit(1);
}

const emails = new Set();
let nextPageToken;
do {
  const res = await auth.listUsers(1000, nextPageToken);
  for (const u of res.users) {
    const email = String(u.email || "").trim().toLowerCase();
    if (!email || email.includes("example.com") || u.disabled) continue;
    emails.add(email);
  }
  nextPageToken = res.pageToken;
} while (nextPageToken);

const EMAILS = [...emails].sort();
if (!EMAILS.length) {
  console.error("No signed-up emails found");
  process.exit(1);
}

const subject = "1,400+ Hyderabad roles on Mapping HYD — plus one exclusive opening";

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f5f7;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,.06)">
  <div style="background:#0f172a;padding:22px 28px">
    <p style="margin:0 0 6px;color:#fb923c;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Mapping HYD · Jobs</p>
    <h1 style="margin:0;color:#fff;font-size:21px;line-height:1.3;font-weight:700">Your Hyderabad job board, kept current</h1>
  </div>

  <div style="padding:26px 28px">
    <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.55">
      You’re signed in on Mapping HYD — here’s a quick look at what’s live on the jobs board right now.
    </p>

    <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.55">
      Browse <strong>1,400+ verified openings</strong> across startups, GCCs, and product companies in Hyderabad.
      Filter by area (Gachibowli, Madhapur, HITEC City…), experience level, and Direct ATS apply links — no recruiter maze.
    </p>

    <a href="${SITE}/jobs" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;font-size:14px;margin:0 0 22px">Browse all open roles →</a>

    <p style="margin:0 0 10px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Also this week</p>
    <div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:14px 16px;margin:0 0 18px">
      <p style="margin:0 0 6px;color:#c2410c;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Exclusive · ~1 in this digest</p>
      <p style="margin:0 0 8px;color:#0f172a;font-size:15px;font-weight:700;line-height:1.35">Punarvi Energies (solar) — BD Manager &amp; BD Executive in Vijayawada / Amaravathi</p>
      <p style="margin:0 0 10px;color:#475569;font-size:13px;line-height:1.45">Graduation · 3–5 yrs · renewables preferred. Direct apply only (no portal listing).</p>
      <p style="margin:0;font-size:13px;line-height:1.5">
        <a href="mailto:hr@punarvienergies.com" style="color:#c2410c;font-weight:700;text-decoration:none">hr@punarvienergies.com</a>
        &nbsp;·&nbsp; +91 79970 33799 / +91 72878 72877
        &nbsp;·&nbsp; <a href="${SITE}/jobs?q=punarvi" style="color:#c2410c;font-weight:600">View on Mapping HYD</a>
      </p>
    </div>

    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5">
      Questions about Mapping HYD? Write to
      <a href="mailto:shivachandra9490@gmail.com" style="color:#64748b">shivachandra9490@gmail.com</a>.
    </p>
  </div>

  <div style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
    <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.45">
      Mapping HYD · <a href="${SITE}" style="color:#94a3b8">startups.mapmyhyd.com</a><br>
      You’re getting this as a registered user.
    </p>
  </div>
</div>
</body>
</html>`;

console.log(`${DRY ? "DRY RUN" : "SENDING"} to ${EMAILS.length} Auth users — from: ${FROM}`);

let sent = 0;
let failed = 0;
for (const email of EMAILS) {
  if (DRY) {
    console.log("DRY →", email);
    continue;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: email, subject, html }),
    });
    const data = await resp.json();
    if (resp.ok) {
      sent += 1;
      console.log("✓", email);
    } else {
      failed += 1;
      console.error("✗", email, JSON.stringify(data));
    }
  } catch (err) {
    failed += 1;
    console.error("✗", email, err.message);
  }
  await new Promise((r) => setTimeout(r, 200));
}

console.log(DRY ? `Dry run — ${EMAILS.length} would receive` : `Done: ${sent} sent, ${failed} failed`);
process.exit(failed ? 1 : 0);
