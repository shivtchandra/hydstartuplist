#!/usr/bin/env node
// Mapping HYD newsletter — internships & early-career edition.
// Stats come live from the static jobs index the site serves, so numbers are
// always current at send time. Recipients come straight from Firebase Auth.
//
//   PREVIEW=1 node scripts/send-early-roles-newsletter.mjs   → writes .mini/newsletter-preview.html, sends nothing
//   TEST=you@example.com node scripts/send-early-roles-newsletter.mjs → sends one copy to that address
//   DRY=1 node scripts/send-early-roles-newsletter.mjs       → lists recipient count, sends nothing
//   node scripts/send-early-roles-newsletter.mjs             → sends to every signed-up user
//
// Unsubscribes: one email per line in .mini/newsletter-unsubscribed.txt (gitignored) — those are skipped.
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { escapeEmail as esc } from "../lib/alerts.js";
import { jobUrlId } from "../lib/jobs-seo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.NEWSLETTER_FROM || "Mapping HYD <hello@mapmyhyd.com>";
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO || "shivachandra9490@gmail.com";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://startups.mapmyhyd.com").replace(/\/$/, "");
const PREVIEW = process.env.PREVIEW === "1";
const DRY = process.env.DRY === "1";
const TEST = (process.env.TEST || "").trim();
const UNSUB_FILE = path.join(__dirname, "..", ".mini", "newsletter-unsubscribed.txt");

// ---- live stats -----------------------------------------------------------

const resp = await fetch(`${SITE}/data/jobs-index.json`, { signal: AbortSignal.timeout(30000) });
if (!resp.ok) throw new Error(`jobs index ${resp.status}`);
const index = await resp.json();

const DAY = 24 * 3600 * 1000;
const age = (j) => Date.now() - new Date(j.firstSeenAt || j.postedAt || 0);
const active = index.jobs.filter((j) => j.status !== "closed");
const early = active
  .filter((j) => j.level === "intern" || j.level === "junior")
  .sort((a, b) => age(a) - age(b));
// Only call it an internship when the title says so; the level classifier also
// tags some 0–1 year roles "intern", and those read better as entry-level.
const isInternship = (j) => j.level === "intern" && /intern|trainee|apprentice/i.test(j.title);
const interns = early.filter(isInternship);
const juniors = early.filter((j) => !isInternship(j));

const companies = new Set(early.map((j) => j.company));
const stats = {
  early: early.length,
  interns: interns.length,
  juniors: juniors.length,
  companies: companies.size,
  newThisWeek: early.filter((j) => age(j) < 7 * DAY).length,
  siteTotal: active.length,
};

// Newest roles, one per company, so one big employer doesn't fill a list.
function pick(list, n) {
  const out = [];
  const seen = new Set();
  for (const j of list) {
    if (seen.has(j.company)) continue;
    seen.add(j.company);
    out.push(j);
    if (out.length === n) break;
  }
  return out;
}
const featuredInterns = pick(interns.filter((j) => !/office$/i.test(j.company)), 4);
const featuredJuniors = pick(juniors, 6);

const byRole = new Map();
for (const j of early) if (j.role && j.role !== "Other") byRole.set(j.role, (byRole.get(j.role) || 0) + 1);
const roleCounts = [...byRole.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

const byCompany = new Map();
for (const j of early) byCompany.set(j.company, (byCompany.get(j.company) || 0) + 1);
const topCompanies = [...byCompany.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

// ---- email ----------------------------------------------------------------

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const utm = (url, content) => `${url}${url.includes("?") ? "&" : "?"}utm_source=newsletter&utm_medium=email&utm_campaign=early-roles&utm_content=${content}`;
const jobPage = (j) => `${SITE}/jobs/${jobUrlId(j)}`;
const jobUrl = (j) => utm(jobPage(j), "role");
const fresherUrl = `${SITE}/jobs/fresher`;

const subject = `${fmt(stats.early)} internships & fresher jobs open in Hyderabad right now`;
const preheader = `${fmt(stats.interns)} internships and ${fmt(stats.juniors)} entry-level roles from ${fmt(stats.companies)} companies — ${fmt(stats.newThisWeek)} added this week.`;

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

const label = (t, sub) => `
  <p style="margin:44px 0 ${sub ? 2 : 6}px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ACCENT}">${t}</p>
  ${sub ? `<p style="margin:0 0 10px;font-size:13px;color:${MUTED}">${sub}</p>` : ""}`;

const isNew = (j) => age(j) < 3 * DAY;
const badge = `<span style="display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:#fff1eb;color:#c2410c;font-size:11px;font-weight:700;vertical-align:2px">NEW</span>`;

const roleRow = (j, i) => `
  <tr>
    <td width="34" valign="top" style="padding:16px 0;border-top:1px solid ${RULE};font-family:${HEAD};font-size:14px;font-weight:600;color:${FAINT}">${String(i + 1).padStart(2, "0")}</td>
    <td valign="top" style="padding:16px 0;border-top:1px solid ${RULE}">
      <a href="${esc(jobUrl(j))}" style="font-size:16px;line-height:1.4;font-weight:600;color:${INK};text-decoration:none">${esc(j.title)}</a>${isNew(j) ? badge : ""}
      <div style="margin-top:4px;font-size:14px;line-height:1.4;color:${MUTED}">${esc(j.company)}${j.area && j.area !== "Hyderabad" ? ` &nbsp;·&nbsp; ${esc(j.area)}` : ""}${j.experience ? ` &nbsp;·&nbsp; ${esc(j.experience)}` : ""}</div>
    </td>
    <td width="24" align="right" valign="top" style="padding:16px 0;border-top:1px solid ${RULE}">
      <a href="${esc(jobUrl(j))}" style="font-size:16px;color:${ACCENT};text-decoration:none">→</a>
    </td>
  </tr>`;

const roleTable = (list) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list.map(roleRow).join("")}</table>`;

const countRow = ([name, count], unit) => `
  <tr>
    <td style="padding:11px 0;border-top:1px solid ${RULE};font-size:15px;font-weight:600;color:${INK}">${esc(name)}</td>
    <td align="right" style="padding:11px 0;border-top:1px solid ${RULE};font-size:14px;color:${MUTED}">${count} ${unit}</td>
  </tr>`;

const button = (href, text) => `
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${INK};border-radius:10px">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${text} &nbsp;→</a>
  </td></tr></table>`;

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
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ACCENT}">Freshers &amp; early career</p>
    <h1 style="margin:0;font-family:${HEAD};font-size:36px;line-height:1.12;font-weight:600;letter-spacing:-.025em;color:${INK}">Your first job is probably on this list.</h1>
    <p style="margin:18px 0 0;font-size:17px;line-height:1.6;color:#475569">
      We pulled every internship and 0–2 year role open in Hyderabad right now. Each one comes straight from the company's own careers page, checked again today, with a direct apply link.
    </p>
  </td></tr>

  <!-- Stats -->
  <tr><td style="padding:36px 0 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${stat(fmt(stats.interns), "internships open")}
      ${stat(fmt(stats.juniors), "entry-level roles")}
      ${stat(fmt(stats.newThisWeek), "added this week", true)}
    </tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:36px 0 0">${button(utm(fresherUrl, "cta-top"), "See all fresher jobs")}</td></tr>

  <!-- Internships -->
  ${featuredInterns.length ? `<tr><td>
    ${label("Internships", "Newest openings — apply early, these fill fast.")}
    ${roleTable(featuredInterns)}
  </td></tr>` : ""}

  <!-- Entry-level -->
  ${featuredJuniors.length ? `<tr><td>
    ${label("Entry-level · 0–2 years", "Full-time roles that don't ask for years of experience.")}
    ${roleTable(featuredJuniors)}
  </td></tr>` : ""}

  <!-- By field -->
  ${roleCounts.length ? `<tr><td>
    ${label("Open roles by field")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${roleCounts.map((r) => countRow(r, "roles")).join("")}</table>
  </td></tr>` : ""}

  <!-- Top hirers -->
  <tr><td>
    ${label("Hiring the most freshers")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${topCompanies.map((r) => countRow(r, "openings")).join("")}</table>
  </td></tr>

  <!-- Second CTA -->
  <tr><td style="padding:36px 0 0">${button(utm(fresherUrl, "cta-bottom"), `Browse all ${fmt(stats.early)} early roles`)}</td></tr>

  <!-- Tip -->
  <tr><td style="padding:40px 0 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:16px 18px;background:#ffffff;border:1px solid ${RULE};border-radius:12px">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ACCENT}">Tip</p>
        <p style="margin:0;font-size:14px;line-height:1.55;color:#475569">New roles land every few hours. Apply within the first 2–3 days of a posting — that's when recruiters are actually reading applications.</p>
      </td>
    </tr></table>
  </td></tr>

  <!-- Sign-off -->
  <tr><td style="padding:32px 0 0">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">
      Know a company hiring freshers that we're missing? Reply to this email — I read every one.
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
  `MAPPING HYD · FRESHERS & EARLY CAREER · ${today}`,
  "",
  "Your first job is probably on this list.",
  "",
  `${fmt(stats.interns)} internships · ${fmt(stats.juniors)} entry-level roles · ${fmt(stats.newThisWeek)} added this week`,
  "",
  "INTERNSHIPS",
  ...featuredInterns.map((j) => `- ${j.title} — ${j.company}\n  ${jobPage(j)}`),
  "",
  "ENTRY-LEVEL · 0–2 YEARS",
  ...featuredJuniors.map((j) => `- ${j.title} — ${j.company}\n  ${jobPage(j)}`),
  "",
  `All ${fmt(stats.early)} early roles: ${fresherUrl}`,
  "",
  "Reply to suggest a company. Reply \"unsubscribe\" to stop these emails.",
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

const unsubscribed = new Set(
  fs.existsSync(UNSUB_FILE)
    ? fs.readFileSync(UNSUB_FILE, "utf8").split(/\s+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
    : []
);

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
      if (unsubscribed.has(email)) continue;
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

console.log(`${DRY ? "DRY RUN" : "SENDING"} to ${EMAILS.length} recipient(s) — from: ${FROM}${unsubscribed.size ? ` (${unsubscribed.size} unsubscribed skipped)` : ""}`);
if (DRY) process.exit(0);

let sent = 0;
let failed = 0;
for (const email of EMAILS) {
  try {
    const r = await fetch("https://api.resend.com/emails", {
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
        tags: [{ name: "campaign", value: "early-roles" }],
      }),
    });
    const data = await r.json();
    if (r.ok) {
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
  await new Promise((res) => setTimeout(res, 600)); // stay under Resend's 2 req/s
}

console.log(`Done: ${sent} sent, ${failed} failed`);
process.exit(failed ? 1 : 0);
