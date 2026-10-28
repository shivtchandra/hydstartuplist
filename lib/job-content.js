/** Shared helpers for job descriptions, salary display, and schema parity. */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h2", "h3", "h4",
  "a", "span", "div",
]);

export function sanitizeJobHtml(input) {
  if (!input || typeof input !== "string") return "";
  let html = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag, attrs = "") => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    if (match.startsWith("</")) return `</${name}>`;
    if (name === "br") return "<br/>";
    if (name === "a") {
      const href = (attrs.match(/href\s*=\s*(['"])(.*?)\1/i) || [])[2] || "";
      if (!/^https?:\/\//i.test(href)) return "<span>";
      return `<a href="${href.replace(/"/g, "&quot;")}" rel="noopener noreferrer" target="_blank">`;
    }
    return `<${name}>`;
  });

  return html.trim();
}

// A JD that opens with a company pitch ("ABOUT BJAK", "About us", "Who we are").
const COMPANY_PITCH_OPEN = /^(?:\s|<[^>]+>)*(?:about\s+(?:us|the\s+company|[a-z0-9&.' -]{2,40})|who\s+we\s+are|company\s+overview|our\s+(?:story|mission)|why\s+(?:join|work))\b/i;
// Wording that marks a company blurb rather than a role ("harnesses the power of", "global leader in").
const COMPANY_PITCH_CUES = /\b(?:we\s+are\s+(?:a|an|the|global|leading|building|dedicated|on\s+a\s+mission)|we(?:'|’)re\s+(?:a|an|the|global|leading|building|dedicated|on\s+a\s+mission)|we\s+believe|our\s+(?:mission|vision|team|company|platform|products?|solutions?|customers?|story)|harness\w*|revolutioni[sz]\w*|pioneer\w*|global\s+leader|leading\s+(?:provider|platform|company)|leader\s+in|headquartered|founded\s+in|since\s+(?:19|20)\d\d|customers\s+(?:in|across|worldwide)|fortune\s+\d+|platform\s+of\s+choice|nasdaq|nyse)\b/i;
const COMPANY_IDENTITY_CUES = /\b(?:is|are|builds?|provides?|offers?|powers?|operates?|accelerates?|develops?)\b[^.!?]{0,100}\b(?:company|platform|provider|business|product|service|technology|solution|leader)\b/i;
const GENERIC_RECRUITING_OPEN = /^(?:we(?:'|’)re|we are)\s+looking\s+for\s+(?:the\s+)?(?:most\s+)?(?:talented|driven|exceptional|passionate)(?:\s+and\s+(?:talented|driven|exceptional|passionate))*\s+(?:people|candidates|individuals)\b/i;
// Headings that start the role itself. Must sit on their own line / tag, or end in ":" or a dash.
const ROLE_HEADING = /(?:^|\n|>)\s*(?:<[^>]+>\s*)*(?:about\s+(?:the|this)\s+(?:role|job|position|opportunity)|the\s+(?:role|opportunity|position)|role\s+(?:overview|summary|description|&\s+responsibilities)|job\s+(?:description|summary|overview|duties|responsibilities)|(?:position|role)\s+(?:summary|overview|description)|(?:job\s+)?overview|what\s+you(?:'|’)?ll\s+(?:do|be\s+doing|own|work\s+on)|what\s+you\s+will\s+(?:do|be\s+doing|own)|your\s+(?:role|responsibilities|impact|day|opportunity)|(?:key|core|primary|main)\s+(?:responsibilities|duties|accountabilities)|(?:essential|primary)\s+(?:functions|duties)|responsibilities|duties|in\s+this\s+role|day[\s-]to[\s-]day|requirements|qualifications|what\s+we(?:'|’)?re\s+looking\s+for|who\s+you\s+are|what\s+you(?:'|’)?ll\s+need|what\s+you\s+bring|we\s+are\s+(?:looking\s+for|seeking|hiring)|we(?:'|’)re\s+(?:looking\s+for|seeking|hiring))\s*(?:<\/[^>]+>\s*)*(?::|[-–—]|\n|<|$)/i;
const ROLE_START_TEXT = /\b(?:about\s+(?:the|this)\s+(?:role|job|position|opportunity)|(?:the\s+(?:role|opportunity|position))\s*[:\-–—]|role\s+(?:overview|summary|description|&\s+responsibilities)|job\s+(?:description|summary|overview|duties|responsibilities)|(?:position|role)\s+(?:summary|overview|description)|(?:job\s+)?overview|what\s+you(?:'|’)?ll\s+(?:do|be\s+doing|own|work\s+on)|what\s+you\s+will\s+(?:do|be\s+doing|own)|your\s+(?:role|responsibilities|impact|day|opportunity)|(?:key|core|primary|main)\s+(?:responsibilities|duties|accountabilities)|(?:essential|primary)\s+(?:functions|duties)|responsibilities|duties|in\s+this\s+role|day[\s-]to[\s-]day|requirements|qualifications|what\s+we(?:'|’)?re\s+looking\s+for|who\s+you\s+are|what\s+you(?:'|’)?ll\s+need|what\s+you\s+bring|we\s+are\s+(?:looking\s+for|seeking|hiring)|we(?:'|’)re\s+(?:looking\s+for|seeking|hiring)|you\s+will\s+be\s+responsible)\b\s*[:\-–—]?\s*/gi;

/**
 * Drop a leading company pitch so the stored/displayed text starts at the role. Careers feeds
 * (Bjak, Viasat, Netradyne) open with a few hundred chars of company blurb that used up the
 * whole stored blurb. Returns the input unchanged when the opener does not look like a company
 * pitch or no role heading follows. `company` (optional) sharpens the pitch check.
 */
export function roleFirstDescription(raw, company = "") {
  if (!raw || typeof raw !== "string") return raw;
  // Greenhouse ships the JD entity-escaped; match against the real markup.
  if (/&lt;\/?[a-z]/i.test(raw)) {
    raw = raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&");
  }
  const m = ROLE_HEADING.exec(raw);
  if (!m || m.index < 80) return raw;
  const preface = raw.slice(0, m.index);
  const plain = preface.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const name = String(company || "").toLowerCase().split(/[\s,.(]+/).filter((w) => w.length > 2)[0] || "";
  const pitchy =
    COMPANY_PITCH_OPEN.test(raw.slice(0, 160)) ||
    COMPANY_PITCH_CUES.test(plain) ||
    (name && plain.includes(name));
  if (!pitchy || plain.length > 6000) return raw;
  let start = m.index + (/^[\s]|>/.test(m[0][0]) ? 1 : 0);
  // The match can begin on the tail of the previous block; skip any closing tags so the
  // slice starts at the heading's own opening tag.
  for (let guard = 0; guard < 20; guard += 1) {
    while (start < raw.length && /\s/.test(raw[start])) start += 1;
    if (!raw.startsWith("</", start)) break;
    const end = raw.indexOf(">", start);
    if (end < 0) break;
    start = end + 1;
  }
  const rest = raw.slice(start).trim();
  return rest.length >= 200 ? rest : raw;
}

export function cleanJobDescriptionHtml(raw, company = "") {
  if (!raw || typeof raw !== "string") return "";
  let text = raw.trim();
  // Unescape double-escaped HTML entities if present
  if (/&lt;\/?(p|div|ul|li|h[1-6]|span|b|strong|br|em|i)\b/i.test(text)) {
    text = text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }
  text = roleFirstDescription(text, company);
  // If plain text with newlines and no HTML tags, convert newlines to paragraphs
  if (!/<[a-z][\s\S]*>/i.test(text)) {
    return text
      .split(/\n{2,}/)
      .filter((p) => p.trim())
      .map((p) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`)
      .join("");
  }
  return sanitizeJobHtml(text);
}

export function stripHtml(input) {
  if (!input || typeof input !== "string") return "";
  // Some careers feeds (Netradyne) ship the JD entity-escaped ("&lt;div&gt;…"); unescape the
  // markup first so the tag strip below removes it instead of leaving literal tags on screen.
  if (/&lt;\/?[a-z]/i.test(input)) {
    input = input.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&");
  }
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function companyPitchAtStart(text, company = "") {
  const prefix = String(text || "").slice(0, 520).trim();
  if (!prefix) return false;
  if (COMPANY_PITCH_OPEN.test(prefix) || COMPANY_PITCH_CUES.test(prefix.slice(0, 200)) || GENERIC_RECRUITING_OPEN.test(prefix)) return true;
  const words = String(company || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !/^(?:the|and|technologies|technology|solutions|software|systems)$/.test(word));
  const named = words.some((word) => prefix.slice(0, 100).toLowerCase().includes(word));
  return named && COMPANY_IDENTITY_CUES.test(prefix.slice(0, 260));
}

/**
 * Plain-text role content shared by every feed. Strong company intros are removed before any
 * provider-specific size cap, so a long "About us" block cannot replace the actual job duties.
 * If a payload contains only a company pitch and no role marker, return null rather than publish
 * misleading company copy as a job description.
 */
export function jobDescriptionText(raw, company = "") {
  const text = stripHtml(String(raw || "")).replace(/\s+/g, " ").trim();
  if (!text) return null;

  const withoutLead = text.replace(
    /^(?:job\s+description|job\s+summary|role\s+(?:description|overview|summary)|position\s+(?:description|overview|summary))\s*[:\-–—]?\s*/i,
    ""
  );
  const pitchy = companyPitchAtStart(text, company) || companyPitchAtStart(withoutLead, company);
  if (!pitchy) return text;

  const matches = [...text.matchAll(new RegExp(ROLE_START_TEXT.source, ROLE_START_TEXT.flags))];
  for (const match of matches) {
    if (match.index === 0 && GENERIC_RECRUITING_OPEN.test(text) && /^we(?:'|’)re|^we are/i.test(match[0])) continue;
    const afterHeading = text.slice(match.index + match[0].length).trim();
    if (!afterHeading || companyPitchAtStart(afterHeading, company)) continue;
    return text.slice(match.index).trim();
  }
  return null;
}

// Lead-ins that say nothing about the role ("Job Description:", "About the role -").
const SNIPPET_LEAD_IN = /^(?:job\s+description|job\s+summary|about\s+(?:the\s+)?(?:role|job|position|opportunity)|purpose\s+of\s+(?:the\s+)?role|role\s+(?:description|overview|summary)|position\s+(?:description|overview|summary)|overview|summary|description|the\s+role)\s*[:\-–—]?\s*/i;

/** One-line plain-text teaser for job cards: role-first, cut on a word boundary. */
export function jobSnippet(description, max = 170, company = "") {
  let text = jobDescriptionText(description, company);
  if (!text) return null;
  for (let i = 0; i < 3 && SNIPPET_LEAD_IN.test(text); i += 1) text = text.replace(SNIPPET_LEAD_IN, "");
  if (text.length < 40) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/**
 * Display-only title tidy for listings: ATS titles arrive as "Engineer_IHC017B",
 * "Manager,Software Development" or "Analyst - R0123456". Requisition codes mean
 * nothing to a job seeker, so drop them and fix the spacing.
 */
export function displayJobTitle(title) {
  const raw = String(title || "").trim();
  const clean = raw
    .replace(/_[A-Z0-9-]*\d[A-Z0-9-]*$/, "")
    .replace(/\s*[-–(]\s*(?:req(?:uisition)?\s*(?:id)?\s*[:#]?\s*)?[A-Z]{0,3}-?\d{5,}\)?$/i, "")
    .replace(/_/g, " ")
    .replace(/,(?=[A-Za-z])/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return clean || raw;
}

/** Lowercase alphanumerics only, so "Bb71O VqO 6G" and "bb71O_VqO_6G" compare equal. */
function titleSegmentKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function urlPathSegments(url) {
  const raw = String(url || "");
  if (!raw) return [];
  try {
    return new URL(raw).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Drop ATS job-id path segments that leak into titles scraped from URL slugs,
 * e.g. "PqqFrapezemf/Business Development Associate" → "Business Development Associate".
 *
 * Matched against the job URL rather than guessed from the text: a heuristic on casing
 * cannot separate an id like "PqqFrapezemf" from a real product name like "SailPoint",
 * so a leading part is only removed when it is literally a path segment of the URL.
 */
export function cleanScrapedTitle(title, url) {
  let raw = String(title || "").trim();
  if (!raw.includes("/")) return raw;
  const parts = raw.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return raw;

  const segments = new Set(urlPathSegments(url).map(titleSegmentKey));
  if (!segments.size) return raw;

  let start = 0;
  while (start < parts.length - 1 && segments.has(titleSegmentKey(parts[start]))) start += 1;
  return start ? parts.slice(start).join(" / ") : raw;
}

/** Visible + schema description — same string for both. */
export function jobDescriptionForPage(job) {
  const stored = job?.description;
  const roleText = jobDescriptionText(stored, job?.company);
  if (roleText) {
    const plainStored = stripHtml(String(stored || "")).replace(/\s+/g, " ").trim();
    // Preserve useful HTML formatting when no company preface had to be removed.
    if (roleText === plainStored && /<[a-z][\s\S]*>/i.test(stored)) {
      const sanitized = sanitizeJobHtml(stored);
      if (sanitized) return sanitized;
    }
    return roleText;
  }
  const loc = job?.location || "Hyderabad";
  return `${job?.title || "Role"} at ${job?.company || "a Hyderabad company"} in ${loc}. Apply via the employer's official listing.`;
}

export function jobDescriptionIsHtml(desc) {
  return /<[a-z][\s\S]*>/i.test(desc || "");
}

export function formatSalaryInr(salary) {
  if (!salary) return null;
  const min = salary.min != null ? Number(salary.min) : null;
  const max = salary.max != null ? Number(salary.max) : null;
  if (!Number.isFinite(min) && !Number.isFinite(max)) return null;

  const fmt = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  if (Number.isFinite(min) && Number.isFinite(max)) return `${fmt(min)} – ${fmt(max)} / year`;
  if (Number.isFinite(min)) return `From ${fmt(min)} / year`;
  return `Up to ${fmt(max)} / year`;
}

/** Normalize Adzuna/ATS salary into { min?, max? } or null. */
export function normalizeSalary(min, max) {
  const lo = min != null && Number(min) > 0 ? Number(min) : null;
  const hi = max != null && Number(max) > 0 ? Number(max) : null;
  if (lo == null && hi == null) return null;
  return { min: lo, max: hi };
}

export const ADZUNA_FRESH_DAYS = 2;
export const CAREERS_FRESH_DAYS = 7;
export const ATS_FRESH_DAYS = 3;

/**
 * Staffing agencies, recruitment consultancies, body shops, and placement agencies.
 * These post third-party, contract-to-hire, or bench jobs rather than direct employer roles.
 */
export const STAFFING_CONSULTANCY_DENYLIST = [
  "adecco",
  "randstad",
  "hucon",
  "hucon solutions",
  "hucon solutions india",
  "michael page",
  "page personnel",
  "teamlease",
  "quess corp",
  "quesscorp",
  "kelly services",
  "turing",
  "manpower",
  "manpowergroup",
  "allegis",
  "allegis group",
  "robert half",
  "abc consultants",
  "waterleaf consultants",
  "vaakruthi",
  "artech infosystems",
  "artech information systems",
  "talent corner",
  "talent bridge",
  "talent recruit",
  "talent acquisition group",
  "placement consultancy",
  "staffing solutions",
  "hr solutions",
  "global resourcing",
  "resource management",
  "synergy resource",
  "synergy consultants",
  "hirecraft",
  "peoplestrong",
  "careernet",
  "anzy global",
  "genius consultants",
  "ikya human capital",
  "alecalon staffing",
  "v-soft consulting",
  "collabera",
  "experis",
  "apex systems",
  "teksystems",
  "aerotek",
  "disys",
  "compucom",
  "diverselynx",
  "e-monies",
  "future focus infotech",
  "growel sophistec",
  "idexcel",
  "ktekresourcing",
  "mindlance",
  "nlb services",
  "pyramid consulting",
  "rangam consultants",
  "ustech solutions",
  "vaisesika consulting",
  "vlink india",
  "zensar staffing",
];

const CONSULTANCY_PHRASES = [
  /\bour client (?:is|in|a|has)\b/i,
  /\bhiring (?:for|on behalf of) (?:our |a |top |leading |reputed )?client\b/i,
  /\bclient of (?:placement|consultancy|staffing|hr|recruitment)\b/i,
  /\bthird[- ]party payroll\b/i,
  /\bcontract to hire\b/i,
  /\bplacement consultancy\b/i,
  /\bstaffing solutions?\b/i,
  /\bconfidential client\b/i,
  /\breputed client\b/i,
  /\bleading (?:mnc|it company|client) (?:is hiring|looking for)\b/i,
  /\bimmediate joiners? for our client\b/i,
  /\bpayroll of\b.*\bconsulting\b/i,
  /\bconsultancy fee\b/i,
  /\bplacement assistance\b/i,
  /\b(?:international\s+|uk\s+|us\s+)?voice\s+process\b/i,
  /\btelecaller\b/i,
];

const GENERIC_ORPHAN_COMPANIES = [
  "confidential",
  "unknown",
  "undisclosed",
  "leading mnc",
  "reputed company",
  "top it company",
  "it client",
  "client of",
  "placement agency",
];

export const NON_JOB_URL_RE =
  /\/(?:speciality|specialties|specialty|treatments?|procedures?|doctors?|departments?|services?|packages?|health-package|blogs?|news|articles?|patient-care|about-us|contact-us|facilities|infrastructure|conditions|clinics?|children-care-hospital|care-hospital|collections\/|products?\/|category\/|shop\/|meet-[a-z-]+|stories|life-at|our-people|newsroom|press-releases|pricing|features?|case-studies|customers?|solutions?|levers?|resources?)\b/i;

export const NON_JOB_TITLE_RE =
  /\b(?:treatment|treatments|procedure|procedures|speciality|specialties|specialty|department|doctor profile|patient care|book appointment|consult doctor|health checkup|opd|emergency service|our doctors|find a doctor|health tips|medical service|hospital in\b|best hospital|care hospital|view open|submit resume|helpdesk|hr suite|hr templates|hr analytics|hr software|saas hr software|hr toolkit|meet\s+[a-z]+|employee spotlight|life at\b|day in the life|interview with\b|why i joined|our team|customer story|press release|sales room|coaching precision|revenue activation|sales enablement|cost calculator|agentic era|architectural inversion|architecture slide|three-layer architecture|\d+hr|<48hr)\b/i;

// Aggregator junk: titles opening with a symbol ("% Fresher Software Developer"),
// dotted digit runs ("99.89.61.27.35") or phone numbers stuffed into the title.
// Leading "." stays allowed for ".NET Developer".
// Keyword-stuffed SEO titles ("Itfresherjobs-Softwarejobs") are listings, not roles.
export const JUNK_TITLE_RE = /^(?:[%*#$@!?~^=+|\\/<>_:;,\-–—•·]|\p{Extended_Pictographic})|\d{1,3}(?:\.\d{1,3}){3,}|\b[6-9]\d{9}\b|\w+jobs\b.*\w+jobs\b/iu;

export function isInvalidJobListing(job) {
  if (!job) return true;
  const url = String(job.url || job.applyUrl || "");
  const title = String(job.title || "").trim();
  if (!title || title.length < 3) return true;
  if (url && NON_JOB_URL_RE.test(url)) return true;
  if (NON_JOB_TITLE_RE.test(title)) return true;
  if (JUNK_TITLE_RE.test(title)) return true;
  // Nav items, section titles, and marketing nouns that slip past word boundaries
  if (/^(?:products?|our products?|leadership|leadership team|all products?|management|overview|services?|solutions?|technology|features?|pricing|careers?|jobs?|about(?: us)?|contact(?: us)?|press|news|blog)$/i.test(title)) {
    return true;
  }
  // Sentences / marketing slogans / quotes scraped from website copy
  if (/^(?:we are|we're|join us|careers for|coach the|engine for|this is not|what is|cost of|a guided path|you use the)\b/i.test(title)) {
    return true;
  }
  return false;
}

/**
 * Filter out third-party staffing consultancies, body-shop listings,
 * non-job URLs/pages, and vague ghost-employer posts from aggregators.
 */
export function isSpamOrConsultancyJob(job) {
  if (!job) return true;
  if (isInvalidJobListing(job)) return true;
  const company = String(job.company || "").toLowerCase().trim();
  if (!company || company.length < 2) return true;

  if (GENERIC_ORPHAN_COMPANIES.some((g) => company === g || company.startsWith(g))) {
    return true;
  }

  // Exact or word-boundary check against staffing denylist
  const isDenylisted = STAFFING_CONSULTANCY_DENYLIST.some((d) => {
    if (company === d) return true;
    if (d.length <= 4) return new RegExp(`(?:^|[^a-z0-9])${d}(?:[^a-z0-9]|$)`, "i").test(company);
    return company.includes(d);
  });
  if (isDenylisted) return true;

  // Check title & description for agency tropes
  const text = `${job.title || ""} ${job.description || ""}`;
  if (CONSULTANCY_PHRASES.some((rx) => rx.test(text))) {
    return true;
  }

  return false;
}

export function jobValidThroughDate(job) {
  const posted = job?.postedAt ? new Date(job.postedAt) : new Date();
  const base = job?.fetchedAt ? new Date(job.fetchedAt) : posted;
  let days = 30;
  if (job?.source === "adzuna") days = (job?.level === "intern" || job?.level === "junior") ? 14 : ADZUNA_FRESH_DAYS;
  else if (job?.source === "ats") days = ATS_FRESH_DAYS;
  else if (job?.source === "careers") days = CAREERS_FRESH_DAYS;
  if (job?.validThrough) {
    const explicit = new Date(job.validThrough);
    if (!Number.isNaN(explicit.getTime())) return explicit;
  }
  const vt = new Date(base);
  vt.setUTCDate(vt.getUTCDate() + days);
  return vt;
}

