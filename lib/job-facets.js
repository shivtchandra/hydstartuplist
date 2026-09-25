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
  "Healthcare / Nutrition",
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
    /\b(dietitian|dietician|nutritionist|nutrition|health coach|wellness coach|diet counselor|metabolic coach|sports nutritionist|lifestyle consultant|nutrition faculty)\b/.test(
      t
    )
  ) {
    return "Healthcare / Nutrition";
  }

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

/** Map a numeric years range onto EXPERIENCE_OPTIONS keys. */
export function bandFromYears(lo, hi) {
  if (!Number.isFinite(lo)) return null;
  let a = lo;
  let b = Number.isFinite(hi) ? hi : lo;
  if (a > b) [a, b] = [b, a];
  if (b <= 1 && a <= 1) return "intern";
  if (b <= 2 && a <= 2) return "junior";
  const mid = (a + b) / 2;
  if (a >= 8 || mid >= 9) return "lead";
  if (a >= 5 || mid >= 7) return "senior";
  // Any requirement whose floor or ceiling reaches 3y is mid — not early-career.
  if (a >= 3 || b >= 3) return "mid";
  return "junior";
}

/**
 * Pull an explicit years-of-experience requirement from free text.
 * Prefers requirement-shaped phrases ("3–6 years in frontend", "Experience - 4-8 years")
 * and skips company-age / benefits fluff ("founded 8 years ago", "3 years of paid leave").
 * Returns { lo, hi } or null.
 */
export function parseYearsRequirement(text) {
  const raw = String(text || "");
  if (!raw.trim()) return null;
  const t = raw
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+to\s+/g, "-")
    .replace(/\s+/g, " ");

  const noise =
    /\b(founded|established|since|celebrat\w*|paid\s+(?:parental\s+)?leave|parental leave|maternity|paternity|warranty|legacy|history|in business|old company|years ago|year[.s]? old)\b/;

  const patterns = [
    // "Experience: 4-8 years" / "Experience - 3 to 6 yrs" / "Exp. 5+ years"
    /\b(?:experience|exp\.?)\s*[-:]?\s*(\d+)\s*\+?\s*(?:-\s*(\d+)\s*\+?)?\s*(?:years?|yrs?)\b/,
    // "minimum 3 years" / "at least 5+ years" / "required 4 years"
    /\b(?:minimum|min\.?|at least|must have|requires?|required|looking for)\s+(\d+)\s*\+?\s*(?:-\s*(\d+)\s*\+?)?\s*(?:years?|yrs?)\b/,
    // "3-6 years of experience" / "5+ years relevant experience"
    /\b(\d+)\s*\+?\s*(?:-\s*(\d+)\s*\+?)?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:relevant\s*|prior\s*|professional\s*|work\s*)?(?:experience|exp\.?)\b/,
    // "3–6 years in frontend" / "4-5 years building production"
    /\b(\d+)\s*\+?\s*(?:-\s*(\d+)\s*\+?)?\s*(?:years?|yrs?)\s+(?:in|building|working|developing|shipping|with|as)\b/,
    // Bare "0-2 years" / "1-2 yrs" in title or short experience field
    /\b(\d+)\s*\+?\s*(?:-\s*(\d+)\s*\+?)?\s*(?:years?|yrs?)\b/,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const lo = Number(m[1]);
    const hi = m[2] != null && m[2] !== "" ? Number(m[2]) : lo;
    if (!Number.isFinite(lo)) continue;
    // Skip when the match sits inside company-history / benefits wording.
    const idx = m.index ?? t.indexOf(m[0]);
    const window = t.slice(Math.max(0, idx - 40), idx + m[0].length + 40);
    if (noise.test(window) && lo >= 3) continue;
    return { lo, hi: Number.isFinite(hi) ? hi : lo };
  }
  return null;
}

function yearsBandFromJobFields(jobObj, titleText, descText) {
  const experienceField = typeof jobObj?.experience === "string" ? jobObj.experience : "";
  // Title + structured experience first; then a wide description window (not just 400 chars).
  const corpus = [titleText, experienceField, descText.slice(0, 2500)].filter(Boolean).join("\n");
  const parsed = parseYearsRequirement(corpus);
  return parsed ? bandFromYears(parsed.lo, parsed.hi) : null;
}

/**
 * Infer seniority / experience band from title (+ optional description head or job record).
 * Returns EXPERIENCE_OPTIONS.key or null when no signal.
 *
 * Priority: title seniority → explicit years requirement → fresher title → fresher body
 * (only when years do not demand 3+) → junior title cues → stored experienceLevel hint.
 */
export function inferExperienceLevel(title, description, job) {
  const jobObj = typeof title === "object" && title !== null ? title : job;
  const actualTitle = typeof title === "object" && title !== null ? title.title : title;
  const actualDesc = typeof title === "object" && title !== null ? title.description : description;

  const titleText = String(actualTitle || "").toLowerCase();
  const descText = String(actualDesc || "").toLowerCase();
  const head = descText.slice(0, 400);
  const t = `${titleText} ${head}`.trim();

  // Structured start/end years (Docthub etc.) are authoritative and beat title words
  // like "Staff Nurse" that would otherwise look like Staff-engineer seniority.
  if (jobObj && Number.isFinite(Number(jobObj.startYear))) {
    const lo = Number(jobObj.startYear);
    const hi = Number.isFinite(Number(jobObj.endYear)) ? Number(jobObj.endYear) : lo;
    const band = bandFromYears(lo, hi);
    if (band) return band;
  }

  // A senior band in the title wins over soft wording in the body.
  const senior = titleSeniority(titleText);
  if (senior) return senior;

  // Explicit fresher / GET title outranks years buried in JD boilerplate.
  if (FRESHER_RE.test(titleText) || /(?:^|[\s\-(/])get(?:$|[\s\-)–—/])/i.test(titleText)) {
    return "intern";
  }

  // Explicit years (experience string or JD requirement) beat "associate" / body fresher
  // fluff so 3–6y roles never land in Early career.
  const yearsBand = yearsBandFromJobFields(jobObj, titleText, descText);
  if (yearsBand) return yearsBand;

  if (!t && !jobObj) return null;

  // Body fresher wording only when we did not already see a 3y+ requirement above.
  if (FRESHER_RE.test(head) || /\b0[\s-]*1\s*years?\b/.test(t)) return "intern";

  // "graduate" alone is noisy — keep with hire/program cues
  if (/\bgraduate\b/.test(t) && /\b(hire|hiring|program|role|opening|job|position)\b/.test(t)) {
    return "intern";
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

  // Soft fallback: a previously stored band (empleos / ATS), never above years/title.
  const stored = jobObj?.experienceLevel || jobObj?.level;
  if (stored && EXPERIENCE_OPTIONS.some((o) => o.key === stored)) return stored;

  return null;
}

export function experienceLabel(key) {
  return EXPERIENCE_OPTIONS.find((o) => o.key === key)?.label || null;
}

function formatYearsRange(lo, hi) {
  if (!Number.isFinite(lo)) return null;
  const a = lo;
  const b = Number.isFinite(hi) ? hi : lo;
  if (a === 0 && b <= 1) return "Fresher (0–1y)";
  if (a === b) return a === 0 ? "Fresher (0–1y)" : `${a}+ yrs`;
  return `${a}–${b} yrs`;
}

/**
 * Returns a human-friendly experience string for display on cards and job details.
 * Examples: "0–2 yrs", "Fresher (0–1y)", "1–10 yrs", "5+ yrs", "Lead / Staff", "Senior".
 */
export function jobExperienceDisplay(job) {
  if (!job) return null;

  // 1. Check explicit experience field on job
  if (job.experience && typeof job.experience === "string") {
    const exp = job.experience.trim();
    if (/fresh/i.test(exp)) return "Fresher (0–1y)";
    const parsed = parseYearsRequirement(exp);
    if (parsed) return formatYearsRange(parsed.lo, parsed.hi);
    if (!/experienced/i.test(exp)) return exp;
  }

  // 2. Structured startYear / endYear
  if (Number.isFinite(Number(job.startYear))) {
    const start = Number(job.startYear);
    const end = Number.isFinite(Number(job.endYear)) ? Number(job.endYear) : null;
    if (start === 0 && (end === 0 || end === null || end === 1)) return "Fresher (0–1y)";
    if (start === 0 && end) return `0–${end} yrs`;
    if (end && end > start) return `${start}–${end} yrs`;
    if (start > 0) return `${start}+ yrs`;
  }

  // 3. Requirement-shaped years in title / description (skips company-age fluff)
  const parsed = parseYearsRequirement(`${job.title || ""} ${job.description || ""}`);
  if (parsed) return formatYearsRange(parsed.lo, parsed.hi);

  // 4. Check inferred level
  const lvl = job._level || job.level || inferExperienceLevel(job.title, job.description, job);
  if (lvl === "intern") return "Fresher (0–1y)";
  if (lvl === "junior") return "Junior (0–2y)";
  if (lvl === "mid") return "Mid-level";
  if (lvl === "senior") return "Senior (5+y)";
  if (lvl === "lead") return "Lead / Staff";
  if (lvl === "manager") return "Manager+";

  return null;
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

/** Metros other than Hyderabad, used to catch rows whose title contradicts their location. */
const OTHER_METRO_RE =
  /\b(bengaluru|bangalore|chennai|pune|mumbai|gurgaon|gurugram|noida|new delhi|kolkata|ahmedabad|coimbatore|kochi|jaipur|indore|nagpur|visakhapatnam|vijayawada)\b/i;

const HYDERABAD_IN_TITLE_RE = /\bhyderabad\b|\bhyd\b/i;

/**
 * Drop rows whose own title names a different metro. A board for Hyderabad should never
 * surface "… Associate Bengaluru", on any view. A multi-city title ("Bengaluru / Hyderabad /
 * Pune") still belongs on a Hyderabad board, so only rows naming another metro and not this
 * one get dropped. Mutates in place.
 */
export function dropOtherMetroRows(jobs) {
  if (!Array.isArray(jobs)) return jobs;
  for (let i = jobs.length - 1; i >= 0; i -= 1) {
    const title = jobs[i]?.title || "";
    if (OTHER_METRO_RE.test(title) && !HYDERABAD_IN_TITLE_RE.test(title)) jobs.splice(i, 1);
  }
  return jobs;
}
