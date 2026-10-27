import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeResumeATS, extractSkills } from '../lib/resume/ats-engine.js';
import {
  createSafeFallback,
  extractGuidedPlaceholders,
  hasMeaningfulJobDescription,
  stripGuidedPlaceholders,
  validateTailoredResult,
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
