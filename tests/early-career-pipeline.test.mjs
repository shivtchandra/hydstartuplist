import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { parseGlobalLogicCareersHtml } from "../lib/ats/index.js";
import { boardMeta } from "../lib/ats/providers.js";

test("GlobalLogic parser keeps Hyderabad roles and stable requisition ids", () => {
  const html = `
    <a href="https://www.globallogic.com/in/careers/associate-analyst-freshers-irc306734/" class="job_box">
      <div><span class="job_location">Hyderabad</span><span class="job_location">India</span></div>
      <h4>Associate Analyst &#8211; Freshers IRC306734</h4>
    </a>
    <a class="job_box" href="https://www.globallogic.com/in/careers/junior-educator-irc303409/">
      <div><span class="job_location">Hyderabad</span></div>
      <h4>Junior Educator IRC303409</h4>
    </a>
    <a href="https://www.globallogic.com/in/careers/senior-engineer-irc300000/" class="job_box">
      <div><span class="job_location">Noida</span></div>
      <h4>Senior Engineer IRC300000</h4>
    </a>`;

  const jobs = parseGlobalLogicCareersHtml(html, { locationPattern: "hyderabad" });
  assert.deepEqual(jobs.map((job) => job.id), ["IRC306734", "IRC303409"]);
  assert.equal(jobs[0].title, "Associate Analyst – Freshers IRC306734");
  assert.match(jobs[0].location, /Hyderabad/);
});

test("every fast-lane board id exists in the ATS registry", () => {
  const priorityIds = JSON.parse(fs.readFileSync(new URL("../data/early-career-boards.json", import.meta.url)));
  const boards = JSON.parse(fs.readFileSync(new URL("../data/ats-boards.json", import.meta.url)));
  const activeBoardIds = new Set(boards.filter((board) => board.active !== false).map((board) => board.id));
  assert.ok(priorityIds.length >= 75);
  assert.equal(new Set(priorityIds).size, priorityIds.length, "fast-lane board ids must be unique");
  for (const id of priorityIds) assert.ok(activeBoardIds.has(id), id);
});

test("new first-party feeds use their official endpoints", () => {
  assert.match(boardMeta("zoho", "arnimedica").apiUrl, /arnimedica\.zohorecruit\.in/);
  assert.match(boardMeta("workday", "syniverse").apiUrl, /syniverse\.wd1\.myworkdayjobs\.com/);
  assert.equal(boardMeta("htmlcareers", "globallogic").scrapeMode, "globallogic");
});
