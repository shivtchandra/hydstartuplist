/**
 * Resume Matching Engine for Hyderabad Startup Map.
 * Extracts skills, seniority, and target roles from resume text,
 * and calculates a compatibility score (0-100%) against job postings.
 */

import { inferRoleType, inferExperienceLevel } from './job-facets.js';

/** Canonical taxonomy of tech and product skills with common aliases. */
export const SKILL_TAXONOMY = [
  // Core Languages
  { name: 'JavaScript', regex: /\b(javascript|js|es6|es20\d\d)\b/i },
  { name: 'TypeScript', regex: /\b(typescript|ts)\b/i },
  { name: 'Python', regex: /\b(python|py)\b/i },
  { name: 'Java', regex: /\bjava\b(?!script)/i },
  { name: 'C++', regex: /\bc\+\+\b/i },
  { name: 'C#', regex: /\bc#|\bc-sharp\b/i },
  { name: 'Go / Golang', regex: /\b(golang|go\s*lang)\b|\bgo\b(?=\s*(?:developer|engineer|backend|microservices))/i },
  { name: 'Rust', regex: /\brust\b/i },
  { name: 'Ruby', regex: /\bruby\b/i },
  { name: 'PHP', regex: /\bphp\b/i },
  { name: 'Swift', regex: /\bswift\b/i },
  { name: 'Kotlin', regex: /\bkotlin\b/i },
  { name: 'SQL', regex: /\bsql\b/i },

  // Frontend & Mobile
  { name: 'React', regex: /\breact(?:\.?js)?\b(?![\s-]*native)/i },
  { name: 'React Native', regex: /\breact[\s-]*native\b/i },
  { name: 'Next.js', regex: /\bnext(?:\.?js)?\b/i },
  { name: 'Vue.js', regex: /\bvue(?:\.?js)?\b/i },
  { name: 'Angular', regex: /\bangular(?:\.?js)?\b/i },
  { name: 'Svelte', regex: /\bsvelte\b/i },
  { name: 'Tailwind CSS', regex: /\btailwind(?:\s*css)?\b/i },
  { name: 'CSS / HTML', regex: /\b(html5?|css3?|sass|scss)\b/i },
  { name: 'Redux', regex: /\bredux\b/i },
  { name: 'GraphQL', regex: /\bgraphql\b/i },
  { name: 'Flutter', regex: /\bflutter\b/i },
  { name: 'iOS', regex: /\bios\b/i },
  { name: 'Android', regex: /\bandroid\b/i },

  // Backend & Architecture
  { name: 'Node.js', regex: /\bnode(?:\.?js)?\b/i },
  { name: 'Express.js', regex: /\bexpress(?:\.?js)?\b/i },
  { name: 'NestJS', regex: /\bnest(?:\.?js)?\b/i },
  { name: 'FastAPI', regex: /\bfastapi\b/i },
  { name: 'Django', regex: /\bdjango\b/i },
  { name: 'Flask', regex: /\bflask\b/i },
  { name: 'Spring Boot', regex: /\bspring(?:\s*boot)?\b/i },
  { name: '.NET', regex: /\b(\.net|dotnet|asp\.net)\b/i },
  { name: 'Microservices', regex: /\bmicroservices?\b/i },
  { name: 'REST APIs', regex: /\b(rest|restful|rest[\s_-]*api)\b/i },
  { name: 'gRPC', regex: /\bgrpc\b/i },

  // AI / ML / Data
  { name: 'AI / GenAI', regex: /\b(ai|artificial[\s_-]*intelligence|genai|generative[\s_-]*ai|llms?|foundation(?:al)?[\s_-]*models?)\b/i },
  { name: 'Machine Learning', regex: /\b(ml|machine[\s_-]*learning|deep[\s_-]*learning)\b/i },
  { name: 'PyTorch', regex: /\bpytorch\b/i },
  { name: 'TensorFlow', regex: /\btensorflow\b/i },
  { name: 'NLP', regex: /\b(nlp|natural[\s_-]*language[\s_-]*processing)\b/i },
  { name: 'Computer Vision', regex: /\b(computer[\s_-]*vision|opencv)\b/i },
  { name: 'RAG / Vector DBs', regex: /\b(rag|retrieval[\s_-]*augmented|langchain|llamaindex|vector[\s_-]*database|pinecone|weaviate|chromadb|qdrant)\b/i },
  { name: 'Pandas / NumPy', regex: /\b(pandas|numpy|scikit[\s_-]*learn)\b/i },
  { name: 'Apache Spark', regex: /\b(spark|pyspark|apache[\s_-]*spark)\b/i },
  { name: 'Kafka', regex: /\bkafka\b/i },
  { name: 'Airflow', regex: /\bairflow\b/i },
  { name: 'Snowflake', regex: /\bsnowflake\b/i },
  { name: 'Databricks', regex: /\bdatabricks\b/i },

  // Cloud & DevOps
  { name: 'AWS', regex: /\b(aws|amazon[\s_-]*web[\s_-]*services)\b/i },
  { name: 'Azure', regex: /\bazure\b/i },
  { name: 'GCP', regex: /\b(gcp|google[\s_-]*cloud)\b/i },
  { name: 'Docker', regex: /\bdocker\b/i },
  { name: 'Kubernetes', regex: /\b(kubernetes|k8s)\b/i },
  { name: 'Terraform', regex: /\bterraform\b/i },
  { name: 'CI/CD', regex: /\b(ci[\s/_-]*cd|jenkins|github[\s_-]*actions|gitlab[\s_-]*ci)\b/i },
  { name: 'Linux', regex: /\blinux\b/i },

  // Databases
  { name: 'PostgreSQL', regex: /\b(postgres|postgresql)\b/i },
  { name: 'MySQL', regex: /\bmysql\b/i },
  { name: 'MongoDB', regex: /\b(mongo|mongodb)\b/i },
  { name: 'Redis', regex: /\bredis\b/i },
  { name: 'Elasticsearch', regex: /\belasticsearch\b/i },

  // Testing, Product & Design
  { name: 'Jest / Testing', regex: /\b(jest|cypress|playwright|selenium|unit[\s_-]*testing)\b/i },
  { name: 'Git', regex: /\bgit\b/i },
  { name: 'Figma / UI/UX', regex: /\b(figma|ui[\s/_-]*ux|wireframing|prototyping)\b/i },
  { name: 'Product Management', regex: /\b(product[\s_-]*management|roadmapping|user[\s_-]*stories)\b/i },
  { name: 'Agile / Scrum', regex: /\b(agile|scrum|sprints)\b/i },
];

const MONTH_INDEX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Estimate actual professional tenure from dated roles, merging overlaps. */
function experienceYearsFromDates(text, now = new Date()) {
  const section = String(text || '').match(/\bEXPERIENCE\b([\s\S]*?)(?=\n\s*(?:PROJECTS?|CERTIFICATIONS?|EDUCATION|TECHNICAL SKILLS)\b|$)/i)?.[1];
  if (!section) return null;

  const month = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
  const range = new RegExp(`\\b${month}\\s+((?:19|20)\\d{2})\\s*(?:[-–—]|to)\\s*(?:${month}\\s+((?:19|20)\\d{2})|(Present|Current|Now))\\b`, 'gi');
  const intervals = [];

  for (const match of section.matchAll(range)) {
    const startMonth = MONTH_INDEX[match[1].slice(0, 3).toLowerCase()];
    const startYear = Number(match[2]);
    const isPresent = Boolean(match[5]);
    const endMonth = isPresent ? now.getUTCMonth() : MONTH_INDEX[match[3].slice(0, 3).toLowerCase()];
    const endYear = isPresent ? now.getUTCFullYear() : Number(match[4]);
    const start = Date.UTC(startYear, startMonth, 1);
    const end = isPresent ? now.getTime() : Date.UTC(endYear, endMonth + 1, 1);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) intervals.push({ start, end });
  }

  if (!intervals.length) return null;
  intervals.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }
  const milliseconds = merged.reduce((sum, interval) => sum + interval.end - interval.start, 0);
  return Math.round((milliseconds / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
}

/**
 * Extracts skills, seniority level, and target role from resume text.
 */
export function extractResumeProfile(text) {
  if (!text || typeof text !== 'string') {
    return {
      skills: [],
      experienceYears: null,
      experienceLevel: 'unknown',
      targetRoles: ['Engineering'],
      summary: '',
    };
  }

  const clean = text.replace(/[\r\n]+/g, ' ');

  // 1. Detect matching skills
  const skills = [];
  for (const { name, regex } of SKILL_TAXONOMY) {
    if (regex.test(clean)) {
      skills.push(name);
    }
  }

  // 2. Parse genuine experience evidence. Do not treat project durations or
  // company-history numbers as the candidate's years of experience.
  let years = null;
  const summary = clean.slice(0, 1200);
  const expMatch = summary.match(/(?:\b(?:experience|exp\.?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\b|\b(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+|professional\s+|work\s+)?experience\b)/i);
  if (expMatch) {
    const val = parseFloat(expMatch[1] || expMatch[2]);
    if (val >= 0 && val <= 40) years = val;
  }
  if (years == null) years = experienceYearsFromDates(text);

  // 3. Infer experience level
  let level = 'unknown';
  if (years != null) {
    if (years <= 1) level = 'intern';
    else if (years <= 2) level = 'junior';
    else if (years <= 5) level = 'mid';
    else if (years <= 8) level = 'senior';
    else level = 'lead';
  } else {
    level = inferExperienceLevel(clean.slice(0, 500)) || 'unknown';
  }

  // 4. Infer target roles
  const roles = new Set();
  const first2k = clean.slice(0, 2000);
  const inferred = inferRoleType(first2k);
  if (inferred) roles.add(inferred);

  // If skills strongly point to engineering, ensure Engineering is included
  if (skills.some((s) => ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Next.js', 'Java'].includes(s))) {
    roles.add('Engineering');
  }
  // Data/ML requires evidence beyond the broad AI/GenAI label. Product engineers
  // using an LLM API should not be recommended analytics or data-science roles.
  if (skills.some((s) => ['Machine Learning', 'PyTorch', 'TensorFlow', 'Snowflake', 'Databricks', 'Apache Spark', 'Pandas / NumPy'].includes(s))) {
    roles.add('Data');
  }
  // If skills point to design
  if (skills.includes('Figma / UI/UX')) {
    roles.add('Design');
  }
  if (!roles.size) roles.add('Engineering');

  return {
    skills,
    experienceYears: years,
    experienceLevel: level,
    targetRoles: [...roles],
    summary: text.slice(0, 300).trim(),
    rawText: text,
  };
}

/**
 * Calculates a match score (0-100) and skill breakdown for a single job against a resume profile.
 */
export function scoreJobMatch(job, profile) {
  if (!job || !profile) return { score: 0, matchedSkills: [], missingSkills: [] };

  const candidateSkills = new Set((profile.skills || []).map((s) => s.toLowerCase()));
  if (!candidateSkills.size) return { score: 0, matchedSkills: [], missingSkills: [] };

  const jobText = `${job.title || ''} ${(job.skills || []).join(' ')} ${job.role || ''} ${job.description || ''} ${job.snippet || ''}`.trim();
  if (!jobText) return { score: 0, matchedSkills: [], missingSkills: [] };

  const detectedJobSkills = new Set();
  for (const entry of SKILL_TAXONOMY) {
    if (entry.regex.test(jobText)) detectedJobSkills.add(entry.name);
  }
  const matchedSkills = (profile.skills || []).filter((skill) => detectedJobSkills.has(skill));

  const missingSkills = [...detectedJobSkills].filter((skill) => !candidateSkills.has(skill.toLowerCase()));
  for (const jobSkill of job.skills || []) {
    if (!candidateSkills.has(jobSkill.toLowerCase()) && !missingSkills.includes(jobSkill)) missingSkills.push(jobSkill);
  }

  // Skill coverage matters, but one broad keyword is weak evidence. Breadth prevents
  // a single AI, Android, Azure or SQL mention from producing a high-confidence match.
  const coverage = detectedJobSkills.size ? matchedSkills.length / detectedJobSkills.size : 0;
  const breadth = Math.min(1, matchedSkills.length / 4);
  let skillPoints = Math.round((coverage * 35) + (breadth * 20));
  if (matchedSkills.some((skill) => SKILL_TAXONOMY.find((entry) => entry.name === skill)?.regex.test(job.title || ''))) {
    skillPoints = Math.min(55, skillPoints + 5);
  }

  const targetRoles = profile.targetRoles || ['Engineering'];
  const rolePoints = job.role && targetRoles.includes(job.role)
    ? 25
    : (!job.role || job.role === 'Other' ? 5 : 0);

  const levels = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'];
  const candidateIndex = levels.indexOf(profile.experienceLevel);
  const jobIndex = levels.indexOf(job.level);
  let expPoints = 5;
  if (candidateIndex >= 0 && jobIndex >= 0) {
    const gap = jobIndex - candidateIndex;
    if (gap === 0) expPoints = 20;
    else if (gap === 1) expPoints = 6;
    else if (gap > 1) expPoints = 0;
    else if (gap === -1) expPoints = 14;
    else expPoints = 8;
  }

  let finalScore = Math.min(95, skillPoints + rolePoints + expPoints);
  if (matchedSkills.length === 0) finalScore = Math.min(finalScore, 10);
  else if (matchedSkills.length === 1) finalScore = Math.min(finalScore, 55);
  else if (matchedSkills.length === 2) finalScore = Math.min(finalScore, 65);
  else if (matchedSkills.length === 3) finalScore = Math.min(finalScore, 80);

  // Large under-qualification is a real gap, not a small score deduction.
  if (candidateIndex >= 0 && jobIndex - candidateIndex >= 2) finalScore = Math.min(finalScore, 35);
  else if (candidateIndex >= 0 && jobIndex - candidateIndex === 1) finalScore = Math.min(finalScore, 60);

  return {
    score: Math.round(finalScore),
    matchedSkills,
    missingSkills: missingSkills.slice(0, 4),
  };
}

/**
 * Annotates a list of jobs with resumeMatch metadata and optionally sorts by match score.
 */
export function rankJobsByResume(jobs, profile, sortByMatch = true) {
  if (!Array.isArray(jobs)) return [];
  if (!profile || !profile.skills || !profile.skills.length) return jobs;

  const scored = jobs.map((job) => {
    const match = scoreJobMatch(job, profile);
    return {
      ...job,
      resumeMatch: match,
    };
  });

  if (!sortByMatch) return scored;

  return scored.sort((a, b) => {
    const diff = (b.resumeMatch?.score || 0) - (a.resumeMatch?.score || 0);
    if (diff !== 0) return diff;
    // Tie-breaker: fresher first
    const ta = Date.parse(a.sourcePostedAt || a.postedAt || '');
    const tb = Date.parse(b.sourcePostedAt || b.postedAt || '');
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
}
