import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeResumeATS, extractSkills } from '../lib/resume/ats-engine.js';
import {
  createSafeFallback,
  extractGuidedPlaceholders,
  hasMeaningfulJobDescription,
  stripGuidedPlaceholders,
  signedLetter,
  truthfulHeadline,
  unchangedShare,
  validateTailoredResult,
  verifiedChanges,
} from '../lib/resume/tailor.js';

const resume = `# Asha Rao
asha@example.com | Hyderabad

## Summary
Software engineer focused on reliable web products.

## Skills
JavaScript, React, Node.js, PostgreSQL

## Experience
Software Engineer | Bright Labs | 2022 - Present
- Built a React dashboard used by internal operations teams.
- Designed Node.js APIs backed by PostgreSQL.

## Projects
Hiring Tracker | React, Node.js
- Created a workflow for reviewing candidate applications.

## Education
B.Tech in Computer Science, JNTU, 2022`;

const jobDescription = `In this role you will build reliable product experiences, design APIs, collaborate with operations teams, and maintain production services. Requirements include JavaScript, React, Node.js, SQL, clear communication, and experience shipping web applications. Preferred qualifications include PostgreSQL and system design.`;

test('job-description validation rejects company boilerplate', () => {
  const boilerplate = 'Waymo is an autonomous driving technology company with a mission to build the world’s most trusted driver. '.repeat(3);
  assert.equal(hasMeaningfulJobDescription(boilerplate), false);
  assert.equal(hasMeaningfulJobDescription(jobDescription), true);
});

test('safe fallback preserves evidence and only adds explicit prompts', () => {
  const baseline = analyzeResumeATS({ resumeText: resume, jobDescription, jobTitle: 'Frontend Engineer' });
  const result = createSafeFallback({
    resumeText: resume,
    jobDescription,
    jobTitle: 'Frontend Engineer',
    baseline,
  });

  assert.match(result.fullTailoredResume, /Bright Labs/);
  assert.match(result.fullTailoredResume, /Hiring Tracker/);
  assert.match(result.fullTailoredResume, /B\.Tech in Computer Science, JNTU, 2022/);
  assert.ok(result.placeholders.length > 0);
  assert.deepEqual(extractSkills(stripGuidedPlaceholders(result.fullTailoredResume)).sort(), extractSkills(resume).sort());
});

test('validator rejects fabricated metrics', () => {
  assert.throws(
    () => validateTailoredResult({
      fullTailoredResume: resume.replace('internal operations teams', '10,000 users and reduced latency by 35%'),
      changes: [],
      placeholders: [],
      warnings: [],
    }, resume),
    /unsupported number/,
  );
});

test('validator rejects skills absent from the source resume', () => {
  assert.throws(
    () => validateTailoredResult({
      fullTailoredResume: `${resume}\n- Deployed services with Kubernetes.`,
      changes: [],
      placeholders: [],
      warnings: [],
    }, resume),
    /unsupported skill/,
  );
});

test('validator accepts factual edits and tracks embedded placeholders', () => {
  const tailored = resume.replace(
    'Built a React dashboard used by internal operations teams.',
    'Built a React dashboard for internal operations teams. [add a verified outcome or scale]',
  );
  const result = validateTailoredResult({
    fullTailoredResume: tailored,
    changes: [{
      section: 'Experience',
      before: 'Built a React dashboard used by internal operations teams.',
      after: 'Built a React dashboard for internal operations teams.',
      reason: 'Tightened the wording.',
    }],
    placeholders: [],
    warnings: [],
  }, resume);

  assert.equal(result.changes.length, 1);
  assert.equal(result.placeholders.length, 1);
  assert.deepEqual(extractGuidedPlaceholders(result.fullTailoredResume), ['[add a verified outcome or scale]']);
  assert.doesNotMatch(stripGuidedPlaceholders(result.fullTailoredResume), /\[add/);
});

test('change notes must quote both resumes and show a real move', () => {
  const source = '- Built dashboards for live cloud services.\n- Tuned PostgreSQL queries for the vendor panel.';
  const reworded = source.replace('Tuned PostgreSQL queries', 'Sped up PostgreSQL queries');
  const swapped = source.split('\n').reverse().join('\n');
  const note = (before, after) => ({ section: 'Experience', before, after, reason: 'x' });
  const keep = (changes, output) => verifiedChanges(changes, source, output).length;

  assert.equal(keep([note('Tuned PostgreSQL queries', 'Sped up PostgreSQL queries')], reworded), 1);
  assert.equal(keep([note('Original experience bullets.', 'Sped up PostgreSQL queries')], reworded), 0);
  assert.equal(keep([note('Tuned PostgreSQL queries', 'Tuned PostgreSQL queries')], source), 0);
  assert.equal(keep([note('Built dashboards', 'Tuned PostgreSQL queries')], source), 0);
  assert.equal(keep([note('Built dashboards', 'Tuned PostgreSQL queries')], swapped), 1);
});

test('blanks are removed from the summary and when asking about a skill, kept for a missing outcome', () => {
  const ask = '[Add verified workplace technology, or IT support experience, if applicable.]';
  const tailored = resume
    .replace('Built a React dashboard used by internal operations teams.', `Built a React dashboard used by internal operations teams. [add a verified outcome or scale] ${ask}`)
    .replace(/^(SUMMARY|Summary)\n(.*)$/m, `$1\n$2 [add your strongest result]`);
  const result = validateTailoredResult({ fullTailoredResume: tailored, changes: [], placeholders: [{ prompt: ask }], warnings: [] }, resume);
  assert.doesNotMatch(result.fullTailoredResume, /if applicable|strongest result/);
  assert.match(result.fullTailoredResume, /\[add a verified outcome or scale\]/);
  assert.deepEqual(result.placeholders.map((p) => p.prompt), ['[add a verified outcome or scale]']);
});

test('a resume without clear headings can be rewritten, but credentials still cannot be invented', () => {
  const messy = 'Neha Kulkarni\nQuality Analyst at Finbridge Technologies, wrote 450 test cases with Selenium and REST APIs.\nB.Tech (ECE) GITAM University 2017 - 2021';
  const tidy = '# Neha Kulkarni\n## EXPERIENCE\n### Quality Analyst — Finbridge Technologies\n- Wrote 450 test cases with Selenium and REST API checks.\n## EDUCATION\n- B.Tech (ECE) — GITAM University | 2017 - 2021';
  assert.match(validateTailoredResult({ fullTailoredResume: tidy, changes: [], placeholders: [], warnings: [] }, messy).fullTailoredResume, /GITAM/);
  assert.throws(
    () => validateTailoredResult({ fullTailoredResume: `${tidy}\n- Master of Business Administration, Harvard Business School`, changes: [], placeholders: [], warnings: [] }, messy),
    /unsupported credentials/,
  );
});

test('unsupported headline titles are removed without restoring an unrelated old profession', () => {
  const source = '# Priya\n\n## Experience\nRegional Sales Manager — Malabar Foods | 2022 - Present\n- Managed accounts through negotiation.';
  const head = (title) => `# Priya\n**${title} | Negotiation**\n\n## EXPERIENCE`;
  assert.match(truthfulHeadline(head('Account Executive'), source), /^\*\*Negotiation\*\*$/m);
  assert.match(truthfulHeadline(head('Regional Sales Manager'), source), /^\*\*Regional Sales Manager \| Negotiation\*\*$/m);
  assert.doesNotMatch(truthfulHeadline(head('Software Engineer'), '# Asha\nBuilt a quiz app in React as a teacher.'), /Software Engineer|Negotiation/);
});

test('skills-only headlines retain source evidence and reject unsupported claims in every position', () => {
  const source = '# Asha\nTeacher who built a React frontend with TypeScript.';
  const output = truthfulHeadline('# Asha\n**React | Senior Frontend Engineer | TypeScript | Kubernetes**\n## SUMMARY\nBuilt a frontend.', source);
  assert.match(output, /^\*\*React \| TypeScript\*\*$/m);
  assert.doesNotMatch(output, /Senior|Kubernetes|Teacher/);
});

test('a near copy of the source is called out', () => {
  assert.equal(unchangedShare(resume, resume), 1);
  const full = `${resume}\n- ${'Shipped internal tools for the operations team every quarter. '.repeat(10)}`;
  const check = (source) => validateTailoredResult({ fullTailoredResume: source, changes: [], placeholders: [], warnings: [] }, source).warnings.join(' ');
  assert.match(check(full), /stays very close/);
  assert.match(check(resume), /little detail/);
});

test('validator permits factual education formatting changes', () => {
  const source = resume.replace('JNTU, 2022', 'JNTU, 2022.');
  const tailored = source.replace(
    'B.Tech in Computer Science, JNTU, 2022.',
    '**B.Tech in Computer Science**, JNTU | 2022',
  );

  assert.doesNotThrow(() => validateTailoredResult({
    fullTailoredResume: tailored,
    changes: [],
    placeholders: [],
    warnings: [],
  }, source));
});

test('a lowercase source title is capitalised in the headline', () => {
  const out = truthfulHeadline('# A B\n**support engineer | Linux**\n## SUMMARY\nText', 'A B\nsupport engineer at Sagar Tech using Linux');
  assert.match(out, /^\*\*Support Engineer \| Linux\*\*$/m);
});

test('a cover letter gets the candidate name once', () => {
  const resume = '# NEHA KULKARNI\nPune | n@example.com';
  assert.equal(signedLetter('Thank you.', resume), 'Thank you.\n\nSincerely,\nNeha Kulkarni');
  assert.equal(signedLetter('Thank you.\n\nRegards,\nNeha Kulkarni', resume), 'Thank you.\n\nRegards,\nNeha Kulkarni');
  assert.equal(signedLetter('', resume), '');
});
