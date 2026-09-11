import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAtsJob } from "../lib/ats/normalize.js";

test("phenom prefers public careers URL over iCIMS login stub", () => {
  const n = normalizeAtsJob(
    "phenom",
    {
      data: {
        title: "Sr Software Engineer - Developer & Build Experience (Gradle, Compiler with C/C++)",
        req_id: "92002",
        slug: "92002",
        city: "Hyderabad",
        apply_url: "https://global-external-amd.icims.com/jobs/92002/login",
        descriptionTeaser: "Build tools",
      },
    },
    {
      boardUrl:
        "https://careers.amd.com/careers-home/jobs?location=Hyderabad&page=1",
      slug: "amd",
      companyName: "AMD",
      jobUrlBase: "https://careers.amd.com/careers-home/jobs",
    }
  );
  assert.ok(n);
  assert.equal(n.url, "https://careers.amd.com/careers-home/jobs/92002");
});
