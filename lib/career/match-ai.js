// Stage B of career matching: the model reads each shortlisted job's full
// description against the resume and returns a grounded fit assessment.
import { evidenceInText, normalizeForEvidence } from "./openai.js";
import { assessmentConfidence, experienceEligibility, foreignOnly, matchingDescription } from "./prefilter.js";

export const MATCH_BATCH = 8;
export const MIN_DESCRIPTION = 300;

export const MATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["jobId", "score", "verdict", "why", "met", "gaps", "confidence"],
        properties: {
          jobId: { type: "string" },
          confidence: { type: "string", enum: ["sufficient", "limited"], description: "Limited when essential qualifications are missing, generic or truncated; sufficient only when core role requirements are available." },
          score: { type: "integer", minimum: 0, maximum: 100 },
          verdict: { type: "string", enum: ["strong", "good", "stretch", "poor"] },
          why: { type: "string", description: "One sentence, <= 160 chars, addressed to the candidate as 'you'" },
          met: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["requirement", "evidence"],
              properties: {
                requirement: { type: "string" },
                evidence: { type: "string", description: "Exact quote from the resume" },
              },
            },
          },
          gaps: { type: "array", maxItems: 4, items: { type: "string" } },
        },
      },
    },
  },
};

/** Constrain each batch to the requested IDs and require an assessment per input. */
export function matchSchemaForJobs(jobIds) {
  const ids = [...new Set(jobIds.map(String))];
  const results = MATCH_SCHEMA.properties.results;
  return {
    ...MATCH_SCHEMA,
    properties: {
      results: { ...results, minItems: ids.length, maxItems: ids.length,
        items: { ...results.items, properties: { ...results.items.properties, jobId: { type: "string", enum: ids } } } },
    },
  };
}

export const MATCH_SYSTEM =
  "You are a strict technical recruiter. You judge fit only from what the resume states. You never assume skills or experience the resume does not show.";

export function buildMatchPrompt(resumeText, jobs, { earlyCareer = false } = {}) {
  const jobBlocks = jobs
    .map((j) =>
      [
        `### JOB ${j.id}`,
        `Title: ${j.title}`,
        `Company: ${j.company}`,
        j.location ? `Location: ${j.location}` : "",
        j.experience ? `Experience: ${j.experience}` : "",
        `Description:\n${matchingDescription(j.description)}`,
      ].filter(Boolean).join("\n")
    )
    .join("\n\n");
  return [
    "Score how well this candidate fits each job. Return exactly one result per input job, including poor fits and incomplete descriptions. Never omit a job or repeat an ID. Copy jobId exactly as given.",
    "Scoring: 85-100 strong (meets core requirements incl. years), 65-84 good (meets most, small gaps),",
    "40-64 stretch (missing a core requirement or 1-2 levels under), 0-39 poor (different field or far under).",
    "Weigh REQUIRED qualifications over nice-to-haves. Penalise year/seniority shortfalls honestly.",
    "Caps: a job in a different function from the candidate's work scores at most 30, however transferable the skills. Under half the stated minimum years scores at most 39. A missing mandatory core technology, specialized domain capability, degree/license, or qualifying professional tenure scores at most 64.",
    "Separate decisive eligibility/core-work requirements from supporting practices. For internships and entry roles, substantive shipped work in the role's core stack can justify good fit even when a particular AI coding assistant, browser DevTools workflow, component-test detail, or UX micro-practice is not explicitly named. Keep those unshown details in gaps; do not automatically cap fit for them. This exception does not replace required Java/Django/etc., mandatory credentials, specialist professional experience or location eligibility. At senior levels, essential production, reliability, architecture and leadership depth still require evidence.",
    "Set confidence to limited and score at most 64 if the description lacks essential role requirements, is generic company copy or is too truncated to assess eligibility. Do not fill missing requirements from the title.",
    "met: requirements the resume clearly satisfies, each with an exact short resume quote as evidence.",
    "gaps: required things the resume does not show (short phrases).",
    "why: one concrete sentence naming the deciding factors, addressed to the candidate as \"you\" (never he/she/they or \"the candidate\").",
    ...(earlyCareer
      ? [
          "EARLY CAREER: this candidate is a student, fresher or has under 2 years. Their projects, internships,",
          "coursework, hackathons and certifications ARE their experience and count as evidence.",
          "For intern / fresher / entry roles, judge fundamentals, relevant projects and learning signals; do not penalise",
          "missing years. A fresher with strong relevant projects can be 85+ for an internship.",
          "For roles demanding 2+ years, say so plainly and score stretch or poor.",
        ]
      : []),
    "",
    "RESUME:",
    resumeText.slice(0, 20000),
    "",
    "JOBS:",
    jobBlocks,
  ].join("\n");
}

/** Basic degree-level gate; explicit experience alternatives remain valid. */
export function missingRequiredDegree(job, resumeText) {
  const clauses = String(job?.description || "").replace(/[‘’]/g, "'").split(/[.!?\n;]/);
  const resume = String(resumeText || "").replace(/[‘’]/g, "'");
  const doctorate = /\b(?:Ph\.?D|doctorate|doctor of)\b/i.test(resume);
  const masters = doctorate || /\bmaster(?:'s)?\s+(?:degree|of|in)\b/i.test(resume) || /\b(?:MBA|M\.?Tech|M\.?Sc|M\.?S|M\.?A|M\.?E)\b/.test(resume);
  const bachelors = masters || /\bbachelor(?:'s)?\s+(?:degree|of|in)\b/i.test(resume) || /\b(?:B\.?Tech|B\.?Sc|B\.?S|B\.?A|B\.?E)\b/.test(resume);
  for (const clause of clauses) {
    if (!/\b(?:bachelor|master)(?:'s|s)?\b/i.test(clause)) continue;
    if (/\bpreferred\b|equivalent\s+(?:(?:practical|professional|work)\s+)?experience/i.test(clause)) continue;
    if (/\bbachelor/i.test(clause) ? !bachelors : !masters) {
      return /\bbachelor/i.test(clause) ? "The required bachelor's degree or higher is not shown in your resume." : "The required master's degree or higher is not shown in your resume.";
    }
  }
  return "";
}

function shortGap(gap) {
  const text = String(gap).trim();
  return text.length <= 80 ? text : `${text.slice(0, 80).replace(/[\s,;:]+\S*$/, "")}…`;
}

const VERDICT_BY_SCORE = (s) => (s >= 85 ? "strong" : s >= 65 ? "good" : s >= 40 ? "stretch" : "poor");

/** Keep results for requested jobs only; drop un-evidenced "met" items; cap score if evidence is thin. */
export function validateMatches(raw, resumeText, jobIds, { jobs = [], profile } = {}) {
  const source = normalizeForEvidence(resumeText);
  const wanted = new Set(jobIds.map(String));
  const out = {};
  for (const r of Array.isArray(raw?.results) ? raw.results : []) {
    // With one job asked, a mistyped id must not lose the score: the Apply pack would skip its fit warning.
    const id = jobIds.length === 1 ? String(jobIds[0]) : String(r?.jobId || "");
    if (!wanted.has(id) || out[id]) continue;
    let met = (Array.isArray(r.met) ? r.met : [])
      .filter((m) => m && evidenceInText(m.evidence, source))
      .map((m) => ({ requirement: String(m.requirement).slice(0, 100), evidence: String(m.evidence).slice(0, 160) }));
    let score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    if (met.length === 0) score = Math.min(score, 45); // no proven requirement → can't be a good match
    else if (met.length === 1) score = Math.min(score, 70);
    const job = jobs.find((j) => String(j.id) === id);
    const confidence = job ? assessmentConfidence(job.description, r) : (r.confidence === "limited" ? "limited" : "sufficient");
    const eligibility = job && profile ? experienceEligibility(job, profile) : null;
    const degreeGap = job ? missingRequiredDegree(job, resumeText) : "";
    if (degreeGap) { score = Math.min(score, 64); met = met.filter((m) => !/degree|education|bachelor|master/i.test(m.requirement)); }
    if (confidence === "limited" || eligibility?.status === "check") score = Math.min(score, 64);
    if (eligibility?.status === "outside" || (job && foreignOnly(job))) score = Math.min(score, 39);
    out[id] = {
      assessmentVersion: 4,
      assessedYears: profile?.yearsExperience ?? null,
      confidence,
      score,
      verdict: VERDICT_BY_SCORE(score),
      why: job && foreignOnly(job) ? "This posting is restricted outside India. Confirm location eligibility before applying." : String(r.why || "").slice(0, 200),
      met,
      gaps: [...(degreeGap ? [degreeGap] : []), ...(Array.isArray(r.gaps) ? r.gaps : [])].map(shortGap).slice(0, 4),
    };
  }
  return out;
}
