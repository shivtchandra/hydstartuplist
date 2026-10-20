import assert from "node:assert/strict";
import { isGccProfileEligible, readGccs, verifiedGccProfiles } from "../lib/gccs.js";
import {
  ROLE_AREA_MIN_EMPLOYERS,
  ROLE_AREA_MIN_JOBS,
  roleAreaQualifies,
} from "../lib/role-area-jobs.js";

assert.equal(ROLE_AREA_MIN_JOBS, 5);
assert.equal(ROLE_AREA_MIN_EMPLOYERS, 3);
assert.equal(roleAreaQualifies(5, 3), true, "the exact quality boundary must index");
assert.equal(roleAreaQualifies(4, 3), false, "four jobs must remain noindex");
assert.equal(roleAreaQualifies(5, 2), false, "two employers must remain noindex");
assert.equal(roleAreaQualifies(0, 0), false, "empty combinations must remain noindex");

const gccs = readGccs();
const profiles = verifiedGccProfiles();
assert.ok(gccs.length > 0, "the GCC directory must not be empty");
assert.ok(profiles.length > 0, "at least one evidence-complete GCC profile must ship");

for (const gcc of profiles) {
  assert.equal(isGccProfileEligible(gcc), true);
  assert.match(gcc.officialSourceUrl, /^https:\/\//);
  assert.match(gcc.careers, /^https:\/\//);
  assert.match(gcc.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(gcc.area.toLowerCase().includes("hyderabad"));
  assert.ok(gcc.functions.length > 0);
}

console.log(JSON.stringify({
  roleAreaGate: { jobs: ROLE_AREA_MIN_JOBS, employers: ROLE_AREA_MIN_EMPLOYERS },
  gccDirectoryCount: gccs.length,
  verifiedGccProfileCount: profiles.length,
}));
