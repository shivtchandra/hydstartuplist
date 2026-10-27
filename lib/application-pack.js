const CONTACT_FIELDS = [
  "fullName",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "portfolio",
  "noticePeriod",
  "currentCompany",
  "currentTitle",
  "experienceYears",
  "currentCtc",
  "expectedCtc",
];

export const PASSPORT_STORAGE_KEY = "mapmyhyd_candidate_passport_v1";
export const APPLICATION_PACKS_STORAGE_KEY = "mapmyhyd_application_packs_v1";

export function normalizePassport(value = {}) {
  const passport = {
    version: 1,
    masterResume: String(value.masterResume || "").slice(0, 40000),
    updatedAt: String(value.updatedAt || ""),
  };

  for (const field of CONTACT_FIELDS) passport[field] = String(value[field] || "").trim().slice(0, 500);
  return passport;
}

function cleanLine(value) {
  return String(value || "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
    .replace(/^#{1,4}\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceCandidates(resumeText) {
  return String(resumeText || "")
    .split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z])/g)
    .map(cleanLine)
    .filter((line) => line.length >= 35 && line.length <= 360)
    .filter((line) => !/^https?:\/\//i.test(line) && !/^\S+@\S+\.\S+$/.test(line));
}

function relevanceScore(line, terms) {
  const normalized = line.toLowerCase();
  const overlap = terms.reduce((score, term) => score + (normalized.includes(term) ? 4 : 0), 0);
  const action = /\b(built|created|developed|designed|delivered|led|managed|improved|reduced|increased|launched|implemented|analyzed|owned|supported|collaborated)\b/i.test(line) ? 3 : 0;
  const proof = /\b\d+(?:[.,]\d+)*(?:%|\+|x|k|m|b)?\b/i.test(line) ? 2 : 0;
  return overlap + action + proof;
}

export function selectResumeEvidence(resumeText, match = {}, limit = 3) {
  const terms = [...(match.matchedSkills || []), ...(match.matchedTokens || [])]
    .map((term) => String(term).toLowerCase().trim())
    .filter((term) => term.length > 1);

  return evidenceCandidates(resumeText)
    .map((line, index) => ({ line, index, score: relevanceScore(line, terms) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map((item) => item.line);
}

export function buildApplicationAnswers({ resumeText, jobTitle, company, match }) {
  const evidence = selectResumeEvidence(resumeText, match, 3);
  const role = String(jobTitle || "this role").trim();
  const employer = String(company || "the company").trim();
  const strengths = (match?.matchedSkills || []).slice(0, 4);
  const strengthText = strengths.length ? strengths.join(", ") : "the relevant experience in my resume";
  const primary = evidence[0] || "My resume contains the experience most relevant to this role.";
  const secondary = evidence[1] || "";

  return [
    {
      id: "why-role",
      question: `Why are you interested in ${role} at ${employer}?`,
      answer: `I’m interested in the ${role} opportunity at ${employer} because it aligns with my verified experience in ${strengthText}. One relevant example from my background: ${primary} I’d welcome the opportunity to apply that experience to the responsibilities described for this role.`,
      evidence: [primary],
      reviewRequired: false,
    },
    {
      id: "about-you",
      question: "Tell us about yourself",
      answer: `My background is centered on ${strengthText}. ${primary}${secondary ? ` ${secondary}` : ""} I’m now looking to bring that experience to a role where it is directly relevant to the team’s work.`,
      evidence: evidence.slice(0, 2),
      reviewRequired: false,
    },
    {
      id: "relevant-experience",
      question: "Describe your most relevant experience",
      answer: evidence.length ? evidence.join(" ") : primary,
      evidence,
      reviewRequired: false,
    },
  ];
}

function safeSlug(value, fallback) {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || fallback;
}

export function createApplicationPack({
  passport,
  resumeText,
  tailoredResume,
  job = {},
  baseline = {},
  tailored = {},
  mode = "safe-fallback",
  now = new Date(),
}) {
  const savedPassport = normalizePassport(passport);
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const company = String(job.company || "").trim();
  const title = String(job.title || "").trim();
  const jobKey = String(job.id || job.url || `${company}-${title}`);
  const id = `${safeSlug(jobKey, "application")}-${createdAt.replace(/\D/g, "").slice(0, 14)}`;
  const answers = buildApplicationAnswers({ resumeText, jobTitle: title, company, match: baseline });

  return {
    id,
    version: 1,
    status: "ready",
    createdAt,
    updatedAt: createdAt,
    job: {
      id: String(job.id || ""),
      title,
      company,
      location: String(job.location || ""),
      url: String(job.url || job.applyUrl || ""),
      description: String(job.description || "").slice(0, 20000),
    },
    candidate: Object.fromEntries(CONTACT_FIELDS.map((field) => [field, savedPassport[field]])),
    fileName: `${safeSlug(savedPassport.fullName, "candidate")}_Resume_${safeSlug(title, "role")}_${safeSlug(company, "company")}.pdf`,
    masterResume: String(resumeText || ""),
    tailoredResume: String(tailoredResume || resumeText || ""),
    answers,
    baselineScore: Number(baseline.overallScore) || 0,
    tailoredScore: Number(tailored.achievedAtsScore) || 0,
    matchedSkills: (baseline.matchedSkills || []).slice(0, 20),
    remainingGaps: (tailored.remainingMissingSkills || baseline.missingSkills || []).slice(0, 20),
    placeholders: (tailored.placeholders || []).slice(0, 12),
    warnings: (tailored.warnings || []).slice(0, 8),
    mode,
  };
}

export function mergeApplicationPack(packs, pack, limit = 30) {
  const list = Array.isArray(packs) ? packs : [];
  return [pack, ...list.filter((item) => item?.id !== pack.id)].slice(0, limit);
}

export function buildExtensionHandoff(pack, passport) {
  const candidate = normalizePassport(passport);
  const profile = Object.fromEntries(CONTACT_FIELDS.map((field) => [field, candidate[field]]));
  const nameParts = candidate.fullName.split(/\s+/).filter(Boolean);
  const aboutAnswer = pack?.answers?.find((item) => item.id === "about-you")?.answer || "";
  return {
    source: "mapmyhyd",
    version: 1,
    profile: {
      ...profile,
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" "),
      fullPhone: candidate.phone,
      city: candidate.location.split(",")[0]?.trim() || candidate.location,
      country: /india/i.test(candidate.location) ? "India" : "",
      summary: aboutAnswer,
    },
    activeApplicationPack: pack,
  };
}
