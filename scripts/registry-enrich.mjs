// Pull tech (IT Services) startups from the Startup India registry, then keep
// ONLY those where Google Places gives both a real Hyderabad office AND a
// website. Those pass the same quality bar as the curated map entries.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const OUT_PATH = path.join(__dirname, "..", "data", "startups.json");
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAX_PAGES = parseInt(process.env.MAX_PAGES || "5", 10);

const SIH_API = "https://api.startupindia.gov.in/sih/api/noauth/search/profiles";
const TELANGANA = "5f48ce592a9bb065cdf9fb3c";
const HYD_CITY = "5f48ce5a2a9bb065cdf9fd3d";
// Tech industry facet IDs from the Startup India API.
const FACETS = {
  it: "5f48ce5f2a9bb065cdfa174d",        // IT Services (2373)
  ai: "5f48ce5f2a9bb065cdfa1733",        // AI (641)
  fintech: "5f48ce5f2a9bb065cdfa1747",   // Finance Technology (433)
  enterprise: "5f48ce5f2a9bb065cdfa1744",// Enterprise Software (392)
  hardware: "5f48ce5f2a9bb065cdfa1749",  // Technology Hardware (444)
};
const FACET_ID = FACETS[process.env.FACET || "it"];

const IN_HYD = (lat, lng) => lat > 17.0 && lat < 17.75 && lng > 78.0 && lng < 78.85;

// Registry industry -> our sector taxonomy.
function sectorFor(industries, sectors) {
  const all = [...(industries || []), ...(sectors || [])].join(" ").toLowerCase();
  if (all.includes("ai") || all.includes("artificial")) return "AI";
  if (all.includes("financ") || all.includes("fintech")) return "Fintech";
  if (all.includes("health") || all.includes("life")) return "Healthtech";
  if (all.includes("educat")) return "Edtech";
  if (all.includes("logistic") || all.includes("transport")) return "Logistics";
  return "SaaS"; // IT Services default
}

function cleanName(name) {
  return name
    .replace(/private limited|pvt\.?|ltd\.?|llp|limited|\.com|\.in/gi, "")
    .replace(/[^\w\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(page) {
  const body = {
    query: "", states: [TELANGANA], cities: [HYD_CITY], roles: ["Startup"],
    industries: [FACET_ID], sectors: [], stages: [], badges: [], page, count: 10,
  };
  const r = await fetch(SIH_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  return d.content || [];
}

// Reject search-engine / aggregator / social "websites" — not a real site.
const BAD_HOSTS = ["google.", "facebook.", "linkedin.", "justdial", "indiamart",
  "sulekha", "glassdoor", "instagram.", "twitter.", "x.com", "youtube.", "wa.me", "wixsite"];

// One Places API (New) searchText call returns address + website + coords —
// cheaper and faster than the classic Text Search + Place Details two-call flow.
async function placeDetails(name) {
  const clean = cleanName(name);
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.websiteUri",
    },
    body: JSON.stringify({ textQuery: `${clean} Hyderabad`, maxResultCount: 1, regionCode: "IN" }),
  });
  const data = await resp.json();
  const hit = data.places?.[0];
  if (!hit) return null;

  const lat = hit.location?.latitude, lng = hit.location?.longitude;
  if (lat == null || lng == null || !IN_HYD(lat, lng)) return null;
  if (!hit.websiteUri) return null; // must have a website

  // Name-match guard: a significant token of the company name must appear in
  // the matched place's name, else it's likely a wrong Places match.
  const dispName = (hit.displayName?.text || "").toLowerCase();
  const token = clean.toLowerCase().split(" ").find((t) => t.length > 3) || clean.toLowerCase();
  if (!dispName.includes(token)) return null;

  let origin;
  try {
    const u = new URL(hit.websiteUri);
    if (BAD_HOSTS.some((b) => u.hostname.includes(b))) return null;
    origin = u.origin;
  } catch {
    return null;
  }
  return { website: origin, address: hit.formattedAddress, lat, lng };
}

const out = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
const have = new Set(out.map((x) => x.name.toLowerCase()));
let kept = 0, seen = 0, skipped = 0;

for (let page = 0; page < MAX_PAGES; page++) {
  const profiles = await fetchPage(page);
  if (!profiles.length) break;
  for (const p of profiles) {
    seen++;
    if (have.has(p.name.toLowerCase())) continue;
    let det;
    try { det = await placeDetails(p.name); } catch { det = null; }
    if (!det) { skipped++; continue; }
    const sector = sectorFor(p.industries, p.sectors);
    out.push({
      id: randomUUID(),
      name: p.name,
      website: det.website,
      sector,
      fundingStage: (p.stages && p.stages[0]) || "Recognised",
      area: "Hyderabad",
      description: `${(p.industries || []).join(", ")}${p.sectors?.length ? " — " + p.sectors.join(", ") : ""}. DPIIT-recognised (${p.dippNumber}).`,
      careers: `${new URL(det.website).origin}/careers`,
      address: det.address,
      lat: det.lat,
      lng: det.lng,
      locSource: "startupindia+places",
      status: "approved",
    });
    have.add(p.name.toLowerCase());
    kept++;
    console.log(`  KEEP: ${p.name} -> ${det.website}`);
  }
  console.log(`page ${page}: seen=${seen} kept=${kept} skipped=${skipped}`);
}

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
console.log(`\nDone. processed ${seen}, kept ${kept}, total now ${out.length}`);
