import test from "node:test";
import assert from "node:assert/strict";
import { jobUrlId } from "../lib/jobs-seo.js";
import { missingJobPages } from "../lib/job-pages-check.js";

const raw = { id: "ats-phenom-amd-92686", company: "AMD", title: "Lead DFT Engineer", location: "Hyderabad, India" };

test("job URL is the same with or without the area the feed adds", () => {
  assert.equal(jobUrlId({ ...raw, area: "Hyderabad" }), jobUrlId(raw));
  assert.match(jobUrlId(raw), /^amd-lead-dft-engineer-hyderabad-india~/);
});

test("job URL falls back to area when a row has no location", () => {
  const { location, ...noLocation } = raw;
  assert.match(jobUrlId({ ...noLocation, area: "Gachibowli" }), /^amd-lead-dft-engineer-gachibowli~/);
});

test("missingJobPages lists only listed jobs without a page", () => {
  const other = { ...raw, id: "ats-phenom-amd-1" };
  const exported = new Set([jobUrlId(raw)]);
  assert.deepEqual(missingJobPages([raw, other], (id) => exported.has(id)), [jobUrlId(other)]);
});
