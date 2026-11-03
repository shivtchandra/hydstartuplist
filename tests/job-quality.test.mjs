import test from "node:test";
import assert from "node:assert/strict";
import { fixMojibake, isInvalidJobListing, jobDescriptionText, jobSnippet, plausibleSalary, stripHtml } from "../lib/job-content.js";
import { inferExperienceLevel, inferRoleType, isOpenToFreshers, parseYearsRequirement, workplaceFromText } from "../lib/job-facets.js";
import { applyJobDetail, fetchFullJobText, fetchJobDetails, jobDetailUrl, parseAtsJobId } from "../lib/ats/job-details.js";
import { isEntryJob } from "../lib/career/prefilter.js";
import { prepareJobs } from "../lib/opportunities.js";
import { jobUrlId } from "../lib/jobs-seo.js";
import { isCuratedRemoteEligibleLocation, isForeignRemoteListing } from "../lib/ats/geo.js";

const NOW = Date.parse("2026-11-02T00:00:00Z");

test("stripHtml removes markdown that showed literally on cards", () => {
  assert.equal(stripHtml("**Join Amgen** [apply](https://x.com/a)\n## Role").replace(/\s+/g, " ").trim(), "Join Amgen apply Role");
});

test("jobSnippet skips ATS template headers", () => {
  const out = jobSnippet("JOB DATA Build payment APIs for merchants across India and own them in production.");
  assert.match(out, /^Build payment APIs/);
});

test("plausibleSalary drops hourly or mangled values and keeps real ones", () => {
  assert.equal(plausibleSalary({ min: 1, max: 1 }), null);
  assert.equal(plausibleSalary({ min: 4, max: 6, currency: "INR" }), null);
  assert.deepEqual(plausibleSalary({ min: 400000, max: 600000 }), { min: 400000, max: 600000 });
  assert.deepEqual(plausibleSalary({ min: 40, max: 60, currency: "USD" }), { min: 40, max: 60, currency: "USD" });
});

test("invalid listing rejects training ads and long-gone batches", () => {
  assert.equal(isInvalidJobListing({ title: "Free Internship with Certificate", company: "X", url: "https://x.com/1" }), true);
  assert.equal(isInvalidJobListing({ title: "Fresher Hiring 2021 Batch", company: "X", url: "https://x.com/1" }), true);
  assert.equal(isInvalidJobListing({ title: "Software Engineer", company: "X", url: "https://x.com/1" }), false);
});

test("stated years beat a bare Associate title", () => {
  assert.notEqual(inferExperienceLevel("Associate Consultant", "", { experience: "3-6 years" }), "junior");
  assert.equal(inferExperienceLevel("Associate Director", "", {}) === "junior", false);
  assert.equal(inferExperienceLevel("Software Associate", "", {}), "junior");
});

test("role rules place finance and trust and safety titles correctly", () => {
  assert.equal(inferRoleType("Finance Analyst"), "Finance");
  assert.equal(inferRoleType("Associate Principal, Trust and Safety"), "Operations");
  assert.notEqual(inferRoleType("Associate Principal Engineer"), "Education");
});

test("isOpenToFreshers hides stated experience, doctoral roles and stale rows", () => {
  const base = { title: "Graduate Engineer", location: "Hyderabad", postedAt: "2026-10-20T00:00:00Z" };
  assert.equal(isOpenToFreshers(base, NOW), true);
  assert.equal(isOpenToFreshers({ ...base, experience: "3-5 years" }, NOW), false);
  assert.equal(isOpenToFreshers({ ...base, title: "PhD Research Intern" }, NOW), false);
  assert.equal(isOpenToFreshers({ ...base, location: "Remote, Poland" }, NOW), false);
  assert.equal(isOpenToFreshers({ ...base, postedAt: "2026-06-01T00:00:00Z" }, NOW), false);
  assert.equal(
    isOpenToFreshers({ ...base, postedAt: "2026-06-01T00:00:00Z", atsProvider: "workday", lastSeenAt: "2026-11-01T00:00:00Z" }, NOW),
    true,
  );
});

test("detail URLs match each provider", () => {
  const workday = { apiUrl: "https://a.wd1.myworkdayjobs.com/wday/cxs/a/Ext/jobs" };
  assert.equal(jobDetailUrl("workday", workday, "a", { externalPath: "/job/Hyd/Dev_R1" }), "https://a.wd1.myworkdayjobs.com/wday/cxs/a/Ext/job/Hyd/Dev_R1");
  const pcsx = { apiUrl: "https://c.example.com/api/pcsx/search?domain=c.com&num=50" };
  assert.match(jobDetailUrl("eightfold", pcsx, "c", { id: 7 }), /\/api\/pcsx\/position_details\?position_id=7&domain=c\.com/);
  const v2 = { apiUrl: "https://c.example.com/api/apply/v2/jobs?domain=c.com&num=50" };
  assert.equal(jobDetailUrl("eightfold", v2, "c", { id: 7 }), "https://c.example.com/api/apply/v2/jobs/7?domain=c.com");
  assert.match(jobDetailUrl("smartrecruiters", {}, "acme", { id: "9" }), /companies\/acme\/postings\/9$/);
});

test("SmartRecruiters detail keeps qualifications, where years are stated", () => {
  const merged = applyJobDetail("smartrecruiters", { id: "1" }, { jobAd: { sections: { jobDescription: { text: "Build" }, qualifications: { text: "2 years" } } } });
  assert.equal(merged.jobAd.sections.jobDescription.text, "Build\n2 years");
});

test("fetchJobDetails respects the limit and stops on 429", async () => {
  const rows = [1, 2, 3].map((n) => ({ externalPath: `/job/${n}` }));
  const meta = { apiUrl: "https://a.example.com/wday/cxs/a/E/jobs" };
  let calls = 0;
  const ok = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({ jobPostingInfo: { jobDescription: "text" } }) }; };
  const limited = await fetchJobDetails("workday", meta, "a", rows, { limit: 2, concurrency: 1, fetchImpl: ok });
  assert.equal(limited.size, 2);
  assert.equal(calls, 2);

  calls = 0;
  const blocked = async () => { calls += 1; return { ok: false, status: 429 }; };
  const none = await fetchJobDetails("workday", meta, "a", rows, { concurrency: 1, fetchImpl: blocked });
  assert.equal(none.size, 0);
  assert.equal(calls, 1);
});

test("remote filter keeps India and open-world roles, rejects other places", () => {
  for (const ok of ["Remote", "India (Remote)", "Remote - India", "Mumbai, MH (Remote)", "Bengaluru (Remote)", "Remote, Worldwide", "Home based - Worldwide", "APAC (Remote)", "Any Location (Remote)"]) {
    assert.equal(isCuratedRemoteEligibleLocation(ok), true, ok);
  }
  for (const bad of ["Remote - CA", "Malta Office (Remote)", "Bydgoszcz (Remote)", "BZ - Sao Paulo (Remote)", "Nebraska (Remote)", "Remote, Slovakia", "SpotDraft Inc. NY (Remote)"]) {
    assert.equal(isCuratedRemoteEligibleLocation(bad), false, bad);
  }
});

test("foreign remote rows go whichever source wrote them; India and unclear rows stay", () => {
  for (const job of [
    { title: "Enterprise Solutions Engineer - USA", location: "Remote" },
    { title: "Account Executive - Spain - Mid-Market", location: "Remote" },
    { title: "Backend Engineer", location: "Nebraska (Remote)" },
  ]) assert.equal(isForeignRemoteListing(job), true, job.title);
  for (const job of [
    { title: "Backend Engineer", location: "Remote" },
    { title: "Help us scale infrastructure", location: "Remote" },
    { title: "Solutions Engineer - India", location: "Remote" },
    { title: "Designer - USA", location: "Hyderabad (Remote)" },
    { title: "Designer", location: "Gachibowli" },
  ]) assert.equal(isForeignRemoteListing(job), false, job.title);
});

test("Fresher-open tag needs a recent role with no stated 2+ years", () => {
  const base = { title: "Associate Software Engineer", location: "Hyderabad", postedAt: "2026-10-20T00:00:00Z" };
  assert.equal(isEntryJob(base, NOW), true);
  assert.equal(isEntryJob({ ...base, experience: "2-5 years" }, NOW), false);
  assert.equal(isEntryJob({ ...base, title: "Junior Linux Kernel Engineer", postedAt: "2024-03-01T00:00:00Z" }, NOW), false);
  assert.equal(isEntryJob({ ...base, title: "Junior Linux Kernel Engineer", postedAt: "2024-03-01T00:00:00Z", atsProvider: "greenhouse", lastSeenAt: new Date(NOW).toISOString() }, NOW), true);
});

test("prepareJobs keeps verified evergreen openings and still drops stale listings", () => {
  const live = { id: "a", title: "Software Engineer", company: "Acme", location: "Hyderabad", url: "https://acme.com/1", atsProvider: "greenhouse", lastSeenAt: new Date().toISOString() };
  const age = (days) => new Date(Date.now() - days * 86400000).toISOString();
  assert.equal(prepareJobs([{ ...live, postedAt: age(100) }]).length, 1);
  assert.equal(prepareJobs([{ ...live, postedAt: age(300) }]).length, 1);
  assert.equal(prepareJobs([{ ...live, postedAt: age(300), lastSeenAt: age(7) }]).length, 0);
  assert.equal(prepareJobs([{ ...live, postedAt: age(300), status: "closed" }]).length, 0);
});

test("Career hub links resolve to exported job URLs, not raw ids", () => {
  assert.match(jobUrlId({ id: "ats-greenhouse-canonical-8249005", company: "Canonical", title: "Graduate Software Engineer", location: "Home based - Worldwide" }), /^canonical-graduate-software-engineer-/);
});

const BOARDS = [
  { atsProvider: "greenhouse", atsSlug: "tide", name: "Tide" },
  { atsProvider: "ashby", atsSlug: "interview-kickstart", name: "Interview Kickstart" },
  { atsProvider: "ashby", atsSlug: "interview", name: "Interview" },
];

test("parseAtsJobId picks the longest known slug", () => {
  assert.deepEqual(parseAtsJobId("ats-ashby-interview-kickstart-bf2a-48", BOARDS), { provider: "ashby", slug: "interview-kickstart", externalId: "bf2a-48" });
  assert.equal(parseAtsJobId("ats-lever-unknown-1", BOARDS), null);
  assert.equal(parseAtsJobId("5948204216", BOARDS), null);
});

test("fetchFullJobText returns the role and drops a split company heading", async () => {
  const content = "<p>A BOUT TIDE At Tide, we help SMEs save time and money.</p><h3>About the role</h3><p>You will build payment APIs. Requirements: 2 years of Python.</p>";
  const seen = [];
  const fetchImpl = async (url) => { seen.push(url); return { ok: true, json: async () => ({ content }) }; };
  const text = await fetchFullJobText({ id: "ats-greenhouse-tide-99" }, BOARDS, { fetchImpl });
  assert.equal(seen[0], "https://boards-api.greenhouse.io/v1/boards/tide/jobs/99");
  assert.match(text, /build payment APIs/);
  assert.doesNotMatch(text, /help SMEs/);
});

test("fetchFullJobText makes no request for unknown boards and survives failures", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { ok: false, status: 404 }; };
  assert.equal(await fetchFullJobText({ id: "http://evil.example/x" }, BOARDS, { fetchImpl }), null);
  assert.equal(calls, 0);
  assert.equal(await fetchFullJobText({ id: "ats-greenhouse-tide-99" }, BOARDS, { fetchImpl }), null);
  assert.equal(calls, 1);
});

test("broken encoding and IBM's intro do not reach job cards", () => {
  assert.equal(fixMojibake("Youâ€™ll work – itâ€™s â€œgoodâ€\u009d"), `You'll work – it's "good"`);
  const ibm = "Introduction A career in IBM Consulting is built on long-term client relationships. Youâ€™ll work with clients worldwide on many projects across the business. Your role and responsibilities Build and test SAP manufacturing solutions with client teams every day across plants.";
  assert.match(jobSnippet(ibm, 170, "IBM"), /^Build and test SAP/);
});

test("years requirement is read from common posting phrasings", () => {
  const years = (t) => parseYearsRequirement(`${"Long role description text. ".repeat(10)} ${t}`);
  assert.equal(years("Needs 7+ years’ experience in Java.").lo, 7);
  assert.deepEqual(years("Experience Range: 8-12 years"), { lo: 8, hi: 12 });
  assert.deepEqual(years("7 to 11 years of expertise in testing"), { lo: 7, hi: 11 });
  assert.deepEqual(years("9 12 years of experience with SAP"), { lo: 9, hi: 12 });
  assert.equal(years("A minimum of 3 years in support").lo, 3);
});

test("work type comes only from statements about the job", () => {
  assert.equal(workplaceFromText("Work mode: Hybrid. Based in Hyderabad."), "hybrid");
  assert.equal(workplaceFromText("You will be 3 days a week in the office."), "hybrid");
  assert.equal(workplaceFromText("This is a work from office role."), "onsite");
  assert.equal(workplaceFromText("Build hybrid cloud platforms for clients."), null);
  assert.equal(workplaceFromText("Some remote teams use our product."), null);
});

test("job function beats a domain word in the title", () => {
  assert.equal(inferRoleType("Senior Software Engineer (Full Stack) - Clinical Hub"), "Engineering");
  assert.equal(inferRoleType("Information Security Analyst"), "Engineering");
  assert.equal(inferRoleType("Product Manager - HR Technology"), "Product");
  assert.equal(inferRoleType("Strategic Account Manager"), "Sales");
  assert.equal(inferRoleType("English to Serbian Review Lead for UI"), null);
  assert.equal(inferRoleType("Data Engineer"), "Data");
});

test("IBM postings store the role text, not the company introduction", () => {
  const html = "<p><b>Introduction</b></p><p>At IBM we build things together.</p><p>Your role and responsibilities</p><p>Design and ship APIs for clients in Hyderabad every day.</p>";
  assert.match(jobDescriptionText(html), /^Your role and responsibilities/);
});
