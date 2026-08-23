// Legitimacy + careers audit.
//
//  FAKE / DEFUNCT  — website domain does NOT resolve (DNS failure) on two tries.
//                    A dead domain means the company's site doesn't exist; that
//                    is unambiguous, unlike a 403/timeout (live site blocking us).
//                    These move to flagged.json (reason: domain-dead).
//  CAREERS         — GET the careers URL. Keep it only if it returns 200.
//                    Otherwise drop it (careers = null) so no dead link is shown.
//
// Dry-run by default (writes a report, changes nothing). APPLY=1 to write.
//   node scripts/verify-legit.mjs
//   APPLY=1 node scripts/verify-legit.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");
const FLAGGED = path.join(__dirname, "..", "data", "flagged.json");
const REPORT = path.join(__dirname, "..", "data", "legit-report.json");
const APPLY = process.env.APPLY === "1";
const LIMIT = parseInt(process.env.LIMIT || "0", 10);
const UA = { "User-Agent": "Mozilla/5.0 (legit-check)" };

// A domain is "dead/unusable" when it fails to load for a structural reason:
//   • DNS doesn't resolve / connection refused
//   • the server BREAKS the TLS handshake (protocol error, TLS alert) — the
//     browser can't load it either (e.g. birdanalytics.ai ERR_SSL_PROTOCOL_ERROR)
// NOT dead (keep):
//   • timeouts / HTTP 403 — live site, just slow or blocking us
//   • Node cert-VALIDATION strictness that browsers accept anyway
//     (UNABLE_TO_VERIFY_LEAF_SIGNATURE, self-signed-in-chain, altname, expired) —
//     e.g. keka.com loads fine in a browser but Node can't build the chain.
const DEAD_CODES = new Set([
  "ENOTFOUND", "ECONNREFUSED", "EAI_AGAIN",
  "EPROTO", "ERR_SSL_PROTOCOL_ERROR", "ERR_SSL_WRONG_VERSION_NUMBER",
]);
// Cert-validation codes that browsers tolerate → treat the site as LIVE.
const CERT_STRICT_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT", "ERR_TLS_CERT_ALTNAME_INVALID", "CERT_HAS_EXPIRED",
]);

async function probe(url) {
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", headers: UA, signal: AbortSignal.timeout(8000) });
    return { status: r.status, dead: false };
  } catch (err) {
    const code = err?.cause?.code || err?.code || "";
    if (CERT_STRICT_CODES.has(code)) return { status: 0, dead: false, code }; // browser-OK
    // Server-rejected TLS handshake (alert) = genuinely broken, browser fails too.
    const handshakeBroken = DEAD_CODES.has(code) || /tlsv1_alert|ssl.*alert|wrong_version|sslv3|handshake\s*failure/i.test(code);
    return { status: 0, dead: handshakeBroken, code: code || err?.name };
  }
}

async function domainDead(url) {
  const a = await probe(url);
  if (!a.dead) return false;          // got a response OR a soft error (timeout) → exists
  const b = await probe(url);         // confirm DNS failure once more (avoid blips)
  return b.dead;
}

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
const targets = LIMIT ? data.slice(0, LIMIT) : data;

const fake = [];       // dead-domain entries to quarantine
const careersDropped = []; // entries whose careers link was removed
let checked = 0, keptCareers = 0;

for (const e of targets) {
  checked++;
  if (!e.website) { continue; }

  if (await domainDead(e.website)) {
    e.flagReason = "domain-dead";
    fake.push({ id: e.id, name: e.name, website: e.website });
    continue; // don't bother checking careers for a dead domain
  }

  // Careers reachability (only if it's a real /careers URL, not a LinkedIn fallback)
  if (e.careers && !e.careers.includes("linkedin.com")) {
    const c = await probe(e.careers);
    if (c.status === 200) {
      keptCareers++;
    } else {
      careersDropped.push({ name: e.name, careers: e.careers, status: c.status });
      if (APPLY) e.careers = null;
    }
  }

  if (checked % 100 === 0) console.log(`…${checked}/${targets.length} | fake ${fake.length}, careers-dropped ${careersDropped.length}`);
}

const report = { fake, careersDropped };
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

if (APPLY) {
  const fakeIds = new Set(fake.map((x) => x.id));
  const keep = data.filter((x) => !fakeIds.has(x.id));
  let prior = [];
  try { prior = JSON.parse(fs.readFileSync(FLAGGED, "utf-8")); } catch {}
  const dead = data.filter((x) => fakeIds.has(x.id));
  const priorKept = prior.filter((x) => !fakeIds.has(x.id));
  fs.writeFileSync(DB, JSON.stringify(keep, null, 2));
  fs.writeFileSync(FLAGGED, JSON.stringify([...dead, ...priorKept], null, 2));
  console.log(`\nAPPLIED. Removed ${fake.length} dead-domain (fake) → flagged.json. Dropped ${careersDropped.length} dead careers links. Map now ${keep.length}.`);
} else {
  console.log(`\nDRY RUN. Would remove ${fake.length} dead-domain (fake) entries and drop ${careersDropped.length} dead careers links.`);
  console.log(`Report → data/legit-report.json. Re-run with APPLY=1 to write.`);
}
