/**
 * Resume Matching Engine for Hyderabad Startup Map.
 * Extracts skills, seniority, and target roles from resume text,
 * and calculates a compatibility score (0-100%) against job postings.
 */

import { inferRoleType, inferExperienceLevel, parseYearsRequirement } from './job-facets.js';

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

  // 2. Parse experience years
  let years = null;
  const expMatch = clean.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s*(?:of\s*)?(?:relevant\s*|work\s*)?experience)?/i);
  if (expMatch) {
    const val = parseFloat(expMatch[1]);
    if (val >= 0 && val <= 40) years = val;
  }
  if (years == null) {
    const parsedYears = parseYearsRequirement(clean);
    if (parsedYears && Number.isFinite(parsedYears.lo)) {
      years = parsedYears.lo;
    }
  }

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
  // If skills point to data/ML
  if (skills.some((s) => ['Machine Learning', 'AI / GenAI', 'PyTorch', 'TensorFlow', 'Snowflake', 'Pandas / NumPy'].includes(s))) {
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
  if (!candidateSkills.size) {
    return { score: 50, matchedSkills: [], missingSkills: [] };
  }

  // Combine job text for skill search
  const jobText = `${job.title || ''} ${(job.skills || []).join(' ')} ${job.role || ''} ${job.description || ''} ${job.snippet || ''}`;

  // Find candidate skills that match this job
  const matchedSkills = [];
  for (const skill of profile.skills || []) {
    const entry = SKILL_TAXONOMY.find((s) => s.name === skill);
    if (entry && entry.regex.test(jobText)) {
      matchedSkills.push(skill);
    }
  }

  // Find job skills that candidate might be missing
  const missingSkills = [];
  for (const jobSkill of job.skills || []) {
    if (!candidateSkills.has(jobSkill.toLowerCase())) {
      missingSkills.push(jobSkill);
    }
  }

  // --- 1. Skill Overlap Score (up to 55 points) ---
  let skillPoints = 0;
  if (matchedSkills.length > 0) {
    if (matchedSkills.length >= 4) skillPoints = 55;
    else if (matchedSkills.length === 3) skillPoints = 48;
    else if (matchedSkills.length === 2) skillPoints = 38;
    else if (matchedSkills.length === 1) skillPoints = 25;
  }

  // Bonus if title directly names candidate's core skills (e.g. "React Developer")
  const titleLower = (job.title || '').toLowerCase();
  for (const s of matchedSkills) {
    if (titleLower.includes(s.toLowerCase())) {
      skillPoints = Math.min(55, skillPoints + 8);
      break;
    }
  }

  // --- 2. Role Match Score (up to 25 points) ---
  let rolePoints = 0;
  const targetRoles = profile.targetRoles || ['Engineering'];
  if (job.role && targetRoles.includes(job.role)) {
    rolePoints = 25;
  } else if (!job.role || job.role === 'Other') {
    rolePoints = 15;
  } else {
    rolePoints = 5;
  }

  // --- 3. Seniority / Experience Match (up to 20 points) ---
  let expPoints = 15; // default neutral
  const cLevel = profile.experienceLevel;
  const jLevel = job.level;

  if (cLevel && jLevel && cLevel !== 'unknown' && jLevel !== 'unknown') {
    if (cLevel === jLevel) {
      expPoints = 20;
    } else {
      // Step hierarchy
      const levels = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'];
      const cIdx = levels.indexOf(cLevel);
      const jIdx = levels.indexOf(jLevel);
      if (cIdx >= 0 && jIdx >= 0) {
        const diff = Math.abs(cIdx - jIdx);
        if (diff === 1) expPoints = 14;
        else if (diff === 2) expPoints = 8;
        else expPoints = 2;
      }
    }
  }

  const rawScore = skillPoints + rolePoints + expPoints;
  // If no skills matched at all and job has text, cap score at 35%
  const finalScore = matchedSkills.length === 0 ? Math.min(35, rawScore) : Math.min(99, Math.max(10, rawScore));

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
