import { getApproved, visibleHiring } from "./store.js";
import { startupSlug } from "./slug.js";
import { getAllJobs } from "./jobs.js";
import { industryKey, industrySlugForSector } from "./industries.js";

/** Canonical startup funding stage classifications. */
export const STAGE_LANDINGS = [
  {
    slug: "funded",
    stageName: "Funded Startups",
    title: "Funded Startups in Hyderabad — Seed to Growth Stage (2026 List)",
    description:
      "Explore venture-funded startups in Hyderabad — Seed, Series A, Series B, Series C, and Growth companies with verified funding rounds and open roles.",
    body: "Funded startups in Hyderabad offer institutional backing, proven market traction, competitive compensation, and structured equity (ESOP) programs. Browse mapped companies with disclosed institutional funding.",
    careerAdvice: "Funded companies offer strong financial runway, structured mentorship, and market-standard tech stacks. Series A/B stages typically offer the best balance of equity upside and salary stability.",
    matchStages: ["Seed", "Series A", "Series B", "Series C", "Series D", "Series F", "Growth", "Private Equity"],
  },
  {
    slug: "unicorns",
    stageName: "Unicorns & Soonicorns",
    title: "Unicorns & Soonicorns in Hyderabad — Top Product Startups",
    description:
      "Complete list of Hyderabad billion-dollar unicorns and high-valuation soonicorns — Darwinbox, Zenoti, Keka, Skyroot, HighRadius, Zaggle, and more.",
    body: "Hyderabad is home to a marquee league of enterprise SaaS unicorns, fintech platforms, and deeptech champions that have achieved global market leadership from Telangana.",
    careerAdvice: "Unicorns provide high brand value on your resume, tier-1 engineering scale (handling millions of daily API calls), liquidity-backed ESOP programs, and competitive global compensation.",
    matchStages: ["Public", "Growth", "Series D", "Series F", "Acquired", "Series C"],
    pinnedCompanies: ["darwinbox", "zenoti", "keka", "skyroot", "zaggle", "highradius"],
  },
  {
    slug: "series-a",
    stageName: "Series A Startups",
    title: "Series A Startups in Hyderabad — High-Growth Product Teams",
    description:
      "Discover Series A funded startups in Hyderabad. Fast-scaling product teams with 25-100 engineers hiring across tech, product, and go-to-market.",
    body: "Series A startups in Hyderabad have proven product-market fit (PMF) and are rapidly scaling their core engineering and go-to-market infrastructure. These teams are ideal for builders seeking early leadership roles.",
    careerAdvice: "Joining a Series A company provides outsized career acceleration: you work directly alongside founders, shape core system architectures, and receive meaningful equity grants with immense upside.",
    matchStages: ["Series A"],
  },
  {
    slug: "seed",
    stageName: "Seed & Early-Stage Startups",
    title: "Seed Stage Startups in Hyderabad — Ground-Floor Opportunities",
    description:
      "Browse early-stage and seed-funded startups in Hyderabad. Join founding engineering teams, AI labs, and high-equity early ventures.",
    body: "Seed-stage startups in Hyderabad represent the ground floor of innovation, building the next wave of AI products, deeptech platforms, and SaaS tools across T-Hub, IIIT-H, and HITEC City coworking spaces.",
    careerAdvice: "Seed stage roles are best for self-driven generalists who thrive in ambiguity, love rapid shipping, and want double-digit equity potential rather than corporate bureaucracy.",
    matchStages: ["Seed", "EarlyTraction", "Prototype", "Validation"],
  },
  {
    slug: "bootstrapped",
    stageName: "Bootstrapped Startups",
    title: "Bootstrapped & Profitable Tech Companies in Hyderabad",
    description:
      "Discover profitable, bootstrapped software companies in Hyderabad building sustainable product businesses without VC dependency.",
    body: "Bootstrapped tech companies in Hyderabad prioritize unit economics, sustainable product growth, and customer-first roadmaps. Many have achieved multi-million dollar ARR while remaining founder-controlled.",
    careerAdvice: "Bootstrapped teams offer job stability, zero VC pivot pressure, a strong focus on real customer revenue, and sustainable work-life balances.",
    matchStages: ["Bootstrapped"],
  },
];

export function stageLanding(slug) {
  return STAGE_LANDINGS.find((s) => s.slug === String(slug || "").toLowerCase()) || null;
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

function startupMatchesStage(s, landing) {
  const stage = s.fundingStage || s.stage || "";
  if (landing.matchStages.includes(stage)) return true;
  if (landing.pinnedCompanies) {
    const name = String(s.name || "").toLowerCase();
    if (landing.pinnedCompanies.some((p) => name.includes(p))) return true;
  }
  return false;
}

export async function getStagePage(slug) {
  const landing = stageLanding(slug);
  if (!landing) return null;

  const all = (await getApproved()).filter((s) => s.active !== false);
  const matched = all.filter((s) => startupMatchesStage(s, landing));
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
    const allJobs = await getAllJobs();
    const matchedSlugs = new Set(matched.map((s) => startupSlug(s).toLowerCase()));
    jobs = allJobs.filter((j) => {
      const cName = String(j.company || "").toLowerCase();
      return matched.some((m) => String(m.name || "").toLowerCase() === cName);
    });
  } catch {
    jobs = [];
  }

  const ranked = rankStartups(matched).map((s, idx) => ({
    rank: idx + 1,
    id: s.id,
    name: s.name,
    slug: startupSlug(s),
    website: s.website || null,
    area: cleanAreaName(s.area) || "Hyderabad",
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

export async function getStagesIndex() {
  const all = (await getApproved()).filter((s) => s.active !== false);
  const total = all.length || 1;

  const rows = STAGE_LANDINGS.map((landing) => {
    const matched = all.filter((s) => startupMatchesStage(s, landing));
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
