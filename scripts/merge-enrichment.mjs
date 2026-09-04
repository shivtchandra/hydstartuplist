// Fold data/enrichment.json (agent-researched, keyed by startup id) into
// data/startups.json. Additive only: sets descriptionLong / services / oneLiner,
// and founded ONLY when the entry has none. Never touches description, name,
// website, or coordinates. Idempotent — safe to re-run after each research batch.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "startups.json");
const ENRICH = path.join(__dirname, "..", "data", "enrichment.json");

const startups = JSON.parse(fs.readFileSync(DB, "utf-8"));
const enrichment = fs.existsSync(ENRICH)
  ? JSON.parse(fs.readFileSync(ENRICH, "utf-8"))
  : {};

const clean = (s) => (typeof s === "string" ? s.trim() : s);
let touched = 0,
  skipped = 0;

for (const s of startups) {
  const e = enrichment[s.id];
  if (!e || e.skipped) {
    if (e?.skipped) skipped++;
    continue;
  }

  const long = clean(e.descriptionLong);
  if (long && long.length >= 40) s.descriptionLong = long;

  const one = clean(e.oneLiner);
  if (one) s.oneLiner = one;

  if (Array.isArray(e.services)) {
    const svc = [...new Set(e.services.map(clean).filter(Boolean))].slice(0, 6);
    if (svc.length) s.services = svc;
  }

  const year = Number(e.founded);
  if (!s.founded && year > 1990 && year <= new Date().getFullYear()) {
    s.founded = year;
  }

  if (Array.isArray(e.sources) && e.sources.length) s.enrichSources = e.sources;
  s.enrichedAt = e.enrichedAt || new Date().toISOString();
  touched++;
}

fs.writeFileSync(DB, JSON.stringify(startups, null, 2));
console.log(
  `merged ${touched} enriched entr${touched === 1 ? "y" : "ies"} into ${startups.length} startups (${skipped} marked skipped, ${
    Object.keys(enrichment).length
  } total in enrichment.json).`
);
