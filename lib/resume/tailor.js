import { extractKeyTokens, extractSkills, measureImpactMetrics, normalizeText } from "./ats-engine.js";
import { parseResumeSections } from "./section-parser.js";

const BULLET_RE = /^(\s*[-*•]\s+)(.+)$/;
const PLACEHOLDER_RE = /\[\s*(?:add|confirm|verify|replace|include)[^\]]+\]/gi;
const SKILL_QUESTION_RE = /\[\s*(?:add|confirm|verify|replace|include)[^\]\n]*\b(?:if applicable|if you have|experience)\b[^\]\n]*\]/gi;
const ROLE_SIGNAL_RE = /\b(responsibilit(?:y|ies)|requirements?|qualifications?|you will|what you(?:'|’)ll do|skills required|minimum qualifications?|preferred qualifications?|must have|nice to have|in this role)\b/i;
const MOSTLY_UNCHANGED = 0.8;
const CREDENTIAL_WORDS_KNOWN = 0.7;
const THIN_RESUME_WORDS = 80;
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
  // Skill lists miss variants such as "REST APIs", so the source text has the last word.
  const sourceWords = comparable(sourceText);
  const novelSkill = extractSkills(outputWithoutPrompts).find((skill) => !sourceSkills.has(skill) && !sourceWords.includes(comparable(skill)));
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
  const normalizedSource = comparable(sourceText);

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

  // Judged by content, not section counts: a resume with no clear headings parses to zero
  // credentials, which rejected every honest rewrite of it.
  const sourceWords = new Set(normalizedSource.split(" "));
  for (const value of [...output.education, ...output.certifications]) {
    const words = comparable(value).split(" ").filter((word) => word.length > 2);
    const known = words.filter((word) => sourceWords.has(word)).length;
    if (words.length && known / words.length < CREDENTIAL_WORDS_KNOWN) {
      throw new Error("Tailored resume added unsupported credentials.");
    }
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

// A blank in the summary, or one asking whether the candidate has a skill, reached employers
// in a saved PDF. Blanks are only for a missing outcome inside a bullet.
function dropUnusablePlaceholders(text) {
  let inSummary = false;
  return String(text).split("\n").map((line) => {
    const heading = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
    if (/^(summary|profile|objective)$/i.test(heading)) {
      inSummary = true;
      return line;
    }
    if (/^#+\s/.test(line) || (heading.length < 40 && heading && heading === heading.toUpperCase())) inSummary = false;
    const kept = inSummary ? line.replace(PLACEHOLDER_RE, "") : line.replace(SKILL_QUESTION_RE, "");
    return kept === line ? line : kept.replace(/\s+$/, "");
  }).join("\n");
}

/**
 * In testing, headlines copied the target job ("Senior Financial Analyst" for a 3-year analyst,
 * "Account Executive" for a sales manager). The title part must come from the source; if not,
 * it becomes the latest real title, or is dropped so only the skills remain.
 */
export function truthfulHeadline(text, sourceText) {
  const lines = String(text).split("\n");
  const end = lines.findIndex((line, i) => i > 0 && /^##?\s/.test(line));
  const index = lines.slice(1, end < 0 ? 4 : end).findIndex((line) => /^\*\*.+\*\*$/.test(line.trim())) + 1;
  if (index < 1) return text;
  const headline = lines[index].trim().replace(/\*\*/g, "");
  const cut = headline.search(/\s[|—–·-]\s/);
  const title = cut < 0 ? headline : headline.slice(0, cut).trim();
  const rest = cut < 0 ? "" : headline.slice(cut).replace(/^\s[|—–·-]\s/, "").trim();
  if (comparable(sourceText).includes(comparable(title))) {
    if (title !== title.toLowerCase()) return text;
    // Source casing ("support engineer") reads as a typo at the top of the page.
    const cased = title.replace(/\b[a-z]/g, (c) => c.toUpperCase());
    lines[index] = `**${[cased, rest].filter(Boolean).join(" | ")}**`;
    return lines.join("\n");
  }
  const real = parseResumeSections(sourceText).experience[0]?.title;
  const usable = real && real !== "Professional Experience" && real.length < 60 ? real.split(/\s[—–|-]\s/)[0].trim() : "";
  const fixed = [usable, rest].filter(Boolean).join(" | ");
  lines[index] = fixed ? `**${fixed}**` : "";
  return lines.join("\n");
}

/** Some letters in testing stopped at the last sentence with no name. The name is the resume's first line. */
export function signedLetter(letter, resume) {
  const text = String(letter || "").trim();
  const first = String(resume || "").split("\n")[0].replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  if (!text || !first || first.length > 60) return text;
  const name = first === first.toUpperCase() ? first.toLowerCase().replace(/(^|[\s.'-])(\p{L})/gu, (m) => m.toUpperCase()) : first;
  return text.slice(-120).toLowerCase().includes(name.toLowerCase()) ? text : `${text}\n\nSincerely,\n${name}`;
}

/**
 * A change note must quote both resumes. One that only moved an item must also show the
 * order really changed: a pack claimed to move a role to first place when it already was.
 */
export function verifiedChanges(changes, sourceText, outputText) {
  const source = comparable(sourceText);
  const output = comparable(outputText);
  return (Array.isArray(changes) ? changes : []).map(cleanChange).filter((change) => {
    const before = comparable(change.before);
    const after = comparable(change.after);
    if (!before || !after || before === after) return false;
    if (!source.includes(before) || !output.includes(after)) return false;
    if (!source.includes(after) || !output.includes(before)) return true;
    return (source.indexOf(before) < source.indexOf(after)) !== (output.indexOf(before) < output.indexOf(after));
  });
}

/** Share of the source resume's text lines that reappear word for word. */
export function unchangedShare(sourceText, outputText) {
  const output = comparable(outputText);
  const lines = String(sourceText || "").split("\n").map(comparable).filter((line) => line.length >= 40);
  return lines.length ? lines.filter((line) => output.includes(line)).length / lines.length : 0;
}

export function validateTailoredResult(result, resumeText, { jobTitle = "", company = "" } = {}) {
  if (!result || typeof result.fullTailoredResume !== "string" || result.fullTailoredResume.trim().length < 80) {
    throw new Error("OpenAI returned an incomplete resume.");
  }

  const fullTailoredResume = truthfulHeadline(dropUnusablePlaceholders(result.fullTailoredResume.trim()), resumeText);
  ensureNoNovelValues(resumeText, fullTailoredResume);
  ensureCandidateHistoryPreserved(resumeText, fullTailoredResume);

  const embedded = extractGuidedPlaceholders(fullTailoredResume).map((prompt, index) => ({
    id: `embedded-${index + 1}`,
    section: "Resume",
    prompt,
    context: "Replace this with a verified detail before submitting.",
  }));
  const supplied = (Array.isArray(result.placeholders) ? result.placeholders : [])
    .filter((item) => fullTailoredResume.includes(String(item?.prompt || "").trim()));
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
  if (String(resumeText).split(/\s+/).length < THIN_RESUME_WORDS) {
    warnings.push("Your resume has little detail, so there is not much to tailor. Add what you did, for whom and with what result, then rebuild.");
  } else if (unchangedShare(resumeText, fullTailoredResume) >= MOSTLY_UNCHANGED) {
    warnings.push("This version stays very close to your original, so it may add little for this role.");
  }

  return {
    fullTailoredResume,
    changes: verifiedChanges(result.changes, resumeText, fullTailoredResume).slice(0, 20),
    placeholders: Array.from(byPrompt.values()).slice(0, 12),
    warnings,
    coverLetter: signedLetter(letter.text, fullTailoredResume),
    screeningAnswers,
  };
}

export function buildTailoringPrompt({ resumeText, jobDescription, jobTitle = "", company = "", jobSkills = [], baseline }) {
  const missing = (baseline?.missingSkills || []).slice(0, 12).join(", ") || "None detected";
  return `Tailor the candidate resume for the target role and return the complete resume as clean Markdown.

FACT RULES
- The source resume is the only evidence. Never invent or infer employers, titles, dates, education, certifications, projects, tools, skills, metrics, team sizes, scope, or outcomes.
- Keep every employer, role, project, education item, certification, contact detail, and link. A number may be left out only when its bullet is shortened for low relevance.
- Use a target keyword as a candidate claim only when that keyword already appears in the source resume.
- A bracketed prompt is allowed only inside an experience bullet, at most two, for one specific missing outcome such as [add a verified outcome or scale]. Never put an example number inside a prompt. Never put one in the summary, and never use one to ask whether the candidate has a skill or experience.
- Missing job skills must remain gaps; do not insert them as facts, and report them in warnings.
- Keep the resume concise, readable, ATS-safe, and free of tables or columns.
- Fit one page for candidates with under 5 years of experience.

TAILORING, make a recruiter for this role see the fit in 10 seconds. Do all of these
- Headline: start with the candidate's real current title or profession as the source states it, then 3-4 source skills this job values. Never use the target job title or a more senior title unless the source shows the candidate held it. If the source says the candidate is moving into a new field and this job is in that field, leave the old title out of the headline and use only the 3-4 source skills this job values.
- Summary: 3 lines, about 50 words. Open with the source evidence closest to this job's main need. For a candidate moving into this job's field, open with the projects or training in that field, then state the earlier career. Keep stated years of experience and the strongest numbers; never swap them for vague words like "experienced". Do not repeat wording from the bullets.
- Skills: put the groups and items this job asks for first; move unrelated items last. Do not invent skill group names from the job, and do not list duties as skills.
- Experience: keep roles newest first and every role title exactly as in the source. Within each role, put the most relevant bullet first.
- Projects: put the most relevant project first. Shorten projects unrelated to this job to their single strongest bullet.
- Bullets: rewrite the bullets closest to this job so a recruiter sees the overlap: lead with the part of the work this job cares about, use the job's vocabulary where the source describes the same thing, and keep every number. Do not just add a bold label or swap synonyms. Leave unrelated bullets alone rather than padding them.

CHANGES, software checks every entry against both resumes and removes any that do not match
- One entry per real change. Do not list anything left as it was.
- before: text copied exactly from the source resume. after: text copied exactly from the new resume. Never describe a change in your own words there.
- For a moved item: before is the item that used to come first, after is the item that now comes first.

FORMAT, follow exactly
# Full Name
Contact line with links kept as [LinkedIn](url)
**Headline**
## SECTION NAME
### Job Title — Company | Mon YYYY – Mon YYYY
### Project Name — Short description | Tool · Tool | Status or year, only if the source gives one
- **Lead label:** bullet text, using a bold label only where the source groups items
**Also shipped:** minor projects stay together in one paragraph, not a list

WARNINGS
- Only name requirements of this job that the source does not show. Do not comment on dates, degree status, or formatting.

ALSO WRITE
- coverLetter: 150-250 words, plain text, addressed to the hiring team at the company. Open with the specific role, connect 2-3 verified achievements from the resume to the job's main requirements, close briefly. Same fact rules: no number, tool, or claim that is not in the source resume. Never state what the candidate lacks or that the resume does not show something; say what is true and stop. Do not invent personal motivation or past interest; refer only to what the job post says. Do not mention the posting itself ("your posting emphasizes", "the job description asks"); name the work and show the matching evidence. No clichés ("I am writing to express my interest").
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
