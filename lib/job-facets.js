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

const FRESHER_RE =
  /\bintern\b|\binterns\b|\binternship\b|fresher|trainee|apprentice|apprenticeship|campus hire|college hire|new[\s-]*grad|entry[\s-]*level|graduate engineer trainee|\bget[\s-]*trainee\b|\bg\.e\.t\.?\b|graduate trainee|\bmanagement trainee\b|fresher friendly|\b(2024|2025|2026|2027)\s*batch\b|\bbatch\s*of\s*(2024|2025|2026|2027)\b/;

/**
 * Seniority named by the title alone, or null when the title is silent.
 *
 * Kept title-only on purpose: descriptions routinely mention "1-2 years" or the word
 * "intern" in boilerplate, which used to drag Staff/Sr/Manager postings into the
 * entry-level band that feeds /jobs/fresher.
 */
export function titleSeniority(title) {
  const t = String(title || "")
    .toLowerCase()
    .replace(/[–—]/g, "-");
  if (!t.trim()) return null;

  if (/\b(vp|vice president|director|head of|general manager|gm|chief|cxo|ceo|cto|coo|avp)\b/.test(t)) {
    return "manager";
  }
  if (/\b(engineering manager|eng manager|people manager|hiring manager|delivery manager|program manager)\b/.test(t)) {
    return "manager";
  }
  if (
    /\bmanager\b/.test(t) &&
    !/\b(product manager|project manager|account manager|office manager|success manager|community manager|brand manager|channel manager|management trainee)\b/.test(
      t
    )
  ) {
    return "manager";
  }

  if (/\b(staff|principal|distinguished|fellow|lmts|pmts|dmts|lead member of technical staff|principal member of technical staff|distinguished member of technical staff)\b/.test(t)) return "lead";
  if (
    /\b(tech lead|team lead|lead engineer|lead developer|lead designer|lead architect)\b/.test(t) ||
    (/\blead\b/.test(t) && !/\blead generation\b/.test(t))
  ) {
    return "lead";
  }

  if (/\b(senior|sr\.?|smts|senior member of technical staff|sr\.?\s*mts)\b/.test(t)) return "senior";

  // "Associate Advisor" / "Associate Director" are mid-to-senior bands, not graduate roles.
  if (/\bassociate\b/.test(t) && /\b(advisor|adviser|director|vice president|partner|principal|architect)\b/.test(t)) {
    return "mid";
  }
  // An architect title implies design ownership, so a "freshers welcome" description
  // in the body must not pull it into the entry band.
  if (/\barchitect\b/.test(t)) return "senior";
  // A level suffix of II or higher or 2+ is never an entry band ("Analyst II", "Engineer III", "SDE-2", "MTS-2").
  if (/(?:^|[\s,\-(/])(?:ii|iii|iv|2|3|4)(?=$|[\s,\-)./])/.test(t)) return "mid";

  return null;
}

/**
 * Infer seniority / experience band from title (+ optional description head).
 * Returns EXPERIENCE_OPTIONS.key or null when no signal.
 */
export function inferExperienceLevel(title, description) {
  const titleText = String(title || "").toLowerCase();
  const descText = String(description || "").toLowerCase();
  const head = descText.slice(0, 400);
  const t = `${titleText} ${head}`.trim();
  if (!t) return null;

  // A senior band in the title wins over any wording in the body.
  const senior = titleSeniority(titleText);
  if (senior) return senior;

  // An explicit fresher word or GET acronym in the title outranks everything else.
  if (FRESHER_RE.test(titleText) || /(?:^|[\s\-(/])get(?:$|[\s\-)–—/])/i.test(titleText)) {
    return "intern";
  }

  // Check full description for explicit high-experience requirements (e.g. "5+ years", "3-5 years")
  const highExpMatch = descText.match(/\b([3-9]|\d{2,})\s*\+?\s*[-–to]?\s*(\d+)?\s*\+?\s*years?\b/);
  if (highExpMatch) {
    const minYears = Number(highExpMatch[1]);
    if (minYears >= 8) return "lead";
    if (minYears >= 5) return "senior";
    if (minYears >= 3) return "mid";
  }

  if (FRESHER_RE.test(head) || /\b0[\s-]*1\s*years?\b/.test(t)) return "intern";
  // "graduate" alone is noisy — keep with hire/program cues
  if (/\bgraduate\b/.test(t) && /\b(hire|hiring|program|role|opening|job|position)\b/.test(t)) {
    return "intern";
  }

  const yearsMatch = t.match(/(\d+)\s*\+?\s*[-–to]?\s*(\d+)?\s*\+?\s*years?/);
  if (yearsMatch) {
    const lo = Number(yearsMatch[1]);
    const hi = yearsMatch[2] != null ? Number(yearsMatch[2]) : lo;
    // 0-1 → intern; 0-2 / 1-2 / ~2y → junior (feeds /jobs/fresher)
    if (hi <= 2 && lo <= 2) {
      if (hi <= 1 && lo <= 1) return "intern";
      return "junior";
    }
    const mid = (lo + hi) / 2;
    if (mid < 6) return "mid";
    if (mid < 9) return "senior";
    return "lead";
  }

  // Common India / startup early titles without explicit years
  if (
    /\bsde[\s-]?i\b|\bsde[\s-]?1\b|\bsoftware engineer i\b|\banalyst i\b|\bassociate engineer\b|\bjunior engineer\b/.test(
      titleText
    )
  ) {
    return "junior";
  }

  if (/\bjunior\b|\bjr\.?\b|\bassociate\b/.test(titleText)) return "junior";
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
