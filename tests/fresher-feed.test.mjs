import test from "node:test";
import assert from "node:assert/strict";
import { inferExperienceLevel, titleSeniority } from "../lib/job-facets.js";
import { cleanScrapedTitle } from "../lib/job-content.js";
import { collapseDuplicatePostings } from "../lib/job-lifecycle.js";
import { capEmployerShare } from "../lib/opportunities.js";

test("a senior band in the title is never demoted to an entry-level band", () => {
  // These all used to land on /jobs/fresher because "Engineer I" / "Analyst I" /
  // bare "Associate" were checked before the senior and staff patterns.
  const cases = [
    ["Staff Software Engineer I - NodeJS, Microservices, Cloud", "lead"],
    ["Sr. Analyst I - Cyber Defense", "senior"],
    ["Senior Analyst I, Infra CX", "senior"],
    ["Software Engineer III, Security/Privacy, gTech Risk", "mid"],
    ["IT Operations Analyst II", "mid"],
    ["ML Data Associate-II, Artificial General Intelligence", "mid"],
    ["Machine Learning Associate Advisor", "mid"],
    ["Software Engineering Associate Advisor - HIH - Evernorth", "mid"],
    ["Software Engineering SMTS, Identity and Access Management", "senior"],
    ["LMTS - Cloud Infrastructure", "lead"],
    ["PMTS Distributed Systems", "lead"],
    ["Operation Lead", "lead"],
  ];
  for (const [title, expected] of cases) {
    assert.equal(inferExperienceLevel(title, ""), expected, title);
  }
});

test("a description mentioning few years cannot pull a senior title into the fresher feed", () => {
  const level = inferExperienceLevel(
    "Staff Software Engineer I",
    "You will mentor engineers with 1-2 years of experience and run our intern program."
  );
  assert.equal(level, "lead");
});

test("a years mention unrelated to experience requirements does not demote a fresher posting", () => {
  assert.equal(
    inferExperienceLevel(
      "Graduate Trainee - Operations",
      "We were founded 8 years ago and offer 3 years of paid parental leave. Freshers welcome, 0-1 years experience."
    ),
    "intern"
  );
});

test("an explicit years-of-experience requirement still demotes a generic title", () => {
  assert.equal(inferExperienceLevel("Software Engineer", "Looking for candidates with 5+ years of experience."), "senior");
  assert.equal(inferExperienceLevel("Software Engineer", "Minimum 3-5 years of relevant experience required."), "mid");
});

test("genuine entry-level postings still resolve to the fresher bands", () => {
  const intern = [
    "React Native Intern",
    "NATA Trainee",
    "Industrial Trainee - Tax",
    "Graduate Engineer Trainee",
    "GET - Embedded Systems",
    "Management Trainee - Sales",
    "Apprentice Software Engineer",
    "AI/ML Research Intern",
    "Summer Intern 2026",
    "Software Engineer - 2026 Batch",
  ];
  for (const title of intern) assert.equal(inferExperienceLevel(title, ""), "intern", title);

  const junior = ["Associate Software Engineer", "SDE I", "Junior Site Speed Specialist", "IT Operations Analyst I"];
  for (const title of junior) assert.equal(inferExperienceLevel(title, ""), "junior", title);
});

test("an architect title stays out of the entry band even with fresher wording in the body", () => {
  assert.equal(
    inferExperienceLevel("Presales Solutions Architect", "Freshers and entry-level candidates may apply."),
    "senior"
  );
  // "Associate Architect" is still the lower band of the two.
  assert.equal(inferExperienceLevel("Associate Architect", ""), "mid");
});

test("titleSeniority reads the title only and stays silent on plain titles", () => {
  assert.equal(titleSeniority("Software Engineer"), null);
  assert.equal(titleSeniority("Data Analyst"), null);
  assert.equal(titleSeniority("Senior Software Engineer"), "senior");
  assert.equal(titleSeniority("Engineering Manager"), "manager");
  // "Product Manager" is a role name, not a people-management band.
  assert.equal(titleSeniority("Product Manager"), null);
});

test("ATS job ids scraped from URL slugs are stripped out of titles", () => {
  assert.equal(
    cleanScrapedTitle(
      "PqqFrapezemf/Business Development Associate Work From Home Presales Tamil Telugu Hindi",
      "https://nxtwave.freshteam.com/jobs/PqqFrapezemf/business-development-associate-work-from-home-presales-tamil-telugu-hindi"
    ),
    "Business Development Associate Work From Home Presales Tamil Telugu Hindi"
  );
  // Underscores in the id become spaces during title-casing, so compare loosely.
  assert.equal(
    cleanScrapedTitle(
      "Bb71O VqO 6G/Business Development Associate Wfo",
      "https://nxtwave.freshteam.com/jobs/bb71O_VqO_6G/business-development-associate_wfo"
    ),
    "Business Development Associate Wfo"
  );
});

test("titles that legitimately contain a slash are left alone", () => {
  const cases = [
    ["SAP PP/QM_ Senior Functional Consultant_11246", "https://www.jobs.global.fujitsu.com/job/SAP-PPQM_-Senior-Functional-Consultant_11246/11246-en_US"],
    ["SailPoint IIQ /SailPoint ISC Developer", "https://www.adzuna.in/land/ad/5884159313"],
    ["Senior AI/ML Compiler Developer", "https://careers.amd.com/careers-home/jobs/91921"],
    ["Tender/GeM management (Female)", "https://www.gbb.co.in/jobs/tender-gem-management-female/"],
    ["ServiceNow ITAM/HAM/SAM", "https://www.adzuna.in/land/ad/5882857510"],
  ];
  for (const [title, url] of cases) assert.equal(cleanScrapedTitle(title, url), title, title);
});

test("a title with no URL to check against is returned unchanged", () => {
  assert.equal(cleanScrapedTitle("Postgres / SQL Data Engineer"), "Postgres / SQL Data Engineer");
});

test("repeat requisitions of one role collapse into a single row with an openings count", () => {
  // Wells Fargo posts this ten times; the punctuation and "and" variants must group too.
  const rows = [
    { id: "a", company: "Wells Fargo", title: "Associate Fraud & Claims Operations Representative", postedAt: "2026-09-10" },
    { id: "b", company: "Wells Fargo", title: "Associate Fraud and Claims Operations Representative", postedAt: "2026-09-14" },
    { id: "c", company: "Wells Fargo", title: "associate fraud & claims operations representative", postedAt: "2026-09-02" },
    { id: "d", company: "NxtWave", title: "Influencer Marketing Associate", postedAt: "2026-09-11" },
  ];
  const collapsed = collapseDuplicatePostings(rows);
  assert.equal(collapsed.length, 2);
  const wf = collapsed.find((j) => j.company === "Wells Fargo");
  assert.equal(wf.openings, 3);
  // The freshest posting is the one the user clicks through to.
  assert.equal(wf.id, "b");
  assert.equal(collapsed.find((j) => j.company === "NxtWave").openings, 1);
});

test("different roles at the same employer stay separate", () => {
  const collapsed = collapseDuplicatePostings([
    { id: "a", company: "NxtWave", title: "Associate Project Manager" },
    { id: "b", company: "NxtWave", title: "Associate Instructor Aptitude" },
  ]);
  assert.equal(collapsed.length, 2);
});

test("one employer cannot occupy the whole page, and the surplus stays reachable", () => {
  const jobs = [
    ...Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, company: "NxtWave", title: `BD Associate ${i}` })),
    { id: "a", company: "Amgen", title: "Associate Data Scientist" },
    { id: "b", company: "vidaXL", title: "Junior Site Speed Specialist" },
  ];
  const rows = capEmployerShare(jobs, 3);
  assert.equal(rows.filter((j) => j.company === "NxtWave").length, 3);
  // Smaller employers are untouched.
  assert.equal(rows.filter((j) => j.company === "Amgen").length, 1);
  assert.equal(rows.length, 5);
  // The 3 hidden roles are advertised on the last NxtWave row, not silently dropped.
  const nxt = rows.filter((j) => j.company === "NxtWave");
  assert.deepEqual(nxt.at(-1).moreAtCompany, { company: "NxtWave", count: 3, key: "nxtwave" });
  assert.equal(nxt[0].moreAtCompany, undefined);
});

test("an employer at or under the cap gets no surplus link", () => {
  const rows = capEmployerShare(
    [{ id: "a", company: "Amgen", title: "X" }, { id: "b", company: "Amgen", title: "Y" }],
    3
  );
  assert.equal(rows.length, 2);
  assert.ok(rows.every((j) => !j.moreAtCompany));
});

test("expanding an employer lifts the cap for that employer only", () => {
  const jobs = [
    ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, company: "NxtWave", title: `BD ${i}` })),
    ...Array.from({ length: 5 }, (_, i) => ({ id: `w${i}`, company: "Wells Fargo", title: `Ops ${i}` })),
  ];
  const rows = capEmployerShare(jobs, 3, (key) => key === "nxtwave");
  assert.equal(rows.filter((j) => j.company === "NxtWave").length, 5);
  assert.equal(rows.filter((j) => j.company === "Wells Fargo").length, 3);
  // An expanded employer shows no leftover "more roles" affordance.
  assert.ok(rows.filter((j) => j.company === "NxtWave").every((j) => !j.moreAtCompany));
  assert.equal(rows.filter((j) => j.moreAtCompany).length, 1);
});
