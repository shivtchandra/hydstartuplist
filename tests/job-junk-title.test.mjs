import test from "node:test";
import assert from "node:assert/strict";
import { isInvalidJobListing } from "../lib/job-content.js";
import { inferRoleType } from "../lib/job-facets.js";

test("isInvalidJobListing drops aggregator junk titles", () => {
  for (const title of ["% Fresher Software Developer 99.89.61.27.35", "Call 9876543210 Data Entry", "\u{1F680} Hiring Freshers", "#Hiring Telecaller"]) {
    assert.equal(isInvalidJobListing({ title, url: "https://example.com/job/1" }), true, title);
  }
  for (const title of [".NET Developer", "(Senior) Backend Engineer", "[Remote] SRE", "3D Artist", "C++ Engineer", "SAP S/4HANA 2.0 Consultant", "Analyst - R0123456"]) {
    assert.equal(isInvalidJobListing({ title, url: "https://example.com/job/1" }), false, title);
  }
});

test("keyword-stuffed SEO titles are dropped", () => {
  assert.equal(isInvalidJobListing({ title: "Itfresherjobs-Softwarejobs", url: "https://example.com/1" }), true);
  assert.equal(isInvalidJobListing({ title: "Jobs Data Engineer", url: "https://example.com/1" }), false);
});

test("isInvalidJobListing drops website navigation, marketing slogans, and non-job copy", () => {
  const junkTitles = [
    "Products",
    "Our Products",
    "PRODUCTS",
    "Leadership",
    "Sales Room",
    "Coaching precision",
    "Hr Software",
    "Saas Hr Software",
    "Hr Toolkit",
    "48hr",
    "<48hr",
    "Careers for builders of the next sales operating model.",
    "Engine for the agentic era of sales.",
    "Revenue Activation vs. Sales Enablement",
    "What is the Agentic era of sales?",
    "Cost of non-agentic sales rep",
    "A guided path out of legacy sales tech.",
    "This is not a product improvement. It is an architectural inversion.",
  ];
  for (const title of junkTitles) {
    assert.equal(isInvalidJobListing({ title, url: "https://example.com/careers" }), true, title);
  }
});

test("inferRoleType accurately classifies modern engineering stacks, data/AI, product, and operations", () => {
  assert.equal(inferRoleType("Technical Lead"), "Engineering");
  assert.equal(inferRoleType("Package Consultant-SAP Cloud Integration"), "Engineering");
  assert.equal(inferRoleType("Package Consultant-Salesforce"), "Engineering");
  assert.equal(inferRoleType("Linux Driver Development--RTOS/Zephyr"), "Engineering");
  assert.equal(inferRoleType("Software Development Engineer I"), "Engineering");
  assert.equal(inferRoleType("Security Consultant-Identity & Access Management Services"), "Engineering");

  assert.equal(inferRoleType("Biostatistical Programming Senior Associate"), "Data");
  assert.equal(inferRoleType("Snowflake Data Engineer"), "Data");
  assert.equal(inferRoleType("GenAI Research Scientist"), "Data");

  assert.equal(inferRoleType("Technical Program Manager"), "Product");
  assert.equal(inferRoleType("Product Launch & Lifecycle Manager"), "Product");
  assert.equal(inferRoleType("Scrum Master"), "Product");

  assert.equal(inferRoleType("Trust & Safety New Associate"), "Operations");
  assert.equal(inferRoleType("Customer Service New Associate"), "Operations");
  assert.equal(inferRoleType("Transportation Specialist I"), "Operations");
  assert.equal(inferRoleType("Senior BMS Specialist, Global BMS Technical Services"), "Operations");
  assert.equal(inferRoleType("Business Advisory New Associate"), "Operations");

  assert.equal(inferRoleType("Tax Associate Manager"), "Finance");
  assert.equal(inferRoleType("Associate Contracts & Pricing"), "Finance");
  assert.equal(inferRoleType("ETF Servicing - Senior Associate"), "Finance");
});
