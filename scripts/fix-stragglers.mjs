import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });
const OUT = path.join(__dirname, "..", "data", "startups.json");
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const IN_HYD = (lat, lng) => lat > 17.0 && lat < 17.75 && lng > 78.0 && lng < 78.85;

// Targets: name -> extra query hint for a better Places match.
const TARGETS = {
  "Landeed": "Landeed land records app office",
  "Zuddl": "Zuddl office",
  "Reclaim Protocol": "Reclaim Protocol office",
  "Cusmat Tech": "Cusmat Technologies office",
  "GoKwik": "GoKwik office",
  "Cosmoserve Space": "Cosmoserve Space office",
  "Donatekart": "Donatekart office",
  "Helex": "Helex Biotech office",
  "Adya": "Adya software office",
};

async function lookup(query) {
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.websiteUri",
    },
    body: JSON.stringify({ textQuery: `${query} Hyderabad`, maxResultCount: 1, regionCode: "IN" }),
  });
  const d = await resp.json();
  return d.places?.[0] || null;
}

const data = JSON.parse(fs.readFileSync(OUT, "utf-8"));
for (const [name, hint] of Object.entries(TARGETS)) {
  const entry = data.find((x) => x.name === name);
  if (!entry) { console.log(`? ${name}: not in data`); continue; }
  const hit = await lookup(hint);
  const lat = hit?.location?.latitude, lng = hit?.location?.longitude;
  if (hit && lat != null && IN_HYD(lat, lng)) {
    entry.lat = lat; entry.lng = lng;
    entry.address = hit.formattedAddress || entry.address;
    entry.locSource = "places-fixed";
    if (!entry.website && hit.websiteUri) {
      try { entry.website = new URL(hit.websiteUri).origin; } catch {}
    }
    console.log(`FIXED ${name}: ${lat.toFixed(4)},${lng.toFixed(4)} | ${entry.address} | web=${entry.website || "none"}`);
  } else {
    console.log(`MISS  ${name}: no Hyderabad office found (${hit?.formattedAddress || "no result"})`);
  }
}
fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log("\nsaved.");
