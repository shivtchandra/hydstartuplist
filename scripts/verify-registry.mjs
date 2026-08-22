// Cross-verify registry entries against their actual website content and drop
// wrong Places matches (e.g. a company name that resolved to a doctor/clinic).
// Only entries whose website domain shares NO word with the company name are
// fetched and checked — those are the suspicious ones. If the fetched page also
// doesn't mention the company, it's a bad match and gets removed.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");
const UA = { "User-Agent": "Mozilla/5.0" };
const APPLY = process.env.APPLY === "1"; // dry-run unless APPLY=1

const MED = /plasticsurg|dental|\bclinic\b|hospital|dermat|orthop|physio|\bivf\b|fertility|aesthetic|surgeon|cosmetic|homeo|ayurved|laparoscopy|bariatric/i;
const STOP = new Set(["technology", "technologies", "solutions", "solution", "systems", "system",
  "services", "service", "software", "private", "limited", "pvt", "ltd", "llp", "india", "labs",
  "lab", "global", "group", "enterprises", "enterprise", "digital", "tech", "consulting", "infotech"]);
// Pages that block bots — we can't verify, so we must NOT drop on these.
const CHALLENGE = /just a moment|attention required|cloudflare|not acceptable|access denied|403 forbidden|enable javascript|are you human/i;

function tokens(name) {
  return [...new Set(name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP.has(t)))];
}
function alnum(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function domainLabel(website) {
  try { return alnum(new URL(website).hostname.replace(/^www\./, "").split(".")[0]); }
  catch { return ""; }
}
async function fetchTitleText(url) {
  try {
    const html = await (await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(9000) })).text();
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "").toLowerCase();
    const text = html.replace(/<[^>]+>/g, " ").slice(0, 4000).toLowerCase();
    return { title, text };
  } catch { return { title: "", text: "", err: true }; }
}

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
const removed = [];
const kept = [];

for (const x of data) {
  if (x.locSource !== "startupindia+places") { kept.push(x); continue; }

  // Medical/clinic site under a non-health sector -> wrong match, drop first
  // (even if the domain contains the name, e.g. a doctor's own name).
  if (MED.test(x.website || "") && x.sector !== "Healthtech") {
    removed.push({ name: x.name, website: x.website, why: "medical/personal site", title: "" });
    continue;
  }

  const toks = tokens(x.name);
  const nameA = alnum(x.name);
  const dom = domainLabel(x.website || "");

  // Fast pass: brand domain relates to the name. Handles: substring/token match,
  // acronym domains ("bietls" for "B I E T Learning Systems", "syvminds" for
  // "Sri Yantra Vidya…"), and shared word-start ("eonverse" for "Eonn Universe").
  const initials = x.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map((w) => w[0]).join("");
  const domainMatches = dom.length >= 3 && (
    nameA.includes(dom) ||
    toks.some((t) => dom.includes(t) || t.includes(dom)) ||
    (initials.length >= 3 && (dom.startsWith(initials.slice(0, 3)) || dom.includes(initials.slice(0, 4)))) ||
    (nameA.length >= 3 && nameA.slice(0, 3) === dom.slice(0, 3))
  );
  if (domainMatches) { kept.push(x); continue; }

  // Suspicious: verify against the live site.
  const { title, text, err } = await fetchTitleText(x.website || "");
  const blob = `${title} ${text}`;
  const nameInPage = toks.some((t) => blob.includes(t)) || (nameA.length >= 5 && blob.replace(/[^a-z0-9]/g, "").includes(nameA));
  const medical = MED.test(x.website || "") || MED.test(title);

  // High-confidence drop: a doctor/clinic site under a non-health sector.
  if (medical && x.sector !== "Healthtech") {
    removed.push({ name: x.name, website: x.website, why: "medical/personal site", title: title.slice(0, 50) });
    continue;
  }
  // Inconclusive (bot-blocked or unreachable) -> KEEP, don't risk a false drop.
  if (err || !title || CHALLENGE.test(blob)) { kept.push(x); continue; }
  // Reachable real page that never mentions the company -> wrong match, drop.
  if (!nameInPage) {
    removed.push({ name: x.name, website: x.website, why: "name absent from live site", title: title.slice(0, 50) });
    continue;
  }
  kept.push(x);
}

console.log(`registry checked. removing ${removed.length} bad matches:`);
for (const r of removed) console.log(`  DROP ${r.name} -> ${r.website} [${r.why}] ${r.title}`);

if (APPLY) {
  fs.writeFileSync(DB, JSON.stringify(kept, null, 2));
  console.log(`\nAPPLIED. total now ${kept.length} (was ${data.length}).`);
} else {
  console.log(`\nDRY RUN. re-run with APPLY=1 to remove. would keep ${kept.length}.`);
}
