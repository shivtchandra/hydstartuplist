// Adds two fields to each startup:
//   active  — is the website live (HTTP ok + not a parked/for-sale page)?
//   founded — establishment year (Startup India registration date as proxy).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");
const FLAGGED = path.join(__dirname, "..", "data", "flagged.json");
const UA = { "User-Agent": "Mozilla/5.0 (meta-enrich)" };

const SIH_API = "https://api.startupindia.gov.in/sih/api/noauth/search/profiles";
const TELANGANA = "5f48ce592a9bb065cdf9fb3c";
const HYD_CITY = "5f48ce5a2a9bb065cdf9fd3d";

const PARKED = /domain (is )?for sale|buy this domain|is parked|parked free|godaddy\.com\/domain|sedoparking|this domain has expired|domain expired|coming soon\s*<|under construction/i;

async function checkActive(website) {
  try {
    const r = await fetch(website, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    const t = (await r.text()).slice(0, 5000);
    if (PARKED.test(t)) return false;
    return true;
  } catch {
    return false;
  }
}

async function foundedYear(name) {
  try {
    const r = await fetch(SIH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...UA },
      body: JSON.stringify({
        query: name, states: [TELANGANA], cities: [HYD_CITY], roles: ["Startup"],
        industries: [], sectors: [], stages: [], badges: [], page: 0, count: 5,
      }),
      signal: AbortSignal.timeout(6000),
    });
    const d = await r.json();
    const items = d.content || [];
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const hit = items.find((p) => norm(p.name) === norm(name))
      || items.find((p) => norm(p.name).includes(norm(name)) || norm(name).includes(norm(p.name)));
    if (!hit?.registeredOn) return null;
    const y = new Date(hit.registeredOn).getFullYear();
    return y > 1990 && y <= new Date().getFullYear() ? y : null;
  } catch {
    return null;
  }
}

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
let active = 0, dead = 0, dated = 0;

for (let i = 0; i < data.length; i++) {
  const e = data[i];
  const [isActive, year] = await Promise.all([
    e.website ? checkActive(e.website) : Promise.resolve(false),
    foundedYear(e.name),
  ]);
  e.active = isActive;
  e.activeCheckedAt = new Date().toISOString();
  if (year) { e.founded = year; dated++; }
  if (isActive) active++; else dead++;
  if ((i + 1) % 100 === 0) console.log(`…${i + 1}/${data.length} | active ${active}, dead ${dead}, dated ${dated}`);
}

// Partition: proper (active + has website) stay on the map; the rest — dead
// sites, parked domains, missing websites — go to a separate flagged list.
const proper = [], flagged = [];
for (const e of data) {
  if (e.active && e.website) {
    proper.push(e);
  } else {
    e.flagReason = !e.website ? "no-website" : "inactive-site";
    flagged.push(e);
  }
}
// Never let the map collapse if a mass-outage skews the check: keep prior
// flagged too, don't clobber with a smaller set.
let priorFlagged = [];
try { priorFlagged = JSON.parse(fs.readFileSync(FLAGGED, "utf-8")); } catch {}
const flaggedIds = new Set(flagged.map((x) => x.id));
const mergedFlagged = [...flagged, ...priorFlagged.filter((x) => !flaggedIds.has(x.id))];

fs.writeFileSync(DB, JSON.stringify(proper, null, 2));
fs.writeFileSync(FLAGGED, JSON.stringify(mergedFlagged, null, 2));
console.log(`\nDone. checked ${data.length}: active ${active}, inactive ${dead}, est-year ${dated}.`);
console.log(`Main map: ${proper.length} proper. Flagged list: ${flagged.length} (dead/no-site).`);
