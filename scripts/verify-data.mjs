// Data-quality audit: verify each startup has a real LOGO and a correct ADDRESS.
//
//   LOGO    — favicon exists and isn't Google's blank default globe.
//   ADDRESS — re-query Places by name; the matched place's website domain must
//             equal our stored domain (strongest proof the address is really
//             this company's), and its coords must be near our stored coords.
//
// Non-destructive: writes data/verify-report.json + prints a summary.
//   node scripts/verify-data.mjs           (all)
//   LIMIT=50 node scripts/verify-data.mjs  (sample)
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });
const DB = path.join(__dirname, "..", "data", "startups.json");
const REPORT = path.join(__dirname, "..", "data", "verify-report.json");
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const LIMIT = parseInt(process.env.LIMIT || "0", 10);
const UA = { "User-Agent": "Mozilla/5.0 (verify)" };

function domainOf(website) {
  try { return new URL(website).hostname.replace(/^www\./, ""); } catch { return null; }
}
function sha1(buf) { return crypto.createHash("sha1").update(buf).digest("hex"); }

async function faviconHash(domain) {
  try {
    const r = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`, { headers: UA, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return { hash: null, size: 0 };
    const b = Buffer.from(await r.arrayBuffer());
    return { hash: sha1(b), size: b.length };
  } catch { return { hash: null, size: 0 }; }
}

// Haversine distance in km.
function distKm(a, b, c, d) {
  const R = 6371, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(c - a), dLng = toR(d - b);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a)) * Math.cos(toR(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function placeByName(name, area) {
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.websiteUri" },
    body: JSON.stringify({ textQuery: `${name} ${area || "Hyderabad"}`, maxResultCount: 1, regionCode: "IN" }),
    signal: AbortSignal.timeout(7000),
  });
  const d = await r.json();
  return d.places?.[0] || null;
}

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
const targets = LIMIT ? data.slice(0, LIMIT) : data;

// Establish Google's default (blank globe) favicon signature.
const def = await faviconHash("no-such-domain-xyz-9137.com");
const DEFAULT_HASHES = new Set([def.hash].filter(Boolean));

const report = [];
let noLogo = 0, addrMismatch = 0, addrUnverified = 0, ok = 0;

for (let i = 0; i < targets.length; i++) {
  const e = targets[i];
  const domain = domainOf(e.website);

  // Logo
  let logoOk = false;
  if (domain) {
    const f = await faviconHash(domain);
    logoOk = !!f.hash && !DEFAULT_HASHES.has(f.hash) && f.size > 70;
  }

  // Address
  let addrStatus = "unverified", placeDomain = null, km = null;
  if (e.lat && e.lng) {
    let hit = null;
    try { hit = await placeByName(e.name, e.area); } catch { hit = null; }
    if (hit) {
      placeDomain = domainOf(hit.websiteUri || "");
      const loc = hit.location;
      if (loc) km = +distKm(e.lat, e.lng, loc.latitude, loc.longitude).toFixed(2);
      const nrm = (s) => (s || "").split(".")[0].replace(/[^a-z0-9]/g, "");
      const domainsAgree = placeDomain && domain && (placeDomain === domain || nrm(placeDomain) === nrm(domain));
      if (domainsAgree) addrStatus = "match";                        // same company
      else if (km != null && km <= 1.5) addrStatus = "location-ok";  // right spot (domain variant/rebrand/incubator host)
      else if (placeDomain && domain && km != null && km > 1.5) addrStatus = "domain-mismatch"; // real: different place, far
      else addrStatus = "unverified";
    }
  }

  const issues = [];
  if (!logoOk) { issues.push("no-logo"); noLogo++; }
  if (addrStatus === "domain-mismatch") { issues.push("address-domain-mismatch"); addrMismatch++; }
  else if (addrStatus === "unverified") { issues.push("address-unverified"); addrUnverified++; }
  if (!issues.length) ok++;

  if (issues.length) {
    report.push({ id: e.id, name: e.name, website: e.website, area: e.area,
      logoOk, addrStatus, placeDomain, km, issues });
  }
  if ((i + 1) % 100 === 0) {
    console.log(`…${i + 1}/${targets.length} | flagged ${report.length}`);
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2)); // checkpoint
  }
}

fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log(`\nDone. checked ${targets.length}.`);
console.log(`clean: ${ok} | no-logo: ${noLogo} | address-mismatch: ${addrMismatch} | address-unverified: ${addrUnverified}`);
console.log(`Flagged ${report.length} entries -> data/verify-report.json`);
