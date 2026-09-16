import { getApproved, visibleHiring } from "./store.js";
import { startupSlug } from "./slug.js";
import { getJobsByArea } from "./jobs.js";
import { industryKey, industrySlugForSector } from "./industries.js";

/** Iconic Tech Parks & Campuses in Hyderabad. */
export const TECH_PARKS = [
  {
    slug: "mindspace-madhapur",
    name: "Mindspace Madhapur",
    area: "Madhapur",
    tagline: "Hyderabad's premier 110-acre IT and product engineering corridor",
    title: "Companies in Mindspace Madhapur, Hyderabad — IT Park Directory & Offices",
    description:
      "Directory of startups, software companies, and global product teams with offices in Mindspace Madhapur, HITEC City. View tenants, live jobs, and transit info.",
    overview:
      "Mindspace Madhapur is one of India's largest and most established Grade-A IT business parks, spanning over 110 acres in the heart of Hyderabad's cyber corridor. It houses major enterprise tech campuses, SaaS innovators, and GCC operations with dedicated cafeteria plazas, sports arenas, and direct Blue Line Metro access.",
    landmarks: "Inorbit Mall, Durgam Cheruvu Cable Bridge, Raheja Mindspace Traffic Hub",
    transit: "Raidurg & Durgam Cheruvu Metro Stations (Blue Line); direct access via Durgam Cheruvu bridge.",
    keyTenants: ["Amazon", "Accenture", "Qualcomm", "Cognizant", "Novartis", "Deloitte", "Persistent Systems"],
    match: ["mindspace", "raheja mindspace", "madhapur", "inorbit"],
  },
  {
    slug: "sattva-knowledge-city",
    name: "Sattva Knowledge City",
    area: "Knowledge City / Raidurgam",
    tagline: "Ultra-modern innovation district housing T-Hub 2.0 and global tech giants",
    title: "Companies in Sattva Knowledge City, Hyderabad — Startups & Tech Giants",
    description:
      "Explore product companies, AI labs, and GCCs in Salarpuria Sattva Knowledge City, Raidurgam. Includes T-Hub 2.0 startups, live openings, and campus guide.",
    overview:
      "Sattva Knowledge City is Hyderabad's most modern Grade-A commercial park, situated at the Raidurg terminus. Known for its world-class LEED Platinum architecture, premium food courts, and housing T-Hub 2.0 (the world's largest startup innovation center), Knowledge City is the epicenter of Hyderabad's high-salary AI, product engineering, and enterprise tech ecosystem.",
    landmarks: "T-Hub 2.0 Phase II, Knowledge City Skywalk, Ikea Hyderabad, Inorbit Circle",
    transit: "Raidurg Metro Station (Blue Line terminal) connects directly via an air-conditioned skywalk.",
    keyTenants: ["Microsoft", "Lloyds Technology Centre", "ServiceNow", "AMD", "T-Hub", "DXC Technology", "HCLTech"],
    match: ["knowledge city", "sattva", "salarpuria", "raidurgam", "t-hub", "t hub"],
  },
  {
    slug: "waverock-sez",
    name: "WaveRock SEZ",
    area: "Financial District / Nanakramguda",
    tagline: "Massive Grade-A SEZ & Technology hub along the Outer Ring Road",
    title: "Companies in WaveRock SEZ, Nanakramguda, Hyderabad — IT & GCC Directory",
    description:
      "Complete directory of tech companies, US product centers, and financial tech firms in WaveRock SEZ, Financial District, Hyderabad.",
    overview:
      "WaveRock SEZ in Nanakramguda is an architectural landmark and a prime Special Economic Zone hosting Fortune 500 technology divisions, tier-1 financial institutions, and fast-scaling product platforms. With top-tier LEED Gold certification and proximity to the ORR, it serves thousands of engineering professionals daily.",
    landmarks: "US Consulate Hyderabad, Outer Ring Road Exit 1, Financial District Circle",
    transit: "Direct Outer Ring Road (ORR) access; dedicated campus feeder shuttles from Gachibowli MMTS & Metro.",
    keyTenants: ["Apple", "GAP Inc.", "Accenture", "Development Bank of Singapore (DBS)", "DuPont", "TCS"],
    match: ["waverock", "wave rock", "nanakramguda", "financial district"],
  },
  {
    slug: "dlf-cyber-city",
    name: "DLF Cyber City",
    area: "Gachibowli",
    tagline: "The central technology campus powering Gachibowli's software sector",
    title: "Companies in DLF Cyber City, Gachibowli, Hyderabad — IT Park List",
    description:
      "Browse startups, SaaS companies, and enterprise software firms located inside DLF Cyber City, Gachibowli, Hyderabad.",
    overview:
      "DLF Cyber City anchors Gachibowli’s IT belt with multi-block commercial towers, extensive food courts, and easy accessibility to both Madhapur and the Financial District. It is home to prominent product development teams, tech consultants, and high-velocity SaaS scaleups.",
    landmarks: "Radisson Gachibowli, Gachibowli Indoor Stadium, IIIT Hyderabad Junction",
    transit: "Gachibowli junction transit; close to Raidurg Metro and Gachibowli ORR junction.",
    keyTenants: ["Microsoft R&D", "Barclays", "Cognizant", "Ericsson", "Capgemini", "Keka"],
    match: ["dlf", "dlf cyber city", "gachibowli", "iiit hyderabad"],
  },
  {
    slug: "cyber-towers",
    name: "Cyber Towers & Cyber Gateway",
    area: "HITEC City",
    tagline: "The historic symbol and pioneer landmark of Hyderabad's IT revolution",
    title: "Companies in Cyber Towers & Cyber Gateway, HITEC City, Hyderabad",
    description:
      "List of tech companies, software firms, and product startups operating in Cyber Towers, Cyber Gateway, and the Madhapur tech junction.",
    overview:
      "Cyber Towers is the iconic epicenter that kickstarted Hyderabad's technology boom. Located right in front of the HITEC City Metro station, the campus and its surrounding enclave host a dense mix of software service firms, growing tech startups, and digital transformation agencies.",
    landmarks: "Cyber Towers Quadrangle, HITEC City Metro Station, Shilparamam Cultural Village",
    transit: "Directly opposite HITEC City Metro Station (Blue Line) — the most connected junction in the tech zone.",
    keyTenants: ["L&T Infotech", "Tata Consultancy Services", "Oracle", "Cyient", "Various Tech Startups"],
    match: ["cyber towers", "cyber gateway", "hitec city", "hitech city", "shilparamam"],
  },
  {
    slug: "t-hub-ecosystem",
    name: "T-Hub & CIE Ecosystem",
    area: "Knowledge City & Gachibowli",
    tagline: "The world's largest startup incubator and institutional innovation center",
    title: "T-Hub Startups & Incubated Companies in Hyderabad — 2026 Directory",
    description:
      "Explore startups incubated at T-Hub 2.0, IIIT Hyderabad CIE, and IIT Hyderabad. Discover deeptech, AI, space, and hardware innovators.",
    overview:
      "T-Hub 2.0, situated in Knowledge City, is the world's largest standalone startup incubator spanning over 582,000 sq.ft. Alongside CIE IIIT Hyderabad and TiHAN IIT-H, it fosters hundreds of breakthrough Indian startups in generative AI, aerospace, robotics, drone technology, and enterprise SaaS.",
    landmarks: "T-Hub 2.0 Building, IIIT-H Center for Innovation & Entrepreneurship, Knowledge City",
    transit: "Raidurg Metro Station & IIIT Hyderabad bus corridors.",
    keyTenants: ["Skyroot Aerospace", "Dhruva Space", "Quantum Energy", "Hundreds of Incubation Cohorts"],
    match: ["t-hub", "t hub", "iiit", "cie", "incubator", "knowledge city", "tihan"],
  },
];

export function techParkLanding(slug) {
  return TECH_PARKS.find((p) => p.slug === String(slug || "").toLowerCase()) || null;
}

function cleanAreaName(area) {
  if (!area) return "";
  return String(area)
    .replace(/,\s*(Hyderabad|Telangana|India|Andhra Pradesh)\b.*$/gi, "")
    .trim();
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

function startupMatchesPark(s, park) {
  const rawArea = String(s.area || "").toLowerCase();
  const rawDesc = String(s.description || s.oneLiner || "").toLowerCase();
  const rawName = String(s.name || "").toLowerCase();
  const combined = `${rawArea} ${rawDesc} ${rawName}`;
  return park.match.some((m) => combined.includes(m.toLowerCase()));
}

export async function getTechParkPage(slug) {
  const park = techParkLanding(slug);
  if (!park) return null;

  const all = (await getApproved()).filter((s) => s.active !== false);
  const matched = all.filter((s) => startupMatchesPark(s, park));
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
    jobs = await getJobsByArea(park.area);
  } catch {
    jobs = [];
  }

  const ranked = rankStartups(matched).map((s, idx) => ({
    rank: idx + 1,
    id: s.id,
    name: s.name,
    slug: startupSlug(s),
    website: s.website || null,
    area: cleanAreaName(s.area) || park.area,
    sector: s.sector || null,
    fundingStage: s.fundingStage || null,
    description: s.description || s.oneLiner || null,
    hiring: isHiring(s),
    spotlight: !!s.spotlight,
  }));

  const sharePct = all.length ? ((matched.length / all.length) * 100).toFixed(1) : "0.0";

  return {
    park,
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

export async function getTechParksIndex() {
  const all = (await getApproved()).filter((s) => s.active !== false);
  const total = all.length || 1;

  const rows = TECH_PARKS.map((park) => {
    const matched = all.filter((s) => startupMatchesPark(s, park));
    const hiring = matched.filter(isHiring).length;
    return {
      ...park,
      count: matched.length,
      hiringCount: hiring,
      sharePct: ((matched.length / total) * 100).toFixed(1),
    };
  });
  return rows.sort((a, b) => b.count - a.count);
}
