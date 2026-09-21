import test from "node:test";
import assert from "node:assert/strict";
import { formatExperienceRange } from "../lib/healthcare.js";
import { inferRoleType } from "../lib/job-facets.js";
import { isInvalidJobListing, isSpamOrConsultancyJob } from "../lib/job-content.js";

test("healthcare scraper normalizes titles and identifies healthcare roles", () => {
  assert.equal(inferRoleType("Clinical Dietitian"), "Healthcare / Nutrition");
  assert.equal(inferRoleType("Executive – Nutritionist"), "Healthcare / Nutrition");
  assert.equal(inferRoleType("Health Coach"), "Healthcare / Nutrition");
  assert.equal(inferRoleType("Diet Counselor"), "Healthcare / Nutrition");
});

test("experience range extraction handles variations", () => {
  assert.equal(formatExperienceRange(1, 10), "1–10 yrs");
  assert.equal(formatExperienceRange(0, 0, "Freshers"), "Fresher (0–1y)");
  assert.equal(formatExperienceRange(null, null, "3 to 6 Years"), "3–6 yrs");
  assert.equal(formatExperienceRange(null, null, "5+ years"), "5+ yrs");
});

test("isInvalidJobListing catches hospital medical procedure and specialty pages", () => {
  assert.equal(isInvalidJobListing({
    title: "Dietetics & Nutrition",
    url: "https://www.kimshospitals.com/secunderabad/speciality/dietetics-and-nutrition/",
    company: "KIMS Hospitals"
  }), true);

  assert.equal(isInvalidJobListing({
    title: "Childrens Nutrition Hospital",
    url: "https://www.rainbowhospitals.in/hyderabad/speciality/childrens-nutrition-hospital",
    company: "Rainbow Children's Hospital"
  }), true);

  assert.equal(isInvalidJobListing({
    title: "Protein Powders & Supplements",
    url: "https://beatoapp.com/collections/protein",
    company: "BeatO"
  }), true);

  assert.equal(isInvalidJobListing({
    title: "Dietician",
    url: "https://www.docthub.com/job/dietician-hyderabad-12345",
    company: "Maharaja Agrasen Hospital"
  }), false);

  assert.equal(isSpamOrConsultancyJob({
    title: "Dietetics & Nutrition",
    url: "https://www.kimshospitals.com/secunderabad/speciality/dietetics-and-nutrition/",
    company: "KIMS Hospitals"
  }), true);
});

