import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const RAW_PATH = path.join(__dirname, "..", "data", "startups-raw.json");
const OUT_PATH = path.join(__dirname, "..", "data", "startups.json");
const KEY = process.env.GOOGLE_MAPS_API_KEY;

// Hyderabad bounding box — reject Places matches that resolve elsewhere.
const IN_HYD = (lat, lng) => lat > 17.0 && lat < 17.75 && lng > 78.0 && lng < 78.85;

// Real office location via Places Text Search on the company name.
async function placeLookup(name) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", `${name} Hyderabad`);
  url.searchParams.set("key", KEY);
  const data = await (await fetch(url)).json();
  const r = data.results?.[0];
  if (!r) return null;
  const { lat, lng } = r.geometry.location;
  if (!IN_HYD(lat, lng)) return null;
  return { lat, lng, address: r.formatted_address };
}

// Fallback: geocode the entry's locality text.
async function geocodeArea(area) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", `${area}, Hyderabad, Telangana, India`);
  url.searchParams.set("key", KEY);
  const data = await (await fetch(url)).json();
  if (data.status !== "OK") return null;
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, address: `${area}, Hyderabad` };
}

// Careers page: use {domain}/careers if it responds 200, else a LinkedIn jobs search.
async function careersFor(website, name) {
  if (!website) return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name)}`;
  try {
    const u = new URL(website);
    const guess = `${u.origin}/careers`;
    const resp = await fetch(guess, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (resp.ok) return guess;
  } catch {}
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name)}`;
}

const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf-8"));
const out = [];

for (const entry of raw) {
  let loc = await placeLookup(entry.name);
  let source = "places";
  if (!loc) {
    loc = await geocodeArea(entry.area);
    source = "geocode-area";
  }
  const careers = await careersFor(entry.website, entry.name);
  out.push({
    id: randomUUID(),
    ...entry,
    careers,
    address: loc ? loc.address : null,
    lat: loc ? loc.lat : null,
    lng: loc ? loc.lng : null,
    locSource: source,
    status: "approved",
  });
  console.log(`${entry.name}: [${source}] ${loc ? `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}` : "FAILED"} | ${loc?.address || ""}`);
}

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
console.log(`\nwrote ${out.length} entries to ${OUT_PATH}`);
