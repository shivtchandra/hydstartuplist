import test from 'node:test';
import assert from 'node:assert/strict';
import { extractResumeProfile, scoreJobMatch, rankJobsByResume } from '../lib/resume-matcher.js';

test('extractResumeProfile parses skills, years, and roles from resume text', () => {
  const resume = `
    Shiva Chandra
    Full Stack Developer | 3.5 years of experience
    Hyderabad, India
    
    Technical Skills:
    Languages & Frameworks: React, Next.js, TypeScript, JavaScript, Node.js, Python, Tailwind CSS
    Backend & Cloud: Express, PostgreSQL, MongoDB, Docker, AWS, REST APIs
    AI: RAG, Generative AI, LangChain, PyTorch
  `;

  const profile = extractResumeProfile(resume);

  assert.ok(profile.skills.includes('React'));
  assert.ok(profile.skills.includes('Next.js'));
  assert.ok(profile.skills.includes('TypeScript'));
  assert.ok(profile.skills.includes('Python'));
  assert.ok(profile.skills.includes('Docker'));
  assert.ok(profile.skills.includes('AWS'));
  assert.ok(profile.skills.includes('AI / GenAI') || profile.skills.includes('RAG / Vector DBs'));
  assert.equal(profile.experienceYears, 3.5);
  assert.equal(profile.experienceLevel, 'mid');
  assert.ok(profile.targetRoles.includes('Engineering'));
});

test('scoreJobMatch ranks high for aligned technical roles and low for unrelated roles', () => {
  const profile = {
    skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'AI / GenAI', 'Python'],
    experienceLevel: 'mid',
    targetRoles: ['Engineering'],
  };

  const highMatchJob = {
    title: 'Front End AI Engineer',
    role: 'Engineering',
    level: 'mid',
    skills: ['React', 'TypeScript', 'Next.js'],
    snippet: 'Looking for a Front End AI Engineer with React and LLM experience in Hyderabad.',
  };

  const lowMatchJob = {
    title: 'Autoline Accounts Support Analyst',
    role: 'Operations',
    level: 'junior',
    skills: ['Accounting', 'Autoline'],
    snippet: 'Support automotive dealers with accounting and ledger entries.',
  };

  const highMatch = scoreJobMatch(highMatchJob, profile);
  const lowMatch = scoreJobMatch(lowMatchJob, profile);

  assert.ok(highMatch.score >= 80, `Expected score >= 80, got ${highMatch.score}`);
  assert.ok(highMatch.matchedSkills.includes('React'));
  assert.ok(highMatch.matchedSkills.includes('TypeScript'));
  assert.ok(highMatch.matchedSkills.includes('Next.js'));

  assert.ok(lowMatch.score <= 35, `Expected score <= 35, got ${lowMatch.score}`);
  assert.equal(lowMatch.matchedSkills.length, 0);
});

test('rankJobsByResume sorts higher match jobs to the top', () => {
  const profile = {
    skills: ['Python', 'Machine Learning', 'PyTorch'],
    experienceLevel: 'senior',
    targetRoles: ['Data', 'Engineering'],
  };

  const jobs = [
    { id: '1', title: 'Sales Executive', role: 'Sales', level: 'mid', skills: [] },
    { id: '2', title: 'Senior ML Engineer', role: 'Data', level: 'senior', skills: ['Python', 'PyTorch'] },
    { id: '3', title: 'Python Backend Developer', role: 'Engineering', level: 'mid', skills: ['Python'] },
  ];

  const ranked = rankJobsByResume(jobs, profile);

  assert.equal(ranked[0].id, '2');
  assert.equal(ranked[1].id, '3');
  assert.equal(ranked[2].id, '1');
  assert.ok(ranked[0].resumeMatch.score > ranked[1].resumeMatch.score);
  assert.ok(ranked[1].resumeMatch.score > ranked[2].resumeMatch.score);
});

test('extractResumeProfile derives tenure from experience dates, not project durations', () => {
  const profile = extractResumeProfile(`
    Full-Stack & AI Engineer
    Built a 5-year cost simulation.
    EXPERIENCE
    Multicloud Engineer — Cognizant  Feb 2026 – Sep 2026
    Freelance Developer  Dec 2025 – Feb 2026
    Technical Intern  Jul 2025 – Dec 2025
    PROJECTS
    Mapping HYD
  `);

  assert.ok(profile.experienceYears >= 1.1 && profile.experienceYears <= 1.3, `Expected about 1.2 years, got ${profile.experienceYears}`);
  assert.equal(profile.experienceLevel, 'junior');
});

test('scoreJobMatch is conservative for unrelated, sparse, and over-senior roles', () => {
  const profile = {
    skills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'Android', 'AI / GenAI', 'Azure', 'CI/CD'],
    experienceLevel: 'junior',
    targetRoles: ['Engineering'],
  };

  const recruiter = scoreJobMatch({
    title: 'Recruiter Team Lead', role: 'People/HR', level: 'mid',
    snippet: 'Own recruiting, onboarding and training for a team.',
  }, profile);
  const seniorAiValidation = scoreJobMatch({
    title: 'Senior Systems Engineer, AI Validation', role: 'Data', level: 'senior',
    skills: ['AI / GenAI'], snippet: 'Lead AI validation programs.',
  }, profile);
  const azureDevops = scoreJobMatch({
    title: 'Azure DevOps Engineer', role: 'Engineering', level: 'unknown',
    skills: ['Azure', 'CI/CD'], snippet: 'Build Azure DevOps and GitHub Actions pipelines.',
  }, profile);
  const android = scoreJobMatch({
    title: 'Android Engineer', role: 'Engineering', level: 'unknown', skills: ['Android'],
  }, profile);

  assert.ok(recruiter.score <= 10, `Recruiter should be irrelevant, got ${recruiter.score}`);
  assert.ok(seniorAiValidation.score <= 35, `Senior single-keyword role should be a weak match, got ${seniorAiValidation.score}`);
  assert.ok(azureDevops.score <= 65, `Two-keyword DevOps role should not be a high-confidence match, got ${azureDevops.score}`);
  assert.ok(android.score <= 55, `Single-keyword Android role should remain tentative, got ${android.score}`);
});

test('scoreJobMatch does not invent a neutral score for an empty resume profile', () => {
  const result = scoreJobMatch({ title: 'Software Engineer', role: 'Engineering' }, { skills: [] });
  assert.equal(result.score, 0);
});
