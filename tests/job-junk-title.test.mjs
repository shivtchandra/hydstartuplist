import test from "node:test";
import assert from "node:assert/strict";
import { isInvalidJobListing } from "../lib/job-content.js";

test("isInvalidJobListing drops aggregator junk titles", () => {
  for (const title of ["% Fresher Software Developer 99.89.61.27.35", "Call 9876543210 Data Entry", "🚀 Hiring Freshers", "#Hiring Telecaller"]) {
    assert.equal(isInvalidJobListing({ title, url: "https://example.com/job/1" }), true, title);
  }
  for (const title of [".NET Developer", "(Senior) Backend Engineer", "[Remote] SRE", "3D Artist", "C++ Engineer", "SAP S/4HANA 2.0 Consultant", "Analyst - R0123456"]) {
    assert.equal(isInvalidJobListing({ title, url: "https://example.com/job/1" }), false, title);
  }
});
