import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApplicationAnswers,
  buildExtensionHandoff,
  createApplicationPack,
  mergeApplicationPack,
  normalizePassport,
  selectResumeEvidence,
} from "../lib/application-pack.js";

const resume = `# Asha Rao
asha@example.com

## Experience
- Built a React support dashboard used by 12 operations teams.
- Reduced weekly reporting time by 35% using Python automation.
- Collaborated with product and engineering teams to launch customer workflows.

## Skills
React, Python, SQL`;

const match = {
  overallScore: 72,
  matchedSkills: ["react", "python", "sql"],
  matchedTokens: ["dashboard", "automation"],
  missingSkills: ["aws"],
};

test("normalizes a local candidate passport without unknown fields", () => {
  const passport = normalizePassport({ fullName: " Asha Rao ", email: "asha@example.com", secret: "ignore" });
  assert.equal(passport.fullName, "Asha Rao");
  assert.equal(passport.email, "asha@example.com");
  assert.equal("secret" in passport, false);
});

test("application answers quote verified resume evidence", () => {
  const answers = buildApplicationAnswers({ resumeText: resume, jobTitle: "Frontend Engineer", company: "Acme", match });
  assert.equal(answers.length, 3);
  for (const answer of answers) {
    for (const evidence of answer.evidence) assert.ok(resume.includes(evidence));
  }
  assert.match(answers[0].answer, /Frontend Engineer/);
  assert.match(answers[0].answer, /Acme/);
});

test("selects the most role-relevant evidence first", () => {
  const evidence = selectResumeEvidence(resume, match, 2);
  assert.match(evidence[0], /React|Python/);
  assert.equal(evidence.length, 2);
});

test("creates an immutable per-job pack and extension handoff", () => {
  const passport = normalizePassport({
    fullName: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 90000 00000",
    location: "Hyderabad, India",
    masterResume: resume,
  });
  const pack = createApplicationPack({
    passport,
    resumeText: resume,
    tailoredResume: resume,
    job: { id: "job-1", title: "Frontend Engineer", company: "Acme", url: "https://jobs.example/apply" },
    baseline: match,
    tailored: { achievedAtsScore: 81, remainingMissingSkills: ["aws"], placeholders: [], warnings: [] },
    mode: "openai",
    now: new Date("2026-10-27T08:00:00.000Z"),
  });

  assert.equal(pack.status, "ready");
  assert.equal(pack.tailoredScore, 81);
  assert.match(pack.fileName, /asha-rao_Resume_frontend-engineer_acme\.pdf/);
  assert.equal(pack.job.url, "https://jobs.example/apply");

  const handoff = buildExtensionHandoff(pack, passport);
  assert.equal(handoff.profile.firstName, "Asha");
  assert.equal(handoff.profile.lastName, "Rao");
  assert.equal(handoff.activeApplicationPack.id, pack.id);
});

test("keeps the newest version of each application pack", () => {
  const first = { id: "a", updatedAt: "old" };
  const latest = { id: "a", updatedAt: "new" };
  assert.deepEqual(mergeApplicationPack([first, { id: "b" }], latest), [latest, { id: "b" }]);
});
