import test from "node:test";
import assert from "node:assert/strict";
import { isInvalidJobListing, jobSnippet, plausibleSalary, stripHtml } from "../lib/job-content.js";
import { inferExperienceLevel, inferRoleType, isOpenToFreshers } from "../lib/job-facets.js";
import { applyJobDetail, fetchJobDetails, jobDetailUrl } from "../lib/ats/job-details.js";
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
