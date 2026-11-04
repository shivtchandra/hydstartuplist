import test from "node:test";
import assert from "node:assert/strict";
import { parseFallbackContext } from "../lib/not-found-recovery.js";

test("parses expired job URLs with base64 ATS payload", () => {
  const result = parseFallbackContext(
    "/jobs/coinbase-customer-support-specialist-ii-hyderabad~YXRzLWdyZWVuaG91c2UtY29pbmJhc2UtODMzNDc2NA"
  );
  assert.ok(result);
  assert.equal(result.type, "job");
  assert.equal(result.company, "Coinbase");
  assert.equal(result.role, "Customer Support Specialist II");
});

test("parses expired job URLs with compact suffix or plain slug", () => {
  const result = parseFallbackContext(
    "/jobs/swiggy-senior-software-engineer-hyderabad~h-xyz123"
  );
  assert.ok(result);
  assert.equal(result.type, "job");
  assert.equal(result.company, "Swiggy");
  assert.equal(result.role, "Senior Software Engineer");
});

test("parses remote and tech titles correctly", () => {
  const result = parseFallbackContext(
    "/jobs/supabase-product-manager-spark-remote~YXRzLWFzaGJ5LXN1cGFiYXNlLTg1ZjRkMTQ4LTQ2MDItNDEzOS04MDJhLTk2MjcwNTEzMzg5Mg"
  );
  assert.ok(result);
  assert.equal(result.type, "job");
  assert.equal(result.company, "Supabase");
  assert.equal(result.role, "Product Manager Spark");
});

test("parses company jobs sub-routes", () => {
  const result = parseFallbackContext("/jobs/company/microsoft");
  assert.ok(result);
  assert.equal(result.type, "company_jobs");
  assert.equal(result.company, "Microsoft");
});

test("parses startup profile sub-routes", () => {
  const result = parseFallbackContext("/startups/darwinbox");
  assert.ok(result);
  assert.equal(result.type, "startup");
  assert.equal(result.company, "Darwinbox");
});

test("returns null for generic hub routes or unrelated paths", () => {
  assert.equal(parseFallbackContext("/jobs/fresher"), null);
  assert.equal(parseFallbackContext("/jobs/remote"), null);
  assert.equal(parseFallbackContext("/about-us"), null);
  assert.equal(parseFallbackContext("/"), null);
  assert.equal(parseFallbackContext(null), null);
});
