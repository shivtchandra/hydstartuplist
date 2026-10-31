import { extractKeyTokens, extractSkills, measureImpactMetrics, normalizeText } from "./ats-engine.js";
import { parseResumeSections } from "./section-parser.js";

const BULLET_RE = /^(\s*[-*•]\s+)(.+)$/;
const PLACEHOLDER_RE = /\[\s*(?:add|confirm|verify|replace|include)[^\]]+\]/gi;
const ROLE_SIGNAL_RE = /\b(responsibilit(?:y|ies)|requirements?|qualifications?|you will|what you(?:'|’)ll do|skills required|minimum qualifications?|preferred qualifications?|must have|nice to have|in this role)\b/i;
const ROLE_ACTION_RE = /\b(build|design|develop|manage|lead|collaborate|analyze|own|deliver|maintain|implement|create|support|drive)\b/gi;

export const TAILOR_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    fullTailoredResume: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          before: { type: "string" },
          after: { type: "string" },
          reason: { type: "string" },
        },
        required: ["section", "before", "after", "reason"],
        additionalProperties: false,
      },
    },
    placeholders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          section: { type: "string" },
          prompt: { type: "string" },
          context: { type: "string" },
        },
        required: ["id", "section", "prompt", "context"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" } },
    coverLetter: { type: "string" },
    screeningAnswers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
  },
  required: ["fullTailoredResume", "changes", "placeholders", "warnings", "coverLetter", "screeningAnswers"],
  additionalProperties: false,
};

export function hasMeaningfulJobDescription(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const actionCount = new Set((clean.match(ROLE_ACTION_RE) || []).map((item) => item.toLowerCase())).size;
  return clean.length >= 160 && (ROLE_SIGNAL_RE.test(clean) || (clean.length >= 300 && actionCount >= 2));
}

export function extractGuidedPlaceholders(text) {
  const matches = String(text || "").match(PLACEHOLDER_RE) || [];
  return Array.from(new Set(matches.map((item) => item.trim())));
}

export function stripGuidedPlaceholders(text) {
  return String(text || "").replace(PLACEHOLDER_RE, "").replace(/[ \t]+\n/g, "\n");
}

function tokenScore(text, tokens) {
  const normalized = normalizeText(text);
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
}

function prioritizeBulletGroups(resumeText, jobText) {
  const tokens = extractKeyTokens(jobText, 30);
  const lines = String(resumeText || "").split(/\r?\n/);
  const changes = [];
  let cursor = 0;

  while (cursor < lines.length) {
    if (!BULLET_RE.test(lines[cursor])) {
      cursor += 1;
      continue;
    }

    const start = cursor;
    while (cursor < lines.length && BULLET_RE.test(lines[cursor])) cursor += 1;
    const group = lines.slice(start, cursor);
    const ranked = group
      .map((line, index) => ({ line, index, score: tokenScore(line, tokens) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((item) => item.line);

    if (ranked.some((line, index) => line !== group[index])) {
      lines.splice(start, group.length, ...ranked);
      changes.push({
        section: "Experience",
        before: group[0].replace(BULLET_RE, "$2"),
        after: ranked[0].replace(BULLET_RE, "$2"),
        reason: "Moved the most role-relevant verified achievement first.",
      });
    }
  }

  return { text: lines.join("\n"), changes };
}

function appendMetricPlaceholder(text) {
  const lines = String(text || "").split(/\r?\n/);
  const index = lines.findIndex((line) => BULLET_RE.test(line));
  if (index === -1) return { text, placeholder: null };

  const prompt = "[add a verified outcome, scale, or metric]";
  lines[index] = `${lines[index].replace(/\s+$/, "")} ${prompt}`;
  return {
    text: lines.join("\n"),
    placeholder: {
      id: "verified-impact-1",
      section: "Experience",
      prompt,
      context: "Replace this only with a result you can verify from your own work.",
    },
  };
}

export function createSafeFallback({ resumeText, jobDescription = "", jobTitle = "", jobSkills = [], baseline }) {
  const jobText = `${jobTitle} ${(jobSkills || []).join(" ")} ${jobDescription}`;
  const prioritized = prioritizeBulletGroups(resumeText, jobText);
  const placeholders = [];
  let fullTailoredResume = prioritized.text.trim();

  if (measureImpactMetrics(resumeText).metricCount === 0) {
    const withPlaceholder = appendMetricPlaceholder(fullTailoredResume);
    fullTailoredResume = withPlaceholder.text.trim();
    if (withPlaceholder.placeholder) placeholders.push(withPlaceholder.placeholder);
  }

  for (const skill of (baseline?.missingSkills || []).slice(0, 3)) {
    placeholders.push({
      id: `skill-${placeholders.length + 1}`,
      section: "Skills gap",
      prompt: `[confirm ${skill} experience]`,
      context: `Add ${skill} only if you have genuinely used it; otherwise leave it out.`,
    });
  }

  return {
    fullTailoredResume,
    changes: prioritized.changes,
    placeholders,
    warnings: ["OpenAI was unavailable, so this version only prioritizes verified content from your original resume."],
  };
}

function comparable(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function extractNumbers(text) {
  return String(text || "").match(/\b\d+(?:[.,]\d+)*(?:%|\+|x|k|m|b|ms|s)?\b/gi) || [];
}

function extractUrls(text) {
  return String(text || "").match(/https?:\/\/[^\s)>]+/gi) || [];
}

function ensureNoNovelValues(sourceText, outputText) {
  const sourceNumbers = new Set(extractNumbers(sourceText).map((value) => value.toLowerCase()));
  const outputWithoutPrompts = stripGuidedPlaceholders(outputText);
  const novelNumber = extractNumbers(outputWithoutPrompts).find((value) => !sourceNumbers.has(value.toLowerCase()));
  if (novelNumber) throw new Error(`Tailored resume introduced an unsupported number: ${novelNumber}`);

  const sourceSkills = new Set(extractSkills(sourceText));
  const novelSkill = extractSkills(outputWithoutPrompts).find((skill) => !sourceSkills.has(skill));
  if (novelSkill) throw new Error(`Tailored resume introduced an unsupported skill: ${novelSkill}`);

  const sourceUrls = new Set(extractUrls(sourceText).map((value) => value.toLowerCase()));
  const novelUrl = extractUrls(outputWithoutPrompts).find((value) => !sourceUrls.has(value.toLowerCase()));
  if (novelUrl) throw new Error("Tailored resume introduced an unsupported link.");
}

function hasNovelValue(sourceText, sentence) {
  try {
    ensureNoNovelValues(sourceText, sentence);
    return false;
  } catch {
    return true;
  }
}

/**
 * Cover letters and answers are prose, so instead of rejecting the whole pack
 * we drop any sentence that claims a number, skill or link the resume (plus the
 * job title/company) doesn't contain.
 */
export function keepGroundedSentences(text, sourceText) {
  const sentences = String(text || "").match(/[^.!?\n]+[.!?]*\s*|\n+/g) || [];
  let dropped = 0;
  const kept = sentences.filter((sentence) => {
    if (!sentence.trim()) return true;
    if (hasNovelValue(sourceText, sentence)) {
      dropped += 1;
      return false;
    }
    return true;
  });
  return { text: kept.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(), dropped };
}

function ensureCandidateHistoryPreserved(sourceText, outputText) {
  const source = parseResumeSections(sourceText);
  const output = parseResumeSections(outputText);
  const normalizedOutput = comparable(outputText);

  if (source.name !== "Candidate" && !normalizedOutput.includes(comparable(source.name))) {
    throw new Error("Tailored resume removed the candidate name.");
  }

  for (const value of [...source.education, ...source.certifications]) {
    if (value && !normalizedOutput.includes(comparable(value))) {
      throw new Error("Tailored resume changed education or certification evidence.");
    }
  }

  for (const project of source.projects) {
    if (project.title && project.title !== "Technical Project" && !normalizedOutput.includes(comparable(project.title))) {
      throw new Error("Tailored resume removed a project.");
    }
  }

  for (const experience of source.experience) {
    if (experience.title && experience.title !== "Professional Experience" && !normalizedOutput.includes(comparable(experience.title))) {
      throw new Error("Tailored resume removed an experience entry.");
    }
  }

  if (output.education.length > source.education.length || output.certifications.length > source.certifications.length) {
    throw new Error("Tailored resume added unsupported credentials.");
  }
}

function cleanChange(change) {
  return {
    section: String(change?.section || "Resume").slice(0, 80),
    before: String(change?.before || "").slice(0, 800),
    after: String(change?.after || "").slice(0, 800),
    reason: String(change?.reason || "Reframed for relevance.").slice(0, 240),
  };
}

function cleanPlaceholder(placeholder, index) {
  const rawPrompt = String(placeholder?.prompt || "").trim();
  const prompt = rawPrompt.startsWith("[") ? rawPrompt : `[${rawPrompt || "add verified detail"}]`;
  return {
    id: String(placeholder?.id || `placeholder-${index + 1}`).slice(0, 80),
    section: String(placeholder?.section || "Resume").slice(0, 80),
    prompt: prompt.slice(0, 180),
    context: String(placeholder?.context || "Replace this with a fact you can verify.").slice(0, 280),
  };
}

export function validateTailoredResult(result, resumeText, { jobTitle = "", company = "" } = {}) {
  if (!result || typeof result.fullTailoredResume !== "string" || result.fullTailoredResume.trim().length < 80) {
    throw new Error("OpenAI returned an incomplete resume.");
  }

  const fullTailoredResume = result.fullTailoredResume.trim();
  ensureNoNovelValues(resumeText, fullTailoredResume);
  ensureCandidateHistoryPreserved(resumeText, fullTailoredResume);

  const embedded = extractGuidedPlaceholders(fullTailoredResume).map((prompt, index) => ({
    id: `embedded-${index + 1}`,
    section: "Resume",
    prompt,
    context: "Replace this with a verified detail before submitting.",
  }));
  const supplied = Array.isArray(result.placeholders) ? result.placeholders : [];
  const byPrompt = new Map();
  [...supplied, ...embedded].forEach((item, index) => {
    const cleaned = cleanPlaceholder(item, index);
    byPrompt.set(cleaned.prompt.toLowerCase(), cleaned);
  });

  const proseSource = `${resumeText}\n${jobTitle}\n${company}`;
  let droppedSentences = 0;
  const letter = keepGroundedSentences(String(result.coverLetter || "").slice(0, 3000), proseSource);
  droppedSentences += letter.dropped;
  const screeningAnswers = (Array.isArray(result.screeningAnswers) ? result.screeningAnswers : [])
    .slice(0, 6)
    .map((item) => {
      const answer = keepGroundedSentences(String(item?.answer || "").slice(0, 1200), proseSource);
      droppedSentences += answer.dropped;
      return { question: String(item?.question || "").slice(0, 200), answer: answer.text };
    })
    .filter((item) => item.question && item.answer);
  const warnings = (Array.isArray(result.warnings) ? result.warnings : []).slice(0, 8).map((item) => String(item).slice(0, 280));
  if (droppedSentences) {
    warnings.push(`Removed ${droppedSentences} sentence(s) from the cover letter or answers that claimed details not in your resume.`);
  }

  return {
    fullTailoredResume,
    changes: (Array.isArray(result.changes) ? result.changes : []).slice(0, 20).map(cleanChange),
    placeholders: Array.from(byPrompt.values()).slice(0, 12),
    warnings,
    coverLetter: letter.text,
    screeningAnswers,
  };
}

export function buildTailoringPrompt({ resumeText, jobDescription, jobTitle = "", company = "", jobSkills = [], baseline }) {
  const missing = (baseline?.missingSkills || []).slice(0, 12).join(", ") || "None detected";
  return `Tailor the candidate resume for the target role and return the complete resume as clean Markdown.

FACT RULES
- The source resume is the only evidence. Never invent or infer employers, titles, dates, education, certifications, projects, tools, skills, metrics, team sizes, scope, or outcomes.
- Preserve every source experience, project, education item, certification, contact detail, link, and number.
- You may tighten wording, reorder verified bullets, and emphasize relevant evidence.
- Use a target keyword as a candidate claim only when that keyword already appears in the source resume.
- For useful missing evidence, insert a short bracketed prompt such as [add a verified outcome or scale]. Never put an example number inside a prompt.
- Missing job skills must remain gaps; do not insert them as facts.
- Keep the resume concise, readable, ATS-safe, and free of tables or columns.

ALSO WRITE
- coverLetter: 150-250 words, plain text, addressed to the hiring team at the company. Open with the specific role, connect 2-3 verified achievements from the resume to the job's main requirements, close briefly. Same fact rules: no number, tool, or claim that is not in the source resume. No clichés ("I am writing to express my interest").
- screeningAnswers: answer these, each 2-4 sentences, first person, same fact rules:
  1. "Why are you interested in this role at ${company || "this company"}?"
  2. "Describe your most relevant experience for this role."
  3. "What is your notice period?" -> answer exactly "[add your notice period]"
  4. "What is your expected CTC?" -> answer exactly "[add your expected CTC]"

TARGET ROLE
Title: ${jobTitle || "Not supplied"}
Company: ${company || "Not supplied"}
Listed skills: ${(jobSkills || []).join(", ") || "Not supplied"}
Detected missing skills: ${missing}
Job description:
${String(jobDescription || "").slice(0, 20000)}

SOURCE RESUME
${String(resumeText || "").slice(0, 40000)}`;
}
