// Resume → structured candidate profile. Every skill must quote the resume;
// anything the model can't back with a quote is dropped.
import { ROLE_OPTIONS, EXPERIENCE_OPTIONS } from "../job-facets.js";
import { extractResumeProfile } from "../resume-matcher.js";
import { evidenceInText, normalizeForEvidence } from "./openai.js";

const LEVELS = EXPERIENCE_OPTIONS.map((o) => o.key);
const ROLES = ROLE_OPTIONS.filter((r) => r !== "Other");

export const PROFILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "headline", "yearsExperience", "level", "roleFamilies", "targetTitles", "skills", "locations", "openToRemote"],
  properties: {
    name: { type: "string" },
    headline: { type: "string", description: "One line, e.g. 'Backend engineer, 3 yrs, Java/Spring'" },
    yearsExperience: { type: "number", description: "Total professional years; internships count as 0.25 each; 0 for students" },
    level: { type: "string", enum: LEVELS },
    roleFamilies: { type: "array", items: { type: "string", enum: ROLES }, maxItems: 3 },
    targetTitles: { type: "array", items: { type: "string" }, maxItems: 5 },
    skills: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "evidence", "strength"],
        properties: {
          name: { type: "string", description: "Canonical skill name, e.g. 'React', 'PostgreSQL', 'Financial modelling'" },
          evidence: { type: "string", description: "Exact short quote from the resume showing the skill" },
          strength: { type: "string", enum: ["core", "used", "mentioned"] },
        },
      },
    },
    locations: { type: "array", items: { type: "string" }, maxItems: 4 },
    openToRemote: { type: "boolean" },
  },
};

export const PROFILE_SYSTEM =
  "You read resumes and extract a factual candidate profile. You never infer skills, titles or years that the resume does not state.";

export function buildProfilePrompt(resumeText) {
  return [
    "Extract the candidate profile from this resume.",
    "Rules:",
    "- skills: only skills the resume shows. `evidence` must be copied verbatim from the resume (a phrase or bullet fragment, <= 160 chars).",
    "- strength: core = used in a job/internship role or repeatedly; used = in a project; mentioned = only in a skills list.",
    "- Include non-tech skills too (sales, accounting, teaching, design tools...).",
    "- level: intern (student/fresher), junior (<2y), mid (2-5y), senior (5-8y), lead (8y+ IC), manager (manages people).",
    "- roleFamilies: up to 3 job families the person is qualified for, most likely first.",
    "- targetTitles: realistic job titles to search for next.",
    "- locations: cities they live in or list; openToRemote true unless the resume says otherwise.",
    "",
    "RESUME:",
    resumeText.slice(0, 40000),
  ].join("\n");
}

/** Keep only evidenced skills, clamp enums, dedupe. Throws if nothing usable remains. */
export function validateProfile(raw, resumeText) {
  const source = normalizeForEvidence(resumeText);
  const seen = new Set();
  const skills = (Array.isArray(raw?.skills) ? raw.skills : [])
    .filter((s) => s && typeof s.name === "string" && s.name.trim())
    .filter((s) => evidenceInText(s.evidence, source) || source.includes(normalizeForEvidence(s.name)))
    .filter((s) => {
      const key = s.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({
      name: s.name.trim().slice(0, 60),
      evidence: String(s.evidence || "").trim().slice(0, 160),
      strength: ["core", "used", "mentioned"].includes(s.strength) ? s.strength : "mentioned",
    }));
  if (!skills.length) throw new Error("Profile had no evidenced skills.");
  const years = Number(raw?.yearsExperience);
  return {
    name: String(raw?.name || "").slice(0, 80),
    headline: String(raw?.headline || "").slice(0, 140),
    yearsExperience: Number.isFinite(years) ? Math.max(0, Math.min(45, years)) : 0,
    level: LEVELS.includes(raw?.level) ? raw.level : "junior",
    roleFamilies: (raw?.roleFamilies || []).filter((r) => ROLES.includes(r)).slice(0, 3),
    targetTitles: (raw?.targetTitles || []).map((t) => String(t).slice(0, 60)).filter(Boolean).slice(0, 5),
    skills,
    locations: (raw?.locations || []).map((l) => String(l).slice(0, 40)).filter(Boolean).slice(0, 4),
    openToRemote: raw?.openToRemote !== false,
    source: "ai",
  };
}

/** Deterministic profile when AI is unavailable (old regex extractor, reshaped). */
export function fallbackProfile(resumeText) {
  const p = extractResumeProfile(resumeText);
  return {
    name: "",
    headline: "",
    yearsExperience: p.experienceYears || 0,
    level: LEVELS.includes(p.experienceLevel) ? p.experienceLevel : "junior",
    roleFamilies: (p.targetRoles || []).filter((r) => ROLES.includes(r)).slice(0, 3),
    targetTitles: [],
    skills: (p.skills || []).map((name) => ({ name, evidence: "", strength: "mentioned" })),
    locations: [],
    openToRemote: true,
    source: "fallback",
  };
}
