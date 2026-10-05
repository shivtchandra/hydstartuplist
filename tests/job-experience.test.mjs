import test from "node:test";
import assert from "node:assert/strict";
import { inferExperienceLevel, jobExperienceDisplay, inferRoleType } from "../lib/job-facets.js";
import { formatExperienceRange } from "../lib/healthcare.js";

test("formatExperienceRange handles various range configurations", () => {
  assert.equal(formatExperienceRange(0, 0), "Fresher (0–1y)");
  assert.equal(formatExperienceRange(0, 2), "0–2 yrs");
  assert.equal(formatExperienceRange(1, 10), "1–10 yrs");
  assert.equal(formatExperienceRange(5, 0), "5+ yrs");
  assert.equal(formatExperienceRange(null, null, "Freshers"), "Fresher (0–1y)");
  assert.equal(formatExperienceRange(null, null, "2-5 years"), "2–5 yrs");
  assert.equal(formatExperienceRange(null, null, "3+ years exp"), "3+ yrs");
});

test("inferExperienceLevel with structured start/end years", () => {
  assert.equal(inferExperienceLevel({ title: "Clinical Dietitian", startYear: 0, endYear: 0 }), "intern");
  assert.equal(inferExperienceLevel({ title: "Staff Nurse", startYear: 0, endYear: 2 }), "junior");
  assert.equal(inferExperienceLevel({ title: "Dietician", startYear: 1, endYear: 4 }), "mid");
  assert.equal(inferExperienceLevel({ title: "Nutritionist Lead", startYear: 5, endYear: 8 }), "senior");
  assert.equal(inferExperienceLevel({ title: "Medical Director", startYear: 10, endYear: 15 }), "lead");
});

test("jobExperienceDisplay returns clear, user-facing experience labels", () => {
  const docthubJob = {
    title: "Nurse",
    startYear: 0,
    endYear: 0,
    experience: "Freshers",
  };
  assert.equal(jobExperienceDisplay(docthubJob), "Fresher (0–1y)");

  const midJob = {
    title: "Dietitian",
    startYear: 2,
    endYear: 5,
  };
  assert.equal(jobExperienceDisplay(midJob), "2–5 yrs");

  const explicitExpJob = {
    title: "Nutritionist",
    experience: "1 to 10 Years",
  };
  assert.equal(jobExperienceDisplay(explicitExpJob), "1–10 yrs");

  const descJob = {
    title: "Health Coach",
    description: "Requires 3-5 years of experience in clinical nutrition.",
  };
  assert.equal(jobExperienceDisplay(descJob), "3–5 yrs");
});

test("inferRoleType accurately categorizes Healthcare & Nutrition titles", () => {
  const roles = [
    "Clinical Dietitian",
    "Executive Nutritionist",
    "Metabolic Health Coach",
    "Diet Counselor",
    "Sports Nutritionist",
    "Lifestyle Consultant",
  ];
  for (const r of roles) {
    assert.equal(inferRoleType(r), "Healthcare / Nutrition", `Failed for: ${r}`);
  }
});

test("inferExperienceLevel catches entry titles without a junior/fresher word", () => {
  assert.equal(inferExperienceLevel("University Graduate - Software Engineer"), "intern");
  assert.equal(inferExperienceLevel("Early Career Data Analyst"), "intern");
  assert.equal(inferExperienceLevel("Graduate Analyst Programme 2026"), "intern");
  assert.equal(inferExperienceLevel("Data Engineer 1"), "junior");
  assert.equal(inferExperienceLevel("L1 Support Engineer"), "junior");
  assert.equal(inferExperienceLevel("Customer Support Executive"), "junior");
  assert.equal(inferExperienceLevel("Process Associate - Voice"), "junior");
  assert.equal(inferExperienceLevel("Telecaller"), "junior");
  // Seniority words and explicit years still win.
  assert.equal(inferExperienceLevel("Senior Customer Support Executive"), "senior");
  assert.equal(inferExperienceLevel("Customer Support Executive", "Requires 4-6 years of experience"), "mid");
  assert.notEqual(inferExperienceLevel("Enterprise Account Executive"), "junior");
});
