#!/usr/bin/env node
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local") });

const MODE = process.env.MODE || "preview";
const CONFIRM_SEND = process.env.CONFIRM_SEND === "1";
const RECIPIENT_FILE = path.join(ROOT, ".mini", "gmail-signups.txt");
const SENT_FILE = path.join(ROOT, ".mini", "today-early-career-sent.txt");
const PREVIEW_FILE = path.join(ROOT, ".mini", "today-early-career-email.html");
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.NEWSLETTER_FROM || "Mapping HYD <hello@mapmyhyd.com>";
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO || "shivachandra9490@gmail.com";
const SITE = "https://startups.mapmyhyd.com";
const CAMPAIGN = "early-career-drop-2026-10-29";

const jobs = [
  {
    title: "Trust & Safety New Associate",
    company: "Accenture",
    location: "Hyderabad",
    note: "Entry-level associate role",
    url: "https://accenture.wd103.myworkdayjobs.com/en-US/AccentureCareers/job/Hyderabad/Trust---Safety-New-Associate_AIOC-S01671923-1",
  },
  {
    title: "Business Advisory New Associate",
    company: "Accenture",
    location: "Hyderabad",
    note: "Entry-level business advisory role",
    url: "https://accenture.wd103.myworkdayjobs.com/en-US/AccentureCareers/job/Hyderabad/Business-Advisory-New-Associate_AIOC-S01671917-1",
  },
  {
    title: "Project Management Apprenticeship",
    company: "State Street",
    location: "Hyderabad",
    note: "Apprenticeship opportunity",
    url: "https://statestreet.wd1.myworkdayjobs.com/Global/job/Hyderabad-India/Project-Management-Apprenticeship_R-797303/apply",
  },
  {
    title: "Associate — Finance & Accounting",
    company: "Genpact",
    location: "Hafeezpet, Hyderabad",
    note: "Associate-level finance role",
    url: "https://genpact.wd108.myworkdayjobs.com/en-US/External_Careers/job/1401-G-India-Floor-1-to-12-Hafeezpet-Phoenix-Hyderabad/Associate---F-A---I2C-5A_JR10027889",
  },
  {
    title: "Business Development Representative",
    company: "Phizenix",
    location: "Remote",
    note: "Early-career role · 1+ year",
    url: "https://job-boards.greenhouse.io/phizenix/jobs/5466532008",
  },
  {
    title: "Campus Crew Ambassador",
    company: "HackerRank",
    location: "Remote",
    note: "Student program",
    url: "https://job-boards.greenhouse.io/hackerrank/jobs/7405039",
  },
];

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const roleRows = jobs.map((job, index) => `
  <tr>
    <td style="padding:0 34px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="42" valign="top" style="padding:23px 0;border-top:1px solid #ded8cf;color:#9a9185;font:600 12px/1.5 Arial,sans-serif;letter-spacing:.08em;">${String(index + 1).padStart(2, "0")}</td>
          <td valign="top" style="padding:20px 0;border-top:1px solid #ded8cf;">
            <a href="${esc(job.url)}" style="color:#141414;text-decoration:none;font:700 19px/1.35 Arial,sans-serif;letter-spacing:-.01em;">${esc(job.title)}</a>
            <div style="padding-top:7px;color:#5c574f;font:500 14px/1.5 Arial,sans-serif;">${esc(job.company)} &nbsp;·&nbsp; ${esc(job.location)}</div>
            <div style="padding-top:2px;color:#81796e;font:400 13px/1.5 Arial,sans-serif;">${esc(job.note)}</div>
            <div style="padding-top:14px;"><a href="${esc(job.url)}" style="display:inline-block;color:#e44b20;text-decoration:none;font:700 13px/1.4 Arial,sans-serif;letter-spacing:.02em;">VIEW ROLE AND APPLY&nbsp;&nbsp;→</a></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`).join("");

const subject = "Hiring today: 6 entry-level roles worth opening";
const preheader = "New associate, apprenticeship and student opportunities found and verified today.";

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eee9e0;color:#141414;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eee9e0;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#fffdf9;border:1px solid #ded8cf;">
        <tr><td style="height:8px;background:#e44b20;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:28px 34px 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="color:#141414;font:800 14px/1 Arial,sans-serif;letter-spacing:.12em;">MAPPING HYD</td>
                <td align="right" style="color:#81796e;font:500 12px/1 Arial,sans-serif;letter-spacing:.05em;">29 OCTOBER 2026</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 34px 34px;background:#171717;color:#fffdf9;">
            <div style="color:#e97550;font:700 11px/1.3 Arial,sans-serif;letter-spacing:.18em;">THE EARLY-CAREER DROP</div>
            <h1 style="margin:16px 0 14px;font:800 40px/1.04 Arial,sans-serif;letter-spacing:-.045em;">Six roles.<br>Worth opening today.</h1>
            <p style="max-width:480px;margin:0;color:#cfc9bf;font:400 16px/1.6 Arial,sans-serif;">New associate, apprenticeship and student opportunities discovered across Hyderabad and remote teams.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 34px 10px;">
            <p style="margin:0;color:#5c574f;font:400 15px/1.65 Arial,sans-serif;">Each opening was newly found and checked by Mapping HYD today. Every link below takes you directly to the employer's application page.</p>
          </td>
        </tr>
        ${roleRows}
        <tr>
          <td style="padding:34px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1ede6;">
              <tr><td style="padding:25px 26px;">
                <div style="color:#141414;font:700 18px/1.4 Arial,sans-serif;">Looking for something else?</div>
                <div style="padding-top:6px;color:#6f685e;font:400 14px/1.55 Arial,sans-serif;">Browse thousands of current roles across Hyderabad's startups, GCCs and product companies.</div>
                <div style="padding-top:17px;"><a href="${SITE}/jobs?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=${CAMPAIGN}" style="display:inline-block;background:#e44b20;color:#fff;text-decoration:none;padding:12px 18px;font:700 13px/1 Arial,sans-serif;letter-spacing:.03em;">EXPLORE ALL OPEN ROLES</a></div>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 34px 32px;border-top:1px solid #ded8cf;color:#81796e;font:400 12px/1.65 Arial,sans-serif;">
            <strong style="color:#141414;">Mapping HYD</strong><br>
            Every startup, GCC and tech job in Hyderabad, on one map.<br><br>
            These roles were newly found today; their original posting dates may differ. Openings can close without notice.<br><br>
            You're receiving this because you signed up on Mapping HYD. Reply “unsubscribe” to stop these emails.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const text = [
  "THE EARLY-CAREER DROP — 29 OCTOBER 2026",
  "",
  "Six roles worth opening today.",
  "New associate, apprenticeship and student opportunities found and verified today.",
  "",
  ...jobs.flatMap((job, index) => [
    `${String(index + 1).padStart(2, "0")}  ${job.title}`,
    `${job.company} · ${job.location} · ${job.note}`,
    job.url,
    "",
  ]),
  `Explore all open roles: ${SITE}/jobs`,
  "",
  "These roles were newly found today; their original posting dates may differ.",
  "Reply unsubscribe to stop these emails.",
].join("\n");

if (MODE === "preview") {
  fs.mkdirSync(path.dirname(PREVIEW_FILE), { recursive: true });
  fs.writeFileSync(PREVIEW_FILE, html);
  console.log(`Preview written to ${PREVIEW_FILE}`);
  process.exit(0);
}

if (MODE !== "send") throw new Error(`Unknown MODE: ${MODE}`);
if (!CONFIRM_SEND) throw new Error("Set CONFIRM_SEND=1 to send");
if (!RESEND_KEY) throw new Error("RESEND_API_KEY is missing");
if (!fs.existsSync(RECIPIENT_FILE)) throw new Error("Recipient list is missing");

const allRecipients = fs.readFileSync(RECIPIENT_FILE, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim().toLowerCase())
  .filter((line) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(line));
const sentBefore = new Set(
  fs.existsSync(SENT_FILE)
    ? fs.readFileSync(SENT_FILE, "utf8").split(/\s+/).filter(Boolean)
    : []
);
const recipients = allRecipients.filter((email) => !sentBefore.has(email));

if (!recipients.length) {
  console.log(`Nothing to send: all ${allRecipients.length} recipients are complete`);
  process.exit(0);
}
console.log(`Sending ${CAMPAIGN} to ${recipients.length} pending recipients from ${FROM}`);

let sent = 0;
let failed = 0;
for (const email of recipients) {
  const key = crypto.createHash("sha256").update(`${CAMPAIGN}:${email}`).digest("hex").slice(0, 32);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${CAMPAIGN}-${key}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        reply_to: REPLY_TO,
        subject,
        html,
        text,
        headers: { "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>` },
        tags: [{ name: "campaign", value: CAMPAIGN }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    sent += 1;
    fs.appendFileSync(SENT_FILE, `${email}\n`);
    console.log(`sent ${email} ${data.id || ""}`.trim());
  } catch (error) {
    failed += 1;
    console.error(`failed ${email}: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 600));
}

console.log(`Done: ${sent} sent, ${failed} failed`);
process.exit(failed ? 1 : 0);
