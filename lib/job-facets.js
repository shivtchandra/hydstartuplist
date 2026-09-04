/**
 * Client/server-safe job facet inference (role, experience, area).
 * Used by /jobs filters; no Firestore / Node-only deps.
 */

export const ROLE_OPTIONS = [
  "Engineering",
  "Product",
  "Design",
  "Data",
  "Sales",
  "Marketing",
  "Finance",
  "People/HR",
  "Operations",
  "Education",
  "Other",
];

export const EXPERIENCE_OPTIONS = [
  { key: "intern", label: "Intern/Fresher" },
  { key: "junior", label: "Junior" },
  { key: "mid", label: "Mid" },
  { key: "senior", label: "Senior" },
  { key: "lead", label: "Lead/Staff" },
  { key: "manager", label: "Manager+" },
];

export const AREA_OPTIONS = [
  { key: "gachibowli", label: "Gachibowli" },
  { key: "madhapur", label: "Madhapur" },
  { key: "hitec", label: "HITEC" },
  { key: "financial-district", label: "Financial District" },
  { key: "hyderabad", label: "Hyderabad (city)" },
  { key: "telangana", label: "Telangana" },
  { key: "other", label: "Other" },
];

/** Primary sectors shown in the filter; everything else maps to other/unknown. */
export const SECTOR_OPTIONS = [
  { key: "SaaS", label: "SaaS" },
  { key: "Fintech", label: "Fintech" },
  { key: "Healthtech", label: "Healthtech" },
  { key: "Deeptech", label: "Deeptech" },
  { key: "Edtech", label: "Edtech" },
  { key: "other", label: "Other/unknown" },
];

const MAIN_SECTORS = new Set(SECTOR_OPTIONS.filter((s) => s.key !== "other").map((s) => s.key));

export function normalizeSector(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === "saas") return "SaaS";
  if (lower === "fintech") return "Fintech";
  if (lower === "healthtech") return "Healthtech";
  if (lower === "deeptech") return "Deeptech";
  if (lower === "edtech") return "Edtech";
  if (lower === "other") return "Other";
  if (MAIN_SECTORS.has(t)) return t;
  return t;
}

export function sectorFacetKey(sector) {
  const n = normalizeSector(sector);
  if (!n || n === "Other" || !MAIN_SECTORS.has(n)) return "other";
  return n;
}

/**
 * Infer role family from job title.
 * Returns a ROLE_OPTIONS value, or null when unknown (treated as Other when filtering).
 */
export function inferRoleType(title) {
  const t = (title || "").toLowerCase();
  if (!t.trim()) return null;

  if (
    /\b(teacher|faculty|educator|principal|counselor|counsellor|tutor|pgt|tgt|prt|kg\b|kindergarten|school|nursery|pedagog)/.test(
      t
    )
  ) {
    return "Education";
  }

  if (/\bhr\b|people ops|people partner|talent|recruit|recruiter|human resources/.test(t)) {
    return "People/HR";
  }

  if (/engineer|developer|\bdev\b|software|backend|frontend|full.?stack|sre\b|devops|infra|architect/.test(t)) {
    return "Engineering";
  }
  if (/product manager|product owner|\bpm\b|product lead|product head|product analyst/.test(t)) {
    return "Product";
  }
  if (/\bux\b|\bui\b|designer|design lead|creative director|graphic design/.test(t)) {
    return "Design";
  }
  if (/\bdata\b|analyst|scientist|\bml\b|machine learning|analytics|\bbi\b|data engineer/.test(t)) {
    return "Data";
  }
  if (/sales|business dev|account exec|\bacc exec\b|\bbd\b|account manager|revenue|ae\b/.test(t)) {
    return "Sales";
  }
  if (/market|growth|\bseo\b|content|brand|social media|demand gen/.test(t)) {
    return "Marketing";
  }
  if (/finance|accounting|\bca\b|\bcfo\b|controller|audit|payroll|fp&a/.test(t)) {
    return "Finance";
  }
  if (/\bops\b|operations|admin|support|customer success|success manager|office manager/.test(t)) {
    return "Operations";
  }

  return null;
}

export function roleFacetKey(title) {
  return inferRoleType(title) || "Other";
}

/**
 * Infer seniority / experience band from title (+ optional description head).
 * Returns EXPERIENCE_OPTIONS.key or null when no signal.
 */
export function inferExperienceLevel(title, description) {
  const head = String(description || "")
    .slice(0, 400)
    .toLowerCase();
  const t = `${title || ""} ${head}`.toLowerCase();
  if (!t.trim()) return null;

  if (/\bintern\b|fresher|trainee|graduate|campus hire|0[\s-]*1\s*years?|entry[\s-]*level/.test(t)) {
    return "intern";
  }

  const yearsMatch = t.match(/(\d+)\s*\+?\s*[-–to]?\s*(\d+)?\s*\+?\s*years?/);
  if (yearsMatch) {
    const lo = Number(yearsMatch[1]);
    const hi = yearsMatch[2] != null ? Number(yearsMatch[2]) : lo;
    const mid = (lo + hi) / 2;
    if (mid < 1.5) return "intern";
    if (mid < 3) return "junior";
    if (mid < 6) return "mid";
    if (mid < 9) return "senior";
    return "lead";
  }

  if (/\b(vp|vice president|director|head of|general manager|\bgm\b|chief\b|\bcxo\b|\bceo\b|\bcto\b|\bcfo\b|\bcoo\b|avp\b)\b/.test(t)) {
    return "manager";
  }

  // Explicit people/eng managers — not "Product Manager" / "Project Manager" alone
  if (/\b(engineering manager|eng manager|people manager|hiring manager|delivery manager|program manager)\b/.test(t)) {
    return "manager";
  }
  if (/\bmanager\b/.test(t) && !/\b(product manager|project manager|account manager|office manager|success manager|community manager|brand manager)\b/.test(t)) {
    return "manager";
  }

  if (/\b(staff|principal|distinguished|fellow)\b/.test(t)) return "lead";
  if (/\b(tech lead|team lead|lead engineer|lead developer|lead designer|lead architect)\b/.test(t) || (/\blead\b/.test(t) && !/\blead generation\b/.test(t))) {
    return "lead";
  }

  if (/\bsenior\b|\bsr\.?\b/.test(t)) return "senior";
  if (/\bjunior\b|\bjr\.?\b|associate\b/.test(t)) return "junior";
  if (/\b(mid-level|mid level|intermediate)\b/.test(t)) return "mid";

  return null;
}

export function experienceLabel(key) {
  return EXPERIENCE_OPTIONS.find((o) => o.key === key)?.label || null;
}

/**
 * Infer area bucket from location string.
 */
export function inferArea(location) {
  const loc = (location || "").toLowerCase();
  if (!loc.trim()) return "other";

  if (/gachibowli|nanakramguda/.test(loc)) return "gachibowli";
  if (/madhapur/.test(loc)) return "madhapur";
  if (/hitech|hitec|hi[\s-]?tech/.test(loc)) return "hitec";
  if (/financial\s*district|mindspace|raidurg/.test(loc)) return "financial-district";
  if (/telangana|\bts\b/.test(loc) && !/hyderabad|\bhyd\b/.test(loc)) return "telangana";
  if (/hyderabad|\bhyd\b/.test(loc)) return "hyderabad";
  if (/telangana|\bts\b/.test(loc)) return "telangana";
  return "other";
}

export function areaLabel(key) {
  return AREA_OPTIONS.find((o) => o.key === key)?.label || null;
}
