import test from "node:test";
import assert from "node:assert/strict";

import { jobDescriptionText, jobSnippet } from "../lib/job-content.js";
import { normalizeAtsJob } from "../lib/ats/normalize.js";

const companyPitch = (company, size = 1400) =>
  `<p>About ${company}</p><p>${company} is a global technology platform serving customers worldwide. ${"Our platform helps companies grow. ".repeat(size / 34)}</p>`;

test("extracts role copy after long company boilerplate", () => {
  const raw = `${companyPitch("Zeta", 2600)}<h2>About the Role</h2><p>The Senior Facility Executive will manage workplace operations and vendors.</p>`;
  const result = jobDescriptionText(raw, "Zeta");

  assert.match(result, /^About the Role/i);
  assert.match(result, /manage workplace operations/);
  assert.doesNotMatch(result, /global technology platform/);
});

test("skips a repeated company pitch after a misleading role-description heading", () => {
  const raw = [
    "&lt;p&gt;We are a global team building the New Relic observability platform.&lt;/p&gt;",
    "&lt;h2&gt;Role description&lt;/h2&gt;",
    "&lt;p&gt;We are a global team building products for customers worldwide.&lt;/p&gt;",
    "&lt;h2&gt;In this role&lt;/h2&gt;",
    "&lt;p&gt;You will architect and deploy observability solutions for enterprise customers.&lt;/p&gt;",
  ].join("");
  const result = jobDescriptionText(raw, "New Relic");

  assert.match(result, /^In this role/i);
  assert.match(result, /architect and deploy/);
  assert.doesNotMatch(result, /global team/);
});

test("recognizes role prose without a heading after a company introduction", () => {
  const raw = "Supabase is the Postgres development platform, built by developers for developers. We provide a complete backend solution. We are seeking Support Engineers to provide world-class developer support and troubleshoot customer issues.";
  const result = jobDescriptionText(raw, "Supabase");

  assert.match(result, /^We are seeking Support Engineers/);
  assert.doesNotMatch(result, /Postgres development platform/);
});

test("returns no description when a payload contains only company marketing", () => {
  const raw = "Zscaler (NASDAQ: ZS) is a global cloud security platform. Our mission is to make the internet safer for customers worldwide.";
  assert.equal(jobDescriptionText(raw, "Zscaler"), null);
  assert.equal(jobSnippet(raw, 170, "Zscaler"), null);
});

test("leaves role-first descriptions intact", () => {
  const raw = "We are seeking a backend engineer to design APIs, improve reliability, and mentor teammates.";
  assert.equal(jobDescriptionText(raw, "Acme"), raw);
});

test("ATS providers remove company boilerplate before applying the storage cap", () => {
  const role = "What you'll do Build distributed systems, own production reliability, and improve developer tooling.";
  const raw = `${companyPitch("ExampleCo", 2200)}<h2>${role}</h2>`;
  const cases = [
    ["greenhouse", { id: "g1", title: "Engineer", content: raw, absolute_url: "https://example.com/g1" }],
    ["lever", { id: "l1", text: "Engineer", description: raw, hostedUrl: "https://example.com/l1" }],
    ["ashby", { id: "a1", title: "Engineer", descriptionHtml: raw, jobUrl: "https://example.com/a1", location: "Remote" }],
    ["phenom", { data: { req_id: "p1", title: "Engineer", description: raw, city: "Hyderabad", url: "https://example.com/p1" } }],
    ["workday", { externalPath: "/job/Engineer_W1", title: "Engineer", description: raw, locationsText: "Hyderabad" }],
  ];

  for (const [provider, job] of cases) {
    const normalized = normalizeAtsJob(provider, job, {
      boardUrl: "https://example.com/jobs",
      slug: "example",
      companyName: "ExampleCo",
      geoFilter: false,
      jobUrlBase: "https://example.com/jobs",
    });
    assert.ok(normalized, `${provider} should normalize`);
    assert.match(normalized.descriptionText, /^What you'll do Build distributed systems/);
    assert.doesNotMatch(normalized.descriptionText, /global technology platform/);
  }
});
