// Fix the Area filter/Areas-view undercounting: registry-derived entries all
// got a hardcoded area:"Hyderabad" placeholder at seed time, even though their
// REAL geocoded address (from Places, already fetched) usually names a real
// locality (e.g. "...Financial District, Gachibowli, Hyderabad..."). The area
// filter groups by the `area` field, not `address`, so those companies were
// invisible under their real neighborhood. This backfills `area` from
// `address` wherever a known Hyderabad tech-hub name is found.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");

// Ordered most-specific-first so e.g. "Nanakramguda, Financial District" matches
// "Financial District" (the well-known umbrella name) not the raw sub-locality.
const HUBS = [
  "Financial District", "HITEC City", "Hitech City", "Gachibowli", "Madhapur",
  "Kondapur", "Nanakramguda", "Raidurg", "Jubilee Hills", "Banjara Hills",
  "Begumpet", "Kukatpally", "Somajiguda", "Ameerpet", "Secunderabad",
  "Nacharam", "Uppal", "Malkajgiri", "Shamshabad", "Kompally", "Miyapur",
  "Manikonda", "LB Nagar", "Dilsukhnagar", "Kokapet", "Narsingi", "Attapur",
  "Moosapet", "IIIT-H", "IIIT Hyderabad", "University of Hyderabad", "Balanagar",
  "Kothaguda", "Kavuri Hills", "Sanath Nagar", "Erragadda", "Punjagutta",
  "Himayath Nagar", "Abids", "Khairatabad",
];

// Canonicalize spelling variants that would otherwise split one real
// neighborhood into two buckets.
const ALIASES = { "Hitech City": "HITEC City" };

function hubFrom(address) {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const hub of HUBS) {
    if (lower.includes(hub.toLowerCase())) return ALIASES[hub] || hub;
  }
  return null;
}

const data = JSON.parse(fs.readFileSync(DB, "utf-8"));
let changed = 0;

for (const entry of data) {
  const hub = hubFrom(entry.address);
  if (hub && normalizeCompare(entry.area) !== hub) {
    entry.area = `${hub}, Hyderabad`;
    changed++;
  }
}

function normalizeCompare(area) {
  return (area || "").split(",")[0].trim();
}

fs.writeFileSync(DB, JSON.stringify(data, null, 2));
console.log(`Backfilled area for ${changed} of ${data.length} entries from their real geocoded address.`);
