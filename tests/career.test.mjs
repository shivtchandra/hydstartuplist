import test from "node:test";
import assert from "node:assert/strict";
import { skillMatcher, prefilterScore, shortlistJobs, foreignOnly, isEntryJob, curateJobs, experienceEligibility, assessmentConfidence, availabilityInfo, isRecommendedRow, matchingDescription } from "../lib/career/prefilter.js";
import { buildMatchPrompt, matchSchemaForJobs, missingRequiredDegree } from "../lib/career/match-ai.js";
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

test("shortlist excludes ancient jobs and respects maxDays", () => {
  const now = Date.now();
  const jobs = [
    { id: "recent", title: "Java Developer", role: "Engineering", level: "mid", postedAt: new Date(now - 2 * 86400000).toISOString() },
    { id: "ancient", title: "Backend Engineer", role: "Engineering", level: "mid", postedAt: new Date(now - 365 * 86400000).toISOString() },
  ];
  const weekOnly = shortlistJobs(jobs, profile, { limit: 10, now, maxDays: 7 });
  assert.equal(weekOnly.length, 1);
  assert.equal(weekOnly[0].job.id, "recent");
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

test("country-specific remote titles and full-text location headers are excluded", () => {
  for (const country of ["Croatia", "Slovenia", "Luxembourg", "Switzerland"]) {
    assert.equal(foreignOnly({ title: `Software Engineer - City, ${country}`, location: "Remote" }), true);
  }
  assert.equal(foreignOnly({ title: "Software Engineer - Kolkata, India", location: "Remote" }), false);
  assert.equal(foreignOnly({ title: "Software Engineer - US Timezone", location: "Remote" }), false);
  assert.equal(foreignOnly({ title: "Intern", location: "Remote", description: "Program Location: Remote (US)* Duration: 4 months" }), true);
  assert.equal(foreignOnly({ title: "Engineer", location: "Hyderabad", description: "We have offices in Germany and France." }), false);
  const posting = { title: "Software Engineer, AI Data", company: "Example", location: "Remote", work: "remote" };
  const rows = curateJobs([
    { ...posting, id: "foreign", title: posting.title + " - Split, Croatia" },
    { ...posting, id: "kolkata", title: posting.title + " - Kolkata, India" },
    { ...posting, id: "kochi", title: posting.title + " - Kochi, India" },
  ]);
  assert.deepEqual(rows.map((job) => job.id), ["kolkata"]);
});

test("fresher profiles favour entry roles and never see senior bands", () => {
  const fresher = { ...profile, level: "intern", targetTitles: ["Software Engineering Intern", "Backend Engineer"] };
  const jobs = [
    { id: "i", title: "Software Engineering Intern", role: "Engineering", level: "intern" },
    { id: "s", title: "Senior Backend Engineer", role: "Engineering", level: "senior" },
    { id: "m", title: "Backend Engineer", role: "Engineering", level: "mid" },
  ];
  const out = shortlistJobs(jobs, fresher).map((r) => r.job.id);
  assert.equal(out[0], "i");
  assert.ok(!out.includes("s"));
  assert.deepEqual(shortlistJobs(jobs, fresher, { entryOnly: true }).map((r) => r.job.id), ["i"]);
  assert.equal(isEntryJob({ title: "Graduate Engineer Trainee", level: "unknown" }), true);
  assert.equal(isEntryJob({ title: "Software Engineering Senior Associate", level: "unknown" }), false);
});

test("shortlist merges prefixed reposts, preserves locations, and drops closed jobs", () => {
  const base = { company: "Guild", title: "Python & Next.js Developer (Freshers)", location: "Hyderabad", role: "Engineering" };
  const jobs = [
    { ...base, id: "a" },
    { ...base, id: "b", title: "Job Opening: Python and Next.js Developer (Freshers)" },
    { ...base, id: "c", location: "Bengaluru" },
    { ...base, id: "closed", title: "Other", status: "closed" },
  ];
  assert.deepEqual(curateJobs(jobs).map((j) => j.id), ["a", "c"]);
  assert.equal(curateJobs([{ ...base, id: "url-a", url: "https://example.com/jobs/1?utm_source=a" },
    { ...base, id: "url-b", url: "https://example.com/jobs/1?utm_source=b" }]).length, 1);
});

test("explicit experience requirements gate freshers independently of titles and AI scores", () => {
  const fresher = { ...profile, level: "intern", yearsExperience: 0 };
  const senior = { id: "s", title: "Backend Engineer", role: "Engineering", level: "mid", experience: "4-6 years" };
  assert.equal(experienceEligibility(senior, fresher).status, "outside");
  assert.equal(shortlistJobs([senior], fresher).length, 0);
  assert.equal(experienceEligibility({ experience: "1-2 years" }, fresher).status, "check");
  assert.equal(experienceEligibility({ experience: "0-2 years" }, fresher).status, "met");
  assert.equal(isEntryJob({ title: "Associate Engineer", level: "junior", experience: "1-2 years" }), false);
  assert.equal(isEntryJob({ title: "Associate Engineer", level: "junior", description: "Minimum 3 years of experience" }), false);
  assert.equal(experienceEligibility({}, fresher).status, "unknown");
});

test("incomplete job evidence and experience shortfalls cannot receive a good match", () => {
  const met = [{ requirement: "Java", evidence: "Java" }, { requirement: "Spring", evidence: "Spring Boot" }];
  const result = { jobId: "1", score: 95, why: "Your skills align.", met, gaps: [], confidence: "sufficient" };
  const job = { id: "1", description: "Requirements: Java and Spring Boot. ".repeat(15), experience: "4-6 years" };
  const options = { jobs: [job], profile: { yearsExperience: 0 } };
  const senior = validateMatches({ results: [result] }, RESUME, ["1"], options)["1"];
  assert.ok(senior.score <= 39);
  assert.equal(senior.assessmentVersion, 4);
  assert.equal(senior.assessedYears, 0);
  const limited = validateMatches({ results: [{ ...result, confidence: "limited" }] }, RESUME, ["1"], { jobs: [{ ...job, experience: "0-2 years" }] })["1"];
  assert.ok(limited.score <= 64);
  assert.equal(limited.confidence, "limited");
  assert.equal(assessmentConfidence(job.description, { why: "The abbreviated posting does not reveal full requirements." }), "limited");
});

test("recommendations require recent source evidence, adequate requirements and no experience shortfall", () => {
  const now = Date.parse("2026-11-03T00:00:00Z");
  assert.equal(availabilityInfo({ fetchedAt: "2026-11-03T00:00:00Z" }, now).recent, false);
  assert.equal(availabilityInfo({ lastSeenAt: "2026-10-01T00:00:00Z" }, now).recent, false);
  const availability = availabilityInfo({ lastSeenAt: "2026-11-02T00:00:00Z", status: "active" }, now);
  assert.equal(availability.recent, true);
  const row = { match: { score: 90 }, confidence: "sufficient", eligibility: { status: "met" }, availability };
  assert.equal(isRecommendedRow(row), true);
  assert.equal(isRecommendedRow({ ...row, eligibility: { status: "check" } }), false);
  assert.equal(isRecommendedRow({ ...row, confidence: "limited" }), false);
  assert.equal(isRecommendedRow({ ...row, availability: { recent: false } }), false);
});

test("mandatory degree levels cannot be replaced by unrelated tenure or an associate degree", () => {
  const job = { description: "Master’s /Bachelor’s degree in Business, Marketing or Healthcare. 2-5 years of sales, preferably in healthcare." };
  assert.match(missingRequiredDegree(job, "Associate of Business Administration. Ten years of sales."), /required bachelor's/);
  assert.equal(missingRequiredDegree(job, "Bachelor of Science in Computer Science"), "");
  assert.equal(missingRequiredDegree({ description: "Bachelor's degree preferred." }, "Associate degree"), "");
  assert.equal(missingRequiredDegree({ description: "Bachelor's degree or equivalent practical experience." }, "Associate degree and ten years of sales"), "");
  const results = [{ jobId: "degree", score: 90, why: "Relevant sales.", confidence: "sufficient", met: [], gaps: [] }];
  const match = validateMatches({ results }, "Associate of Business Administration", ["degree"], { jobs: [{ id: "degree", ...job }] }).degree;
  assert.ok(match.score < 65);
  assert.match(match.gaps[0], /required bachelor's/);
});

test("matching preserves late requirements and marks any remaining omitted source", () => {
  const source = "Company context. ".repeat(250) + "Required: Ubuntu or Linux experience.";
  assert.ok(source.indexOf("Required:") > 3000);
  assert.match(matchingDescription(source), /Required: Ubuntu or Linux experience/);
  assert.equal(matchingDescription("Complete short description"), "Complete short description");
  const long = matchingDescription("Long source. ".repeat(1000));
  assert.ok(long.length <= 6000);
  assert.match(long, /source continues beyond this excerpt/);
});

test("match response schema requires the complete batch and exact requested identifiers", () => {
  const schema = matchSchemaForJobs(["ats-example-one", "12345"]);
  assert.match(buildMatchPrompt("resume", [{ id: "1", title: "Engineer", company: "Example", location: "Hyderabad" }]), /Location: Hyderabad/);
  assert.equal(schema.properties.results.minItems, 2);
  assert.equal(schema.properties.results.maxItems, 2);
  assert.deepEqual(schema.properties.results.items.properties.jobId.enum, ["ats-example-one", "12345"]);
});

test("match prompt adds early-career rules only for freshers", () => {
  const jobs = [{ id: "1", title: "Intern", company: "A", description: "x" }];
  assert.match(buildMatchPrompt("resume", jobs, { earlyCareer: true }), /EARLY CAREER/);
  assert.doesNotMatch(buildMatchPrompt("resume", jobs), /EARLY CAREER/);
  assert.match(buildMatchPrompt("resume", jobs), /Separate decisive eligibility\/core-work requirements from supporting practices/);
});
