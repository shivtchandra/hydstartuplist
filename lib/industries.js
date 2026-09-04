import { getApproved, visibleHiring } from "./store.js";
import { normalizeSector } from "./job-facets.js";
import { getJobsBySector } from "./jobs.js";
import { startupSlug } from "./slug.js";

/** Canonical industry pages (slug → display sector + copy). */
export const INDUSTRY_LANDINGS = [
  {
    slug: "saas",
    sector: "SaaS",
    title: "SaaS Startups in Hyderabad",
    description:
      "Cloud software and B2B platforms building from Hyderabad — enterprise tools, HR tech, developer platforms, and vertical SaaS.",
  },
  {
    slug: "ai",
    sector: "AI",
    title: "AI Startups in Hyderabad",
    description:
      "Machine learning, generative AI, and applied intelligence companies in Hyderabad’s product and deeptech scene.",
  },
  {
    slug: "fintech",
    sector: "Fintech",
    title: "Fintech Startups in Hyderabad",
    description:
      "Payments, lending, wealth, compliance, and financial infrastructure startups based in Hyderabad.",
  },
  {
    slug: "deeptech",
    sector: "Deeptech",
    title: "Deeptech Startups in Hyderabad",
    description:
      "Aerospace, defence, robotics, drones, semiconductors, and frontier hardware/software from Hyderabad.",
  },
  {
    slug: "healthtech",
    sector: "Healthtech",
    title: "Healthtech Startups in Hyderabad",
    description:
      "Digital health, diagnostics, care delivery, and medtech startups serving patients and providers from Hyderabad.",
  },
  {
    slug: "edtech",
    sector: "Edtech",
    title: "Edtech Startups in Hyderabad",
    description:
      "Learning platforms, upskilling, and education technology companies building in Hyderabad.",
  },
  {
    slug: "consumer",
    sector: "Consumer",
    title: "Consumer Startups in Hyderabad",
    description:
      "Consumer apps, media, and lifestyle startups with Hyderabad roots.",
  },
  {
    slug: "d2c",
    sector: "D2C",
    title: "D2C Brands in Hyderabad",
    description:
      "Direct-to-consumer product brands designing, selling, and scaling from Hyderabad.",
  },
  {
    slug: "logistics",
    sector: "Logistics",
    title: "Logistics Startups in Hyderabad",
    description:
      "Supply chain, mobility, and logistics technology companies in Hyderabad.",
  },
  {
    slug: "other",
    sector: "Other",
    title: "Other Startups in Hyderabad",
    description:
      "Hyderabad startups outside the primary mapped sectors — still part of the local ecosystem.",
  },
];

const CANON = new Set(INDUSTRY_LANDINGS.map((i) => i.sector));

export function industryLanding(slug) {
  return INDUSTRY_LANDINGS.find((i) => i.slug === String(slug || "").toLowerCase()) || null;
}

export function industrySlugForSector(sector) {
  const key = industryKey(sector);
  return INDUSTRY_LANDINGS.find((i) => i.sector === key)?.slug || "other";
}

/** Map raw startup.sector → canonical industry key used on /industries pages. */
export function industryKey(raw) {
  const n = normalizeSector(raw);
  if (!n) return "Other";
  if (CANON.has(n)) return n;
  // Anything else (unknown labels) folds into Other for clear sub-pages
  return "Other";
}

function shortArea(area) {
  return String(area || "")
    .replace(/,\s*(Hyderabad|Telangana|India)\b.*$/i, "")
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

/**
 * Stats + ranked companies for one industry page.
 */
export async function getIndustryPage(slug) {
  const landing = industryLanding(slug);
  if (!landing) return null;

  const all = (await getApproved()).filter((s) => s.active !== false);
  const total = all.length || 1;
  const matched = all.filter((s) => industryKey(s.sector) === landing.sector);
  const hiring = matched.filter(isHiring);

  const areaCounts = new Map();
  const stageCounts = new Map();
  for (const s of matched) {
    const area = shortArea(s.area) || "Hyderabad";
    areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
    const stage = s.fundingStage || "Unknown";
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
  }

  const topAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([area, count]) => ({ area, count }));

  const stages = [...stageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ stage, count }));

  let jobs = [];
  try {
    // Jobs sector filter uses exact startup.sector match; pull for canonical name
    // and common casing variants already normalized on jobs.
    jobs = await getJobsBySector(landing.sector);
  } catch {
    jobs = [];
  }

  const ranked = rankStartups(matched).map((s, idx) => ({
    rank: idx + 1,
    id: s.id,
    name: s.name,
    slug: startupSlug(s),
    website: s.website || null,
    area: shortArea(s.area) || "Hyderabad",
    fundingStage: s.fundingStage || null,
    description: s.description || s.oneLiner || null,
    hiring: isHiring(s),
    spotlight: !!s.spotlight,
  }));

  const sharePct = total ? ((matched.length / total) * 100).toFixed(1) : "0.0";

  return {
    landing,
    totalEcosystem: all.length,
    count: matched.length,
    sharePct,
    hiringCount: hiring.length,
    jobsCount: jobs.length,
    topAreas,
    stages,
    startups: ranked,
    jobs: jobs.slice(0, 12),
  };
}

/** Index cards for /industries — every landing with live counts. */
export async function getIndustriesIndex() {
  const all = (await getApproved()).filter((s) => s.active !== false);
  const total = all.length || 1;
  const buckets = new Map();
  for (const s of all) {
    const key = industryKey(s.sector);
    if (!buckets.has(key)) buckets.set(key, { count: 0, hiring: 0 });
    const b = buckets.get(key);
    b.count += 1;
    if (isHiring(s)) b.hiring += 1;
  }

  return INDUSTRY_LANDINGS.map((landing) => {
    const b = buckets.get(landing.sector) || { count: 0, hiring: 0 };
    return {
      ...landing,
      count: b.count,
      hiringCount: b.hiring,
      sharePct: ((b.count / total) * 100).toFixed(1),
    };
  })
    .filter((i) => i.count > 0 || ["saas", "deeptech", "fintech"].includes(i.slug))
    .sort((a, b) => b.count - a.count);
}
