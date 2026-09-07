import { getApproved, visibleHiring } from "./store.js";
import { startupSlug } from "./slug.js";
import { getJobsByArea } from "./jobs.js";
import { industryKey, industrySlugForSector } from "./industries.js";

/** Crawlable company hub pages for Hyderabad tech corridors. */
export const AREA_LANDINGS = [
  {
    slug: "hitec-city",
    area: "HITEC City",
    title: "Startups in HITEC City, Hyderabad",
    description:
      "Product startups and tech companies based in HITEC City — Hyderabad’s primary IT hub around Cyber Towers and the Madhapur belt.",
    body: "HITEC City is Hyderabad’s densest IT campus cluster and a magnet for SaaS, fintech, and enterprise product teams. This page lists mapped startups with offices in or around HITEC City, with hiring signals and links into open roles.",
    match: ["hitec city", "hitec", "hitech city", "hi-tec city"],
  },
  {
    slug: "gachibowli",
    area: "Gachibowli",
    title: "Startups in Gachibowli, Hyderabad",
    description:
      "Startups in Gachibowli — the western tech corridor toward Nanakramguda and the Financial District.",
    body: "Gachibowli anchors Hyderabad’s western corridor with strong ORR and Metro access. Product companies and growth-stage teams cluster here alongside GCCs. Browse mapped startups based in Gachibowli below.",
    match: ["gachibowli"],
  },
  {
    slug: "madhapur",
    area: "Madhapur",
    title: "Startups in Madhapur, Hyderabad",
    description:
      "Startups in Madhapur and the HITEC City belt — one of Hyderabad’s highest-density product neighbourhoods.",
    body: "Madhapur sits next to HITEC City and hosts a dense mix of SaaS and product companies, coworking, and early-stage offices. This hub lists mapped Madhapur startups with funding stage and hiring context.",
    match: ["madhapur"],
  },
  {
    slug: "financial-district",
    area: "Financial District",
    title: "Startups in Financial District, Hyderabad",
    description:
      "Startups and growth companies in Hyderabad’s Financial District along the western Outer Ring Road.",
    body: "The Financial District mixes GCCs with growth-stage startups on the ORR stretch west of Gachibowli. Roles and offices skew mid-to-senior. Track mapped companies tied to this corridor here.",
    match: ["financial district"],
  },
];

export function areaLanding(slug) {
  return AREA_LANDINGS.find((a) => a.slug === String(slug || "").toLowerCase()) || null;
}

function cleanAreaName(area) {
  if (!area) return "";
  return String(area)
    .replace(/,\s*(Hyderabad|Telangana|India|Andhra Pradesh)\b.*$/gi, "")
    .trim();
}

/** Map a free-text area label to a /areas/[slug] when we have a hub page. */
export function areaSlugForName(areaName) {
  const cleaned = cleanAreaName(areaName).toLowerCase();
  if (!cleaned) return null;
  for (const landing of AREA_LANDINGS) {
    if (cleaned === landing.area.toLowerCase()) return landing.slug;
    for (const m of landing.match) {
      if (cleaned === m || cleaned.includes(m)) return landing.slug;
    }
  }
  return null;
}

function startupMatchesArea(s, landing) {
  const raw = String(s.area || "").toLowerCase();
  if (!raw) return false;
  if (raw.includes(landing.area.toLowerCase())) return true;
  return landing.match.some((m) => raw.includes(m));
}

function isHiring(s) {
  return !!(visibleHiring(s)?.active || s.hiring);
}

function rankStartups(list) {
  return [...list].sort((a, b) => {
    const ha = Number(isHiring(a));
    const hb = Number(isHiring(b));
    if (hb !== ha) return hb - ha;
    const sa = Number(!!a.spotlight);
    const sb = Number(!!b.spotlight);
    if (sb !== sa) return sb - sa;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export async function getAreaPage(slug) {
  const landing = areaLanding(slug);
  if (!landing) return null;

  const all = (await getApproved()).filter((s) => s.active !== false);
  const matched = all.filter((s) => startupMatchesArea(s, landing));
  const hiring = matched.filter(isHiring);

  const sectorCounts = new Map();
  for (const s of matched) {
    const key = industryKey(s.sector);
    sectorCounts.set(key, (sectorCounts.get(key) || 0) + 1);
  }
  const topSectors = [...sectorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([sector, count]) => ({
      sector,
      count,
      slug: industrySlugForSector(sector),
    }));

  let jobs = [];
  try {
    jobs = await getJobsByArea(landing.area);
  } catch {
    jobs = [];
  }

  const ranked = rankStartups(matched).map((s, idx) => ({
    rank: idx + 1,
    id: s.id,
    name: s.name,
    slug: startupSlug(s),
    website: s.website || null,
    area: cleanAreaName(s.area) || landing.area,
    sector: s.sector || null,
    fundingStage: s.fundingStage || null,
    description: s.description || s.oneLiner || null,
    hiring: isHiring(s),
    spotlight: !!s.spotlight,
  }));

  const sharePct = all.length ? ((matched.length / all.length) * 100).toFixed(1) : "0.0";

  return {
    landing,
    totalEcosystem: all.length,
    count: matched.length,
    sharePct,
    hiringCount: hiring.length,
    jobsCount: jobs.length,
    topSectors,
    startups: ranked,
    jobs: jobs.slice(0, 12),
  };
}

export async function getAreasIndex() {
  const all = (await getApproved()).filter((s) => s.active !== false);
  const total = all.length || 1;

  const rows = AREA_LANDINGS.map((landing) => {
    const matched = all.filter((s) => startupMatchesArea(s, landing));
    const hiring = matched.filter(isHiring).length;
    return {
      ...landing,
      count: matched.length,
      hiringCount: hiring,
      sharePct: ((matched.length / total) * 100).toFixed(1),
    };
  });
  return rows.sort((a, b) => b.count - a.count);
}
