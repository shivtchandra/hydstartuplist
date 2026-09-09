#!/usr/bin/env node
/**
 * Radar gap sweep — diff seeded candidates vs startups.json + radar.json.
 *
 * Usage:
 *   node scripts/radar-gap-sweep.mjs
 *   node scripts/radar-gap-sweep.mjs --source fundediq-hyd-recent
 *   node scripts/radar-gap-sweep.mjs --csv
 *   node scripts/radar-gap-sweep.mjs --miss-only
 *
 * Does NOT write map pins or ATS boards. Human verifies MISS rows, then:
 *   1) append to data/radar.json with geo:"hyd" + missReasons
 *   2) after address confirm → startups.json pin + optional ats-boards
 *
 * See data/radar.json → intake, and docs in scripts/radar-intake.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const STARTUPS = path.join(ROOT, "data", "startups.json");
const RADAR = path.join(ROOT, "data", "radar.json");
const CANDIDATES = path.join(ROOT, "data", "radar-candidates.json");
const ATS = path.join(ROOT, "data", "ats-boards.json");

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function classifyCareersHost(url) {
  if (!url) return "other";
  const u = String(url).toLowerCase();
  if (u.includes("jobs.gem.com")) return "gem";
  if (u.includes("zohorecruit") || u.includes("zoho.com/recruit")) return "zoho";
  if (u.includes("keka.com")) return "keka";
  if (u.includes("rippling.com")) return "rippling";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (u.includes("greenhouse.io") || u.includes("boards.greenhouse")) return "greenhouse";
  if (u.includes("lever.co")) return "lever";
  if (u.includes("myworkdayjobs.com")) return "workday";
  return "other";
}

function tokens(s) {
  return norm(s).split(" ").filter((t) => t.length > 1);
}

function namesMatch(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Avoid short false positives (e.g. Pulse → IMPULSEIQ)
  if (na.length < 5 || nb.length < 5) return false;
  if (na.includes(nb) || nb.includes(na)) {
    const ta = new Set(tokens(a));
    const tb = new Set(tokens(b));
    let overlap = 0;
    for (const t of ta) if (tb.has(t)) overlap++;
    // require at least one meaningful shared token when using includes
    return overlap >= 1 && (na.length >= 6 || overlap >= 2);
  }
  return false;
}

function findStartup(startups, name, website) {
  const host = website
    ? website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase()
    : "";
  const byName = startups.find((s) => namesMatch(s.name, name));
  if (byName) return byName;
  if (host && host.length > 4) {
    return startups.find((s) => {
      const w = (s.website || "").toLowerCase();
      return w.includes(host);
    });
  }
  return null;
}

function findRadar(radarEntries, name, website, careers) {
  const n = norm(name);
  return radarEntries.find((e) => {
    if (e.name && (norm(e.name) === n || norm(e.name).includes(n) || n.includes(norm(e.name)))) {
      return true;
    }
    if (careers && e.careers && e.careers.replace(/\/$/, "") === careers.replace(/\/$/, "")) {
      return true;
    }
    if (website && e.website && e.website.toLowerCase().includes(website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase())) {
      return true;
    }
    return false;
  });
}

function parseArgs(argv) {
  const out = { source: null, csv: false, missOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--csv") out.csv = true;
    else if (a === "--miss-only") out.missOnly = true;
    else if (a === "--source") out.source = argv[++i];
    else if (a.startsWith("--source=")) out.source = a.slice("--source=".length);
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv);
  const startups = JSON.parse(fs.readFileSync(STARTUPS, "utf8"));
  const radar = JSON.parse(fs.readFileSync(RADAR, "utf8"));
  const candFile = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  let boards = [];
  try {
    boards = JSON.parse(fs.readFileSync(ATS, "utf8"));
    if (!Array.isArray(boards)) boards = boards.boards || [];
  } catch {
    boards = [];
  }

  const radarHyd = (radar.entries || []).filter((e) => e.geo === "hyd");
  // Resolve radar hyd names via startupId for matching
  const idToName = new Map(startups.map((s) => [s.id, s.name]));
  const radarForMatch = (radar.entries || []).map((e) => ({
    ...e,
    name: e.name || idToName.get(e.startupId) || "",
  }));

  const sources = candFile.sources || {};
  const sourceKeys = opts.source ? [opts.source] : Object.keys(sources);
  const unknown = sourceKeys.filter((k) => !sources[k]);
  if (unknown.length) {
    console.error("Unknown --source:", unknown.join(", "));
    console.error("Available:", Object.keys(sources).join(", "));
    process.exit(1);
  }

  const rows = [];
  const seenNorm = new Set();

  for (const key of sourceKeys) {
    const src = sources[key];
    for (const c of src.candidates || []) {
      const keyN = norm(c.name);
      if (!keyN || seenNorm.has(keyN)) continue;
      seenNorm.add(keyN);

      let onMap = findStartup(startups, c.name, c.website);
      if (!onMap && Array.isArray(c.aka)) {
        for (const a of c.aka) {
          onMap = findStartup(startups, a, c.website);
          if (onMap) break;
        }
      }
      const onRadar = findRadar(radarForMatch, c.name, c.website, c.careers);
      const careers = c.careers || onMap?.careers || onRadar?.careers || null;
      const hostClass = classifyCareersHost(careers);
      const boarded = careers
        ? boards.some((b) => {
            const u = (b.url || b.careers || b.boardUrl || JSON.stringify(b)).toLowerCase();
            return careers && u.includes(careers.replace(/^https?:\/\//, "").split("/")[0].toLowerCase().replace(/^www\./, ""));
          })
        : false;

      let status = "MISS";
      if (onRadar && onMap) status = "ON_MAP+RADAR";
      else if (onRadar) status = "ON_RADAR";
      else if (onMap) status = "ON_MAP";

      rows.push({
        status,
        source: key,
        name: c.name,
        website: c.website || onMap?.website || "",
        careers: careers || "",
        careersHost: hostClass,
        suggestedMissReasons: (c.suggestedMissReasons || []).join("|"),
        mapName: onMap?.name || "",
        mapId: onMap?.id || "",
        radarGeo: onRadar?.geo || "",
        atsBoarded: boarded ? "yes" : "no",
        next:
          status === "MISS"
            ? "verify address → append radar.json geo:hyd"
            : status === "ON_MAP"
              ? "optional: add to radar.json if hard-to-find"
              : "ok",
      });
    }
  }

  const filtered = opts.missOnly ? rows.filter((r) => r.status === "MISS") : rows;
  const counts = { MISS: 0, ON_MAP: 0, ON_RADAR: 0, "ON_MAP+RADAR": 0 };
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;

  if (opts.csv) {
    const cols = [
      "status",
      "source",
      "name",
      "website",
      "careers",
      "careersHost",
      "suggestedMissReasons",
      "mapName",
      "mapId",
      "radarGeo",
      "atsBoarded",
      "next",
    ];
    console.log(cols.join(","));
    for (const r of filtered) {
      console.log(cols.map((c) => JSON.stringify(r[c] ?? "")).join(","));
    }
  } else {
    console.log("Radar gap sweep");
    console.log("sources:", sourceKeys.join(", "));
    console.log(
      `totals: MISS=${counts.MISS || 0} ON_MAP=${counts.ON_MAP || 0} ON_RADAR=${counts.ON_RADAR || 0} ON_MAP+RADAR=${counts["ON_MAP+RADAR"] || 0} (unique names=${rows.length})`
    );
    console.log("");
    const order = ["MISS", "ON_MAP", "ON_RADAR", "ON_MAP+RADAR"];
    for (const st of order) {
      const group = filtered.filter((r) => r.status === st);
      if (!group.length) continue;
      console.log(`=== ${st} (${group.length}) ===`);
      for (const r of group) {
        const host = r.careersHost !== "other" ? ` [${r.careersHost}]` : "";
        const reasons = r.suggestedMissReasons ? ` miss=${r.suggestedMissReasons}` : "";
        console.log(`- ${r.name}${host}${reasons}`);
        if (r.careers) console.log(`    careers: ${r.careers}`);
        if (r.website) console.log(`    web: ${r.website}`);
        console.log(`    next: ${r.next}`);
      }
      console.log("");
    }
    console.log("Intake: verify MISS → data/radar.json geo:hyd + missReasons → address confirm → startups.json (+ ATS).");
    console.log("Details: scripts/radar-intake.md");
  }
}

main();
