import { getApproved, visibleHiring } from "./store.js";
import { startupSlug } from "./slug.js";
import { getJobsByArea } from "./jobs.js";
import { industryKey, industrySlugForSector } from "./industries.js";

/** Crawlable company hub pages for Hyderabad tech corridors. */
export const AREA_LANDINGS = [
  {
    slug: "hitec-city",
    area: "HITEC City",
    title: "Startups & IT Companies in HITEC City, Hyderabad",
    description:
      "Software companies, product startups, and tech offices based in HITEC City — Hyderabad’s primary IT hub around Cyber Towers, Mindspace, and Madhapur.",
    body: "HITEC City is Hyderabad’s densest IT campus cluster and a magnet for SaaS, fintech, AI, and enterprise product teams. This page lists mapped startups and software companies with offices in or around HITEC City, with hiring signals and links into open roles.",
    match: ["hitec city", "hitec", "hitech city", "hi-tec city"],
  },
  {
    slug: "gachibowli",
    area: "Gachibowli",
    title: "IT & Software Companies in Gachibowli, Hyderabad",
    description:
      "Startups and IT companies in Gachibowli — Hyderabad's western tech corridor connecting DLF Cyber City, Nanakramguda, and the Financial District.",
    body: "Gachibowli anchors Hyderabad’s western tech corridor with strong ORR and Metro connectivity. Product companies, IT firms, and growth-stage teams cluster here alongside major GCCs. Browse mapped startups and tech offices based in Gachibowli below.",
    match: ["gachibowli"],
  },
  {
    slug: "madhapur",
    area: "Madhapur",
    title: "Startups & Tech Companies in Madhapur, Hyderabad",
    description:
      "Startups and software companies in Madhapur and the HITEC City belt — one of Hyderabad’s highest-density product and tech neighbourhoods.",
    body: "Madhapur sits next to HITEC City and hosts a dense mix of SaaS and product companies, coworking spaces, and fast-growing tech teams. This hub lists mapped Madhapur startups with funding stage, office pins, and hiring context.",
    match: ["madhapur"],
  },
  {
    slug: "financial-district",
    area: "Financial District",
    title: "IT & Fintech Companies in Financial District, Hyderabad",
    description:
      "Startups, fintechs, and tech companies in Hyderabad’s Financial District along the western Outer Ring Road and Nanakramguda.",
    body: "The Financial District mixes global technology centers with growth-stage startups on the ORR stretch west of Gachibowli. Roles and offices skew enterprise, fintech, and platform engineering. Track mapped companies tied to this corridor here.",
    match: ["financial district", "waverock", "wave rock"],
  },
  {
    slug: "banjara-hills",
    area: "Banjara Hills",
    title: "Startups & Tech Companies in Banjara Hills, Hyderabad",
    description:
      "Startups, digital agencies, and tech companies with offices in Banjara Hills, Hyderabad — from Road No. 1 to Road No. 12.",
    body: "Banjara Hills hosts a vibrant ecosystem of venture-backed startups, digital health companies, and creative-tech teams in central Hyderabad. Explore mapped companies with offices across Banjara Hills.",
    match: ["banjara hills", "road no 1", "road no 12", "road no 2", "banjara"],
  },
  {
    slug: "jubilee-hills",
    area: "Jubilee Hills",
    title: "Startups & Tech Offices in Jubilee Hills, Hyderabad",
    description:
      "Product startups, media tech, and boutique technology companies located in Jubilee Hills, Hyderabad.",
    body: "Jubilee Hills and Film Nagar host consumer startups, media-tech ventures, and boutique product engineering firms. Browse mapped companies based in Jubilee Hills below.",
    match: ["jubilee hills", "film nagar", "road no 36", "road no 45", "jubilee"],
  },
  {
    slug: "kondapur",
    area: "Kondapur",
    title: "IT Companies & Startups in Kondapur, Hyderabad",
    description:
      "Software companies and tech startups in Kondapur, Hyderabad — adjacent to HITEC City, Gachibowli, and Kothaguda.",
    body: "Kondapur has emerged as a major residential and tech satellite to HITEC City and Gachibowli, hosting fast-growing SaaS startups, AI builders, and tech service companies. Track mapped Kondapur offices here.",
    match: ["kondapur", "kothaguda", "hafeezpet", "chirec"],
  },
  {
    slug: "secunderabad",
    area: "Secunderabad",
    title: "IT & Software Companies in Secunderabad",
    description:
      "Tech companies, software providers, and startups located across Secunderabad, Marredpally, and surrounding tech zones.",
    body: "Secunderabad represents Hyderabad’s historic twin city with a thriving cluster of enterprise software providers, hardware tech, and engineering service offices. Browse mapped Secunderabad technology companies below.",
    match: ["secunderabad", "marredpally", "tarnaka", "bowenpally", "sainikpuri"],
  },
  {
    slug: "kukatpally",
    area: "Kukatpally",
    title: "Software & IT Companies in Kukatpally, Hyderabad",
    description:
      "Tech firms, software companies, and product startups based in Kukatpally, KPHB Colony, and the northwestern corridor.",
    body: "Kukatpally and KPHB Colony form a massive tech hub in northwestern Hyderabad with direct Metro links to HITEC City. Explore mapped startups and IT companies based in Kukatpally.",
    match: ["kukatpally", "kphb", "kphb colony", "miyapur", "moosapet", "nizampet"],
  },
  {
    slug: "begumpet",
    area: "Begumpet",
    title: "IT & Tech Companies in Begumpet & Somajiguda, Hyderabad",
    description:
      "Established software companies, tech offices, and startups in Begumpet, Somajiguda, Ameerpet, and central Hyderabad.",
    body: "Begumpet, Somajiguda, and Ameerpet connect central Hyderabad with high-density enterprise offices, software companies, and technology providers. View mapped tech companies in this corridor.",
    match: ["begumpet", "prakash nagar", "rasoolpura", "somajiguda", "punjagutta", "ameerpet", "sanath nagar", "balanagar"],
  },
  {
    slug: "uppal",
    area: "Uppal",
    title: "IT & Tech Companies in Uppal & Pocharam, Hyderabad",
    description:
      "Software companies and tech campuses in East Hyderabad’s IT corridor — Uppal, Pocharam, and Nacharam.",
    body: "Uppal and Pocharam anchor Hyderabad’s Eastern IT Corridor with large campuses and emerging software service firms. Track mapped tech employers in Eastern Hyderabad here.",
    match: ["uppal", "pocharam", "habsiguda", "nacharam", "ramanathapur", "peerzadiguda"],
  },
  {
    slug: "knowledge-city",
    area: "Knowledge City & Raidurgam",
    title: "Startups & IT Parks in Knowledge City & Raidurgam",
    description:
      "Startups, GCCs, and tech giants in Salarpuria Sattva Knowledge City, T-Hub 2.0, and Raidurgam, Hyderabad.",
    body: "Knowledge City and Raidurgam form the premier innovation district of Hyderabad, housing T-Hub 2.0, premier GCCs, and top venture-backed product startups. Explore mapped companies in Knowledge City.",
    match: ["knowledge city", "t-hub", "t hub", "raidurgam", "rai durgam", "salarpuria"],
  },
  {
    slug: "nanakramguda",
    area: "Nanakramguda",
    title: "IT Companies & Startups in Nanakramguda, Hyderabad",
    description:
      "Tech companies and enterprise offices in Nanakramguda, Waverock, and the Financial District gateway.",
    body: "Nanakramguda connects Gachibowli to the Financial District with major tech parks and high-growth technology offices. Browse mapped companies in Nanakramguda.",
    match: ["nanakramguda", "nanakram guda", "financial district phase 2"],
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
