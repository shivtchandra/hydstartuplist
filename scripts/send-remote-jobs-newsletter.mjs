#!/usr/bin/env node
// Mapping HYD newsletter — remote India jobs edition.
// Stats are pulled live from the jobs API at run time, so the numbers are
// always "today's". Recipients come straight from Firebase Auth.
//
//   PREVIEW=1 node scripts/send-remote-jobs-newsletter.mjs   → writes .mini/newsletter-preview.html, sends nothing
//   TEST=you@example.com node scripts/send-remote-jobs-newsletter.mjs → sends one copy to that address
//   DRY=1 node scripts/send-remote-jobs-newsletter.mjs       → lists recipient count, sends nothing
//   node scripts/send-remote-jobs-newsletter.mjs             → sends to every signed-up user
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { escapeEmail as esc } from "../lib/alerts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.NEWSLETTER_FROM || "Mapping HYD <hello@mapmyhyd.com>";
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO || "shivachandra9490@gmail.com";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://startups.mapmyhyd.com").replace(/\/$/, "");
const PREVIEW = process.env.PREVIEW === "1";
const DRY = process.env.DRY === "1";
const TEST = (process.env.TEST || "").trim();

// Employers added for this edition — shown under "New on the board" if they have live remote roles.
const NEW_EMPLOYERS = ["HighLevel", "Drivetrain", "Bjak", "Netomi", "Dumroo.ai"];

// ---- live stats -----------------------------------------------------------

async function getJson(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`${resp.status} ${url}`);
  return resp.json();
}

async function fetchAllRemote() {
  const jobs = [];
  let cursor = "";
  for (let page = 0; page < 40; page++) {
    const q = new URLSearchParams({ work: "remote", sort: "newest" });
    if (cursor) q.set("cursor", cursor);
    const data = await getJson(`${SITE}/api/v2/jobs?${q}`);
    jobs.push(...(data.jobs || []));
    if (!data.nextCursor) return { jobs, total: data.total ?? jobs.length };
    cursor = data.nextCursor;
  }
  return { jobs, total: jobs.length };
}

const [{ jobs: remote, total: remoteTotal }, all] = await Promise.all([
  fetchAllRemote(),
  getJson(`${SITE}/api/v2/jobs`),
]);

const WEEK = 7 * 24 * 3600 * 1000;
const byCompany = new Map();
for (const j of remote) byCompany.set(j.company, (byCompany.get(j.company) || 0) + 1);

const stats = {
  remoteTotal,
  siteTotal: all.total,
  remoteEmployers: byCompany.size,
  newThisWeek: remote.filter((j) => Date.now() - new Date(j.firstSeenAt || j.postedAt || 0) < WEEK).length,
  earlyCareer: remote.filter((j) => ["intern", "junior"].includes(j.level)).length,
};

const newEmployers = NEW_EMPLOYERS.map((n) => [n, byCompany.get(n) || 0]).filter(([, c]) => c > 0);

// Newest roles, one per company, so one big employer doesn't fill the list.
const featured = [];
const seen = new Set();
for (const j of remote) {
  if (seen.has(j.company)) continue;
  seen.add(j.company);
  featured.push(j);
  if (featured.length === 6) break;
}

// ---- email ----------------------------------------------------------------

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const LEVEL = { intern: "Intern / Fresher", junior: "Early career", mid: "Mid-level", senior: "Senior", lead: "Lead", manager: "Manager" };
const utm = (url, content) => `${url}${url.includes("?") ? "&" : "?"}utm_source=newsletter&utm_medium=email&utm_campaign=remote-jobs&utm_content=${content}`;
const remoteUrl = `${SITE}/jobs?work=remote`;

const subject = `${fmt(stats.remoteTotal)} remote jobs you can do from anywhere in India`;
const preheader = `${fmt(stats.remoteEmployers)} companies hiring remote right now — ${fmt(stats.newThisWeek)} roles added this week.`;

const INK = "#0f172a";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const RULE = "#ece7df";
const ACCENT = "#ff5722";
const HEAD = "'Outfit','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const BODY = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const stat = (value, label, last) => `
  <td width="33%" valign="top" style="padding:0 ${last ? 0 : 16}px 0 0">
    <div style="font-family:${HEAD};font-size:34px;line-height:1;font-weight:600;color:${INK};letter-spacing:-.02em">${value}</div>
    <div style="margin-top:8px;font-size:13px;line-height:1.35;color:${MUTED}">${label}</div>
  </td>`;

const label = (t) =>
  `<p style="margin:44px 0 6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ACCENT}">${t}</p>`;

const roleRow = (j, i) => `
  <tr>
    <td width="34" valign="top" style="padding:18px 0;border-top:1px solid ${RULE};font-family:${HEAD};font-size:14px;font-weight:600;color:${FAINT}">${String(i + 1).padStart(2, "0")}</td>
    <td valign="top" style="padding:18px 0;border-top:1px solid ${RULE}">
      <a href="${esc(utm(`${SITE}/jobs/${encodeURIComponent(j.id)}`, "role"))}" style="font-size:16px;line-height:1.4;font-weight:600;color:${INK};text-decoration:none">${esc(j.title)}</a>
      <div style="margin-top:4px;font-size:14px;line-height:1.4;color:${MUTED}">${esc(j.company)}${LEVEL[j.level] ? ` &nbsp;·&nbsp; ${LEVEL[j.level]}` : ""}</div>
    </td>
    <td width="24" align="right" valign="top" style="padding:18px 0;border-top:1px solid ${RULE}">
      <a href="${esc(utm(`${SITE}/jobs/${encodeURIComponent(j.id)}`, "role"))}" style="font-size:16px;color:${ACCENT};text-decoration:none">→</a>
    </td>
  </tr>`;

const employerRow = ([name, count]) => `
  <tr>
    <td style="padding:12px 0;border-top:1px solid ${RULE};font-size:15px;font-weight:600;color:${INK}">${esc(name)}</td>
    <td align="right" style="padding:12px 0;border-top:1px solid ${RULE};font-size:14px;color:${MUTED}">${count} remote role${count === 1 ? "" : "s"}</td>
  </tr>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:${BODY};color:${INK};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5"><tr><td align="center" style="padding:40px 20px 48px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

  <!-- Wordmark -->
  <tr><td style="padding:0 0 28px;border-bottom:1px solid ${RULE}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${HEAD};font-size:17px;font-weight:700;color:${INK};letter-spacing:-.01em"><span style="color:${ACCENT}">●</span>&nbsp; Mapping HYD</td>
      <td align="right" style="font-size:13px;color:${FAINT}">${today}</td>
    </tr></table>
  </td></tr>

  <!-- Hero -->
  <tr><td style="padding:40px 0 0">
    <h1 style="margin:0;font-family:${HEAD};font-size:36px;line-height:1.12;font-weight:600;letter-spacing:-.025em;color:${INK}">Remote jobs are now on the map.</h1>
    <p style="margin:18px 0 0;font-size:17px;line-height:1.6;color:#475569">
      Not every great job needs a Hyderabad office. You can now filter Mapping HYD for roles you can do from anywhere in India, pulled straight from each company's own careers page.
    </p>
  </td></tr>

  <!-- Stats -->
  <tr><td style="padding:36px 0 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${stat(fmt(stats.remoteTotal), "remote roles live")}
      ${stat(fmt(stats.remoteEmployers), "companies hiring")}
      ${stat(fmt(stats.earlyCareer), "for freshers &amp; early career", true)}
    </tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:36px 0 0">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${INK};border-radius:10px">
      <a href="${esc(utm(remoteUrl, "cta-top"))}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Browse remote jobs &nbsp;→</a>
    </td></tr></table>
  </td></tr>

  <!-- Fresh roles -->
  <tr><td>
    ${label("Fresh this week")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${featured.map(roleRow).join("")}</table>
  </td></tr>

  ${newEmployers.length ? `<!-- New employers -->
  <tr><td>
    ${label("New on the board")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${newEmployers.map(employerRow).join("")}</table>
  </td></tr>` : ""}

  <!-- Sign-off -->
  <tr><td style="padding:44px 0 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:16px 18px;background:#ffffff;border:1px solid ${RULE};border-radius:12px">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ACCENT}">Tip</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:#475569">Add the <strong style="color:${INK}">Level</strong> filter on top of Remote to see only roles that match your experience.</p>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:32px 0 0">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">
      Know a company we're missing, or found a broken link? Reply to this email — I read every one.
    </p>
    <p style="margin:0;font-size:15px;line-height:1.4;font-weight:600;color:${INK}">Shiva</p>
    <p style="margin:2px 0 0;font-size:13px;line-height:1.4;color:${MUTED}">Mapping HYD</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:44px 0 0">
    <p style="margin:0;padding-top:20px;border-top:1px solid ${RULE};font-size:12px;line-height:1.6;color:${FAINT}">
      ${fmt(stats.siteTotal)} open roles across Hyderabad on <a href="${esc(utm(SITE, "footer"))}" style="color:${FAINT}">startups.mapmyhyd.com</a><br>
      You're receiving this because you signed up on Mapping HYD. Reply “unsubscribe” to stop these emails.
    </p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;

const text = [
  `MAPPING HYD NEWSLETTER · ${today}`,
  "",
  "Remote jobs are now on the map",
  "",
  `${fmt(stats.remoteTotal)} remote roles · ${fmt(stats.remoteEmployers)} companies · ${fmt(stats.newThisWeek)} added this week`,
  `${fmt(stats.earlyCareer)} for freshers and early career · ${fmt(stats.siteTotal)} open roles across Mapping HYD`,
  "",
  newEmployers.length ? `New on the board: ${newEmployers.map(([n, c]) => `${n} (${c})`).join(", ")}\n` : "",
  "Fresh remote roles:",
  ...featured.map((j) => `- ${j.title} — ${j.company}\n  ${SITE}/jobs/${encodeURIComponent(j.id)}`),
  "",
  `See all remote jobs: ${remoteUrl}`,
  "",
  "Reply to this email to suggest a company or report a broken link. Reply \"unsubscribe\" to stop these emails.",
].join("\n");

console.log("Stats:", JSON.stringify(stats));
console.log("Subject:", subject);

if (PREVIEW) {
  const out = path.join(__dirname, "..", ".mini", "newsletter-preview.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log("Preview written:", out);
  process.exit(0);
}

// ---- recipients -----------------------------------------------------------

if (!RESEND_KEY) {
  console.error("RESEND_API_KEY not set");
  process.exit(1);
}

let EMAILS;
if (TEST) {
  EMAILS = [TEST];
} else {
  const { getAdminAuth } = await import("../lib/firebaseAdmin.js");
  const auth = await getAdminAuth();
  if (!auth) {
    console.error("Firebase Auth not configured");
    process.exit(1);
  }
  const emails = new Set();
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      const email = String(u.email || "").trim().toLowerCase();
      if (!email || u.disabled || email.includes("example.com")) continue;
      if (/(gamil|gmial|gmal)\.com@/.test(email)) continue; // typo'd sign-ups bounce and hurt sender reputation
      emails.add(email);
    }
    pageToken = res.pageToken;
  } while (pageToken);
  EMAILS = [...emails].sort();
}

if (!EMAILS.length) {
  console.error("No recipients");
  process.exit(1);
}

console.log(`${DRY ? "DRY RUN" : "SENDING"} to ${EMAILS.length} recipient(s) — from: ${FROM}`);
if (DRY) process.exit(0);

let sent = 0;
let failed = 0;
for (const email of EMAILS) {
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: email,
        reply_to: REPLY_TO,
        subject,
        html,
        text,
        headers: { "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>` },
        tags: [{ name: "campaign", value: "remote-jobs" }],
      }),
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
  await new Promise((r) => setTimeout(r, 600)); // stay under Resend's 2 req/s
}

console.log(`Done: ${sent} sent, ${failed} failed`);
process.exit(failed ? 1 : 0);
