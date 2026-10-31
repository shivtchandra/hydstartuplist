import test from "node:test";
import assert from "node:assert/strict";
import { skillMatcher, prefilterScore, shortlistJobs, foreignOnly } from "../lib/career/prefilter.js";
import { validateProfile, fallbackProfile } from "../lib/career/profile-ai.js";
import { validateMatches } from "../lib/career/match-ai.js";
import { evidenceInText, normalizeForEvidence, callOpenAIJson, AIUnavailableError } from "../lib/career/openai.js";

const RESUME = `Ravi Kumar
Backend Engineer, Hyderabad
EXPERIENCE
Software Engineer, Zenoti (2022 - 2025)
- Built REST APIs in Java and Spring Boot serving 2M requests/day
- Migrated reporting jobs to PostgreSQL and reduced runtime by 40%
SKILLS
Java, Spring Boot, PostgreSQL, Docker, Kafka`;

test("short skill names only match standalone tokens", () => {
  const js = skillMatcher("JS");
  assert.equal(js("Senior JS Developer"), true);
  assert.equal(js("JSON parsing engineer"), false);
  const go = skillMatcher("Go");
  assert.equal(go("Go Developer"), true);
  assert.equal(go("Google Ads Manager"), false);
  const next = skillMatcher("Next.js");
  assert.equal(next("Next.js engineer"), true);
  assert.equal(next("next steps in hiring"), false);
  assert.equal(skillMatcher("C++")("C++ Developer"), true);
});

test("profile validator drops skills the resume does not evidence", () => {
  const p = validateProfile(
    {
      name: "Ravi Kumar", headline: "Backend", yearsExperience: 3, level: "mid",
      roleFamilies: ["Engineering", "Astronaut"], targetTitles: ["Backend Engineer"],
      skills: [
        { name: "Java", evidence: "Built REST APIs in Java and Spring Boot", strength: "core" },
        { name: "Kubernetes", evidence: "Deployed to Kubernetes clusters", strength: "core" },
        { name: "Kafka", evidence: "Kafka", strength: "mentioned" },
      ],
      locations: ["Hyderabad"], openToRemote: true,
    },
    RESUME,
  );
  assert.deepEqual(p.skills.map((s) => s.name), ["Java", "Kafka"]);
  assert.deepEqual(p.roleFamilies, ["Engineering"]);
  assert.equal(p.level, "mid");
});

test("profile validator rejects a profile with no evidenced skills", () => {
  assert.throws(() => validateProfile({ skills: [{ name: "Rust", evidence: "wrote Rust", strength: "core" }] }, RESUME));
});

test("fallback profile uses the regex extractor", () => {
  const p = fallbackProfile(RESUME);
  assert.equal(p.source, "fallback");
  assert.ok(p.skills.some((s) => /java/i.test(s.name)));
});

test("evidence matching tolerates spacing but not invention", () => {
  const src = normalizeForEvidence(RESUME);
  assert.equal(evidenceInText("Built  REST APIs in Java", src), true);
  assert.equal(evidenceInText("Led a team of 12 engineers", src), false);
});

const profile = {
  level: "mid", roleFamilies: ["Engineering"], targetTitles: ["Backend Engineer", "Java Developer"], openToRemote: true,
  skills: [{ name: "Java", strength: "core" }, { name: "Spring Boot", strength: "core" }, { name: "Go", strength: "mentioned" }],
};

test("prefilter ranks a fitting backend role above an unrelated one", () => {
  const good = prefilterScore({ title: "Backend Engineer - Java", role: "Engineering", level: "mid" }, profile);
  const bad = prefilterScore({ title: "Nursing Officer", role: "Healthcare / Nutrition", level: "mid" }, profile);
  const tooSenior = prefilterScore({ title: "Principal Backend Engineer", role: "Engineering", level: "manager" }, profile);
  assert.ok(good.score > tooSenior.score, `${good.score} > ${tooSenior.score}`);
  assert.ok(tooSenior.score > bad.score);
});

test("shortlist drops weak jobs and caps the list", () => {
  const jobs = [
    { id: "1", title: "Java Developer", role: "Engineering", level: "mid" },
    { id: "2", title: "Sales Executive", role: "Sales", level: "junior" },
    { id: "3", title: "Backend Engineer", role: "Engineering", level: "junior" },
  ];
  const out = shortlistJobs(jobs, profile, { limit: 2 });
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((r) => r.job.id).sort(), ["1", "3"]);
});

test("match validator keeps requested jobs, drops fake evidence, caps unproven scores", () => {
  const out = validateMatches(
    {
      results: [
        { jobId: "a", score: 92, verdict: "strong", why: "Java + Spring", gaps: [],
          met: [{ requirement: "Java", evidence: "Built REST APIs in Java and Spring Boot" }, { requirement: "SQL", evidence: "Migrated reporting jobs to PostgreSQL" }] },
        { jobId: "b", score: 90, verdict: "strong", why: "claims", gaps: [],
          met: [{ requirement: "Kubernetes", evidence: "Ran Kubernetes in production" }] },
        { jobId: "zzz", score: 99, verdict: "strong", why: "", met: [], gaps: [] },
      ],
    },
    RESUME,
    ["a", "b"],
  );
  assert.deepEqual(Object.keys(out).sort(), ["a", "b"]);
  assert.equal(out.a.score, 92);
  assert.equal(out.a.verdict, "strong");
  assert.equal(out.b.met.length, 0);
  assert.equal(out.b.score, 45);
  assert.equal(out.b.verdict, "stretch");
});

test("OpenAI client reports missing key and bad responses as AIUnavailableError", async () => {
  await assert.rejects(callOpenAIJson({ apiKey: "", system: "s", prompt: "p", schemaName: "x", schema: {} }), AIUnavailableError);
  const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await assert.rejects(callOpenAIJson({ apiKey: "k", system: "s", prompt: "p", schemaName: "x", schema: {}, fetchImpl }), /500/);
  const okFetch = async () => ({ ok: true, json: async () => ({ output_text: '{"a":1}' }) });
  assert.deepEqual(await callOpenAIJson({ apiKey: "k", system: "s", prompt: "p", schemaName: "x", schema: {}, fetchImpl: okFetch }), { a: 1 });
});

import { keepGroundedSentences, TAILOR_OUTPUT_SCHEMA } from "../lib/resume/tailor.js";

test("tailor schema requires cover letter and screening answers", () => {
  assert.ok(TAILOR_OUTPUT_SCHEMA.required.includes("coverLetter"));
  assert.ok(TAILOR_OUTPUT_SCHEMA.required.includes("screeningAnswers"));
});

test("cover letter keeps grounded sentences and drops invented claims", () => {
  const letter = "I built REST APIs in Java at Zenoti. I also led 15 engineers on Kubernetes migrations. I would love to join Acme as a Backend Engineer.";
  const out = keepGroundedSentences(letter, `${RESUME}\nBackend Engineer\nAcme`);
  assert.equal(out.dropped, 1);
  assert.match(out.text, /REST APIs in Java/);
  assert.match(out.text, /join Acme/);
  assert.doesNotMatch(out.text, /15 engineers/);
});

test("country-restricted remote roles outside India are excluded", () => {
  assert.equal(foreignOnly({ title: "Software Engineer II (Venezuela)", location: "Venezuela, Remote" }), true);
  assert.equal(foreignOnly({ title: "Senior Engineer", location: "Türkiye, Remote" }), true);
  assert.equal(foreignOnly({ title: "Backend Engineer", location: "Hyderabad, Telangana, India" }), false);
  assert.equal(foreignOnly({ title: "Engineer", location: "Remote - India" }), false);
  assert.equal(foreignOnly({ title: "Engineer", location: "Home based - Worldwide" }), false);
  assert.equal(foreignOnly({ title: "Engineer (US/India)", location: "Remote" }), false);
  assert.equal(foreignOnly({ title: "QC Specialist (US Timezone)", location: "Remote" }), false);
});
