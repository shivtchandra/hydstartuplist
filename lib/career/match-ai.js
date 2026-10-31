// Stage B of career matching: the model reads each shortlisted job's full
// description against the resume and returns a grounded fit assessment.
import { evidenceInText, normalizeForEvidence } from "./openai.js";

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
        required: ["jobId", "score", "verdict", "why", "met", "gaps"],
        properties: {
          jobId: { type: "string" },
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

export const MATCH_SYSTEM =
  "You are a strict technical recruiter. You judge fit only from what the resume states. You never assume skills or experience the resume does not show.";

export function buildMatchPrompt(resumeText, jobs, { earlyCareer = false } = {}) {
  const jobBlocks = jobs
    .map((j) =>
      [
        `### JOB ${j.id}`,
        `Title: ${j.title}`,
        `Company: ${j.company}`,
        j.experience ? `Experience: ${j.experience}` : "",
        `Description:\n${String(j.description || "").slice(0, 6000)}`,
      ].filter(Boolean).join("\n")
    )
    .join("\n\n");
  return [
    "Score how well this candidate fits each job. Return one result per job, jobId exactly as given.",
    "Scoring: 85-100 strong (meets core requirements incl. years), 65-84 good (meets most, small gaps),",
    "40-64 stretch (missing a core requirement or 1-2 levels under), 0-39 poor (different field or far under).",
    "Weigh REQUIRED qualifications over nice-to-haves. Penalise year/seniority shortfalls honestly.",
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

const VERDICT_BY_SCORE = (s) => (s >= 85 ? "strong" : s >= 65 ? "good" : s >= 40 ? "stretch" : "poor");

/** Keep results for requested jobs only; drop un-evidenced "met" items; cap score if evidence is thin. */
export function validateMatches(raw, resumeText, jobIds) {
  const source = normalizeForEvidence(resumeText);
  const wanted = new Set(jobIds.map(String));
  const out = {};
  for (const r of Array.isArray(raw?.results) ? raw.results : []) {
    const id = String(r?.jobId || "");
    if (!wanted.has(id) || out[id]) continue;
    const met = (Array.isArray(r.met) ? r.met : [])
      .filter((m) => m && evidenceInText(m.evidence, source))
      .map((m) => ({ requirement: String(m.requirement).slice(0, 100), evidence: String(m.evidence).slice(0, 160) }));
    let score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    if (met.length === 0) score = Math.min(score, 45); // no proven requirement → can't be a good match
    else if (met.length === 1) score = Math.min(score, 70);
    out[id] = {
      score,
      verdict: VERDICT_BY_SCORE(score),
      why: String(r.why || "").slice(0, 200),
      met,
      gaps: (Array.isArray(r.gaps) ? r.gaps : []).map((g) => String(g).slice(0, 80)).slice(0, 4),
    };
  }
  return out;
}
