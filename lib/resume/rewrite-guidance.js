import { extractSkills } from './ats-engine.js';
import { parseResumeSections } from './section-parser.js';

// Route on the requested title, never on incidental vendor names in a posting.
// These are editorial priorities, not skills to add to a candidate's history.
const PROFILES = [
  { id: 'quality', title: /\b(?:qa|sdet|quality assurance|quality engineer|test(?:ing)? (?:engineer|analyst|consultant))\b/i,
    focus: 'Source-backed test execution, test design, API/integration checks, defect investigation and validation. Distinguish development troubleshooting from formal QA employment.',
    skills: 'testing, API, SQL, Python, JavaScript, Java, AWS, Docker, CI/CD, generative AI, LLM, RAG, LangChain' },
  { id: 'frontend', title: /\b(?:front[ -]?end|react|web developer|ui engineer|mobile|android|ios|flutter)\b/i,
    focus: 'Shipped interfaces, user workflows, UI quality, performance and source-evidenced accessibility or component tests. API integration supports UI delivery; it does not establish backend ownership.',
    skills: 'React, Next.js, TypeScript, JavaScript, HTML5, CSS3, Tailwind, Flutter, Kotlin, Swift, Jest, Vitest, Playwright, Cypress' },
  { id: 'security', title: /\b(?:security|cybersecurity|soc analyst|penetration)\b/i,
    focus: 'Evidence of threat investigation, controls, secure implementation, incident handling and risk reduction. Do not turn a security-client project into security-testing expertise.',
    skills: 'Python, SQL, AWS, Azure, Linux, Docker, logging' },
  { id: 'platform', title: /\b(?:devops|sre|cloud|platform engineer|infrastructure|systems engineer|network engineer)\b/i,
    focus: 'Reliability, cloud operations, observability, deployment and incident diagnosis, with the exact production ownership and scale supported by the source. Monitoring does not prove on-call ownership.',
    skills: 'AWS, Azure, GCP, Docker, Kubernetes, Terraform, Linux, GitHub Actions, CI/CD, Python, Bash, SQL, logging' },
  { id: 'ai', title: /\b(?:ai|ml|llm|machine learning|artificial intelligence|generative ai|data scientist)\b/i,
    focus: 'Implemented models or agents, evaluation, data/retrieval pipelines and measured product outcomes. Separate using AI coding tools from building, training or evaluating AI systems.',
    skills: 'Python, SQL, PyTorch, TensorFlow, LangChain, LLM, RAG, embeddings, FastAPI, Docker, AWS' },
  { id: 'data', title: /\b(?:data|analytics|business intelligence|bi analyst|reporting analyst)\b/i,
    focus: 'Analysis or data pipelines, SQL/data quality, decisions supported and measurable business outcomes. Distinguish analysis, engineering and science from the actual requested responsibilities.',
    skills: 'SQL, Python, R, PostgreSQL, pandas, numpy, Apache Spark, Airflow, Kafka, Excel, Tableau, Power BI' },
  { id: 'product', title: /\b(?:product (?:manager|owner)|program manager|project manager|business analyst)\b/i,
    focus: 'Problem definition, requirements, prioritization, stakeholder delivery and demonstrated customer or business outcomes. Shipping a personal product does not establish formal product-management tenure.',
    skills: 'SQL, analytics, research, Agile, Scrum, Jira, stakeholder communication' },
  { id: 'design', title: /\b(?:designer|ux|user experience|user research)\b/i,
    focus: 'Research, design decisions, interaction quality, systems and user outcomes backed by portfolio work. A UI implementation or accessibility API is not evidence of user research or accessible web design.',
    skills: 'Figma, research, prototyping, design systems, accessibility, HTML5, CSS3' },
  { id: 'commercial', title: /\b(?:sales|account executive|business development|marketing|customer success|account manager)\b/i,
    focus: 'Customer relationships, pipeline or campaigns, retention and attributed commercial outcomes. Preserve sales versus marketing ownership and never infer CRM tools from generic client work.',
    skills: 'CRM, Salesforce, HubSpot, Excel, SQL, analytics, customer relationships' },
  { id: 'software', title: /\b(?:software|back[ -]?end|full[ -]?stack|developer|engineer)\b/i,
    focus: 'Implemented systems, APIs, data modeling, delivery quality and production outcomes. Describe each stack only where the source associates it with the work.',
    skills: 'Python, JavaScript, TypeScript, Java, React, Next.js, Node.js, FastAPI, SQL, PostgreSQL, Docker, AWS, CI/CD' },
  { id: 'general', title: /./,
    focus: 'The actual work and outcomes requested in the target role, using source-backed responsibilities, operational improvements, customer service, domain knowledge or leadership as applicable. Do not force technical terminology onto nontechnical careers.',
    skills: '' },
];

export function rewriteRoleProfile(jobTitle = '') {
  return PROFILES.find(profile => profile.title.test(String(jobTitle))) || PROFILES.at(-1);
}

export function roleAwareGuidance({ jobTitle = '', rewriteMode = 'job' } = {}) {
  const profile = rewriteRoleProfile(jobTitle);
  return `ROLE-AWARE EDITORIAL PRIORITIES (${profile.id})
- ${profile.focus}
- ${rewriteMode === 'role' ? 'Use this role family as a direction; there is no vacancy and no employer-specific eligibility to assess.' : 'The actual job description overrides this broad family. Separate required qualifications from preferred exposure and learn-on-the-job responsibilities. Do not turn good-to-have tools into mandatory eligibility gaps.'}
- Start from the candidate's supported professional identity, not the target title. When changing careers, show the relevant transferable work without relabeling their employment.
- Preserve relevant supporting skills as well as exact keyword matches. Consider related platforms, delivery tools and domain exposure only when already in the source; do not delete them merely because the posting uses different words.
- Allocate space by relevant evidence, not by source order or project size. Preserve every entry, but shorten peripheral entries before cutting stronger proof. If a peripheral entry has protected metrics, retain those in a compact sentence.
- A summary may preview one outcome, but its detailed bullet must add cause, method or context rather than repeat the same sentence. Do not remove an important metric solely to avoid repeating its number.`;
}

const normalized = text => String(text || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();
const words = text => normalized(text).split(/\s+/).filter(Boolean);
const SKILL_ALIASES = { 'react.js': 'react', nextjs: 'next.js', nodejs: 'node.js', 'express.js': 'express', 'vue.js': 'vue', golang: 'go', postgres: 'postgresql', 'amazon web services': 'aws', 'google cloud': 'gcp', k8s: 'kubernetes', genai: 'generative ai' };
const skillKey = skill => SKILL_ALIASES[normalized(skill)] || normalized(skill);

export function cleanRedundantSkillLabels(text) {
  let inSkills = false;
  return String(text).split('\n').map(line => {
    const heading = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    if (/^(?:(?:technical|core|key)\s+)?(?:skills|technologies|competencies|tech stack)\s*:?$/i.test(heading)) {
      inSkills = true;
      return line;
    }
    if (/^#{1,2}\s+/.test(line) || /^[A-Z][A-Z &/]{2,40}$/.test(line.trim())) inSkills = false;
    if (!inSkills) return line;
    const match = line.replace(/\*\*/g, '').match(/^(\s*[-*•]\s+)(.+?):\s*(.+?)\s*$/);
    if (match && normalized(match[2]) === normalized(match[3])) return match[1] + match[3];
    return line;
  }).join('\n');
}

function includesPhrase(text, phrase) {
  return ` ${normalized(text)} `.includes(` ${normalized(phrase)} `);
}

function headlineOf(text) {
  const lines = String(text).split('\n');
  const end = lines.findIndex((line, index) => index > 0 && /^##?\s/.test(line));
  return lines.slice(1, end < 0 ? 5 : end).find(line => /^\*\*.+\*\*$/.test(line.trim()))?.replace(/\*\*/g, '').trim() || '';
}

// Conservative editorial signals. Factual validation remains separate and mandatory.
// This is not an ATS score or a guarantee of eligibility/readability.
export function assessRewriteQuality(outputText, sourceText, { jobTitle = '', jobDescription = '', jobSkills = [], rewriteMode = 'job' } = {}) {
  const source = parseResumeSections(sourceText);
  const output = parseResumeSections(outputText);
  const issues = [];
  const add = (code, message) => issues.push({ code, message });
  if (source.summary && !output.summary) {
    add('missing-summary', 'Restore a concise professional introduction grounded in the source.');
  } else if (/^(?:built|checked|owned|used|delivered|resolved|traced|implemented|developed|created|managed|led|supported|monitored|increased|reduced)\b/i.test(output.summary)) {
    add('task-only-summary', 'Open the summary with a source-supported professional identity or domain, then connect relevant capabilities to evidence; do not begin as an isolated task bullet.');
  }

  const headline = headlineOf(outputText);
  const bareTokens = new Set(extractSkills(headline));
  const parts = headline.split(/[|·—]/).map(part => part.trim()).filter(Boolean);
  if (parts.length >= 3 && parts.every(part => bareTokens.has(part.toLowerCase()) || /^[A-Z][A-Z0-9.+#/-]{1,11}$/.test(part))) {
    add('keyword-only-headline', 'Replace the bare tool inventory headline with source-supported professional positioning or functional capabilities. Keep tools in Skills and never invent a target profession.');
  }

  const profile = rewriteRoleProfile(jobTitle);
  const target = `${jobTitle} ${profile.skills} ${rewriteMode === 'role' ? '' : jobDescription} ${(jobSkills || []).join(' ')}`;
  const sourceSkills = [...new Set([...extractSkills(source.skillsRaw), ...source.skills.filter(skill => words(skill).length <= 4)])];
  const requestedSkills = new Set(extractSkills(target).map(skillKey));
  const retainedSkills = new Set(extractSkills(output.skillsRaw).map(skillKey));
  const missing = [...new Map(sourceSkills.filter(skill =>
    (requestedSkills.has(skillKey(skill)) || includesPhrase(target, skill)) &&
    !retainedSkills.has(skillKey(skill)) && !includesPhrase(output.skillsRaw, skill)
  ).map(skill => [skillKey(skill), skill])).values()];
  if (missing.length) {
    add('lost-relevant-skills', `Retain these source-supported, target-relevant skills in grouped Skills: ${missing.slice(0, 12).join(', ')}. Preserve their original proficiency and scope.`);
  }

  const summaryPattern = output.summary.split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  const body = output.summary ? String(outputText).replace(new RegExp(summaryPattern, 'i'), '') : String(outputText);
  const bodyLines = body.split('\n').map(line => words(line.replace(/^[-*•]+\s*/, '')));
  const summarySentences = output.summary.split(/(?<=[.!?])\s+/).map(words).filter(sentence => sentence.length >= 10);
  if (summarySentences.some(sentence => bodyLines.some(line => line.join(' ').includes(sentence.join(' '))))) {
    add('repeated-summary-evidence', 'The summary repeats a detailed bullet nearly verbatim. Keep the achievement preview short and use its original entry for the supporting method and context; preserve protected metrics.');
  }
  return issues;
}
