import test from "node:test";
import assert from "node:assert/strict";
import { inferExperienceLevel, titleSeniority } from "../lib/job-facets.js";
import { cleanScrapedTitle } from "../lib/job-content.js";

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

test("genuine entry-level postings still resolve to the fresher bands", () => {
  const intern = ["React Native Intern", "NATA Trainee", "Industrial Trainee - Tax", "Graduate Engineer Trainee"];
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
