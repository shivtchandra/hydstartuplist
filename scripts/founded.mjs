// Focused est-year pass: query the Startup India registry by name and store the
// registration year as `founded`. API-only (no website fetches), sequential —
// so the registry API isn't choked (that's what starved the earlier combined run).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");
const UA = { "User-Agent": "Mozilla/5.0 (founded)" };
const SIH_API = "https://api.startupindia.gov.in/sih/api/noauth/search/profiles";
const TELANGANA = "5f48ce592a9bb065cdf9fb3c";
const HYD_CITY = "5f48ce5a2a9bb065cdf9fd3d";
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function foundedYear(name) {
  try {
    const r = await fetch(SIH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...UA },
      body: JSON.stringify({
        query: name, states: [TELANGANA], cities: [HYD_CITY], roles: ["Startup"],
        industries: [], sectors: [], stages: [], badges: [], page: 0, count: 10,
      }),
      signal: AbortSignal.timeout(9000),
    });
    const d = await r.json();
    const items = d.content || [];
    const n = norm(name);
    const hit = items.find((p) => norm(p.name) === n)
      || items.find((p) => norm(p.name).includes(n) || n.includes(norm(p.name)));
    if (!hit) return null;
    const ts = hit.registeredOn || hit.publishedOn;
    if (!ts) return null;
    const y = new Date(ts).getFullYear();
    return y > 1990 && y <= new Date().getFullYear() ? y : null;
  } catch {
    return null;
  }
}

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
let dated = 0;
for (let i = 0; i < data.length; i++) {
  const e = data[i];
  if (e.founded) { dated++; continue; }
  const y = await foundedYear(e.name);
  if (y) { e.founded = y; dated++; }
  if ((i + 1) % 100 === 0) {
    console.log(`…${i + 1}/${data.length}, dated ${dated}`);
    fs.writeFileSync(DB, JSON.stringify(data, null, 2)); // periodic save
  }
}
fs.writeFileSync(DB, JSON.stringify(data, null, 2));
console.log(`\nDone. est-year on ${dated} of ${data.length}.`);
