import test from "node:test";
import assert from "node:assert/strict";
import { isCuratedRemoteEligibleLocation } from "../lib/ats/geo.js";

test("remote-eligible locations: India / APAC / worldwide only", () => {
  for (const loc of ["Remote - India", "India - Remote", "India, Remote", "Remote, India", "Remote (India)", "Remote (APAC)", "Home based - Worldwide", "Remote - Anywhere", "Work from anywhere", "Remote - US; Remote - India"]) {
    assert.equal(isCuratedRemoteEligibleLocation(loc), true, loc);
  }
  for (const loc of ["U.S. Anywhere", "Ukraine Anywhere", "US Remote", "Canada Remote", "EMEA Remote", "Remote - US only", "Bengaluru, India", "London"]) {
    assert.equal(isCuratedRemoteEligibleLocation(loc), false, loc);
  }
});

test("Lever and Ashby structured remote flags read as remote locations", async () => {
  const { locationOf } = await import("../lib/ats/providers.js");
  assert.equal(locationOf("lever", { categories: { location: "India" }, workplaceType: "remote" }), "India (Remote)");
  assert.equal(locationOf("lever", { categories: { location: "Hyderabad" }, workplaceType: "hybrid" }), "Hyderabad");
  assert.equal(locationOf("ashby", { location: "India", isRemote: true }), "India (Remote)");
  assert.equal(isCuratedRemoteEligibleLocation(locationOf("lever", { categories: { location: "India" }, workplaceType: "remote" })), true);
  assert.equal(isCuratedRemoteEligibleLocation(locationOf("lever", { categories: { location: "United States" }, workplaceType: "remote" })), false);
});
