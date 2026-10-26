import test from "node:test";
import assert from "node:assert/strict";

import { parseAvatureSearchHtml } from "../lib/ats/index.js";

const html = `
  <article class="article article--result article--non-toggle">
    <a class="link link_result" href="https://jobs.ea.com/en_US/careers/JobDetail/Data-AI-Intern/215934">
      Data &amp; AI Engineering Intern
    </a>
    <span class="list-item-location">Hyderabad, India</span>
  </article>
  <article class="article article--result article--non-toggle">
    <a class="link link_result" href="https://jobs.ea.com/en_US/careers/JobDetail/Senior-Engineer/216001">
      Senior Engineer
    </a>
    <span class="list-item-location">Vancouver, Canada</span>
  </article>
`;

test("Avature parser keeps exact official Hyderabad jobs and filters other locations", () => {
  const jobs = parseAvatureSearchHtml(html, {
    jobUrlBase: "https://jobs.ea.com",
    avatureSection: "careers",
    locationPattern: "hyderabad",
  });

  assert.deepEqual(jobs, [
    {
      id: "215934",
      title: "Data & AI Engineering Intern",
      location: "Hyderabad, India",
      url: "https://jobs.ea.com/en_US/careers/JobDetail/Data-AI-Intern/215934",
    },
  ]);
});

test("Avature parser preserves the legacy jobs section", () => {
  const jobs = parseAvatureSearchHtml(
    '<a href="/en_US/jobs/JobDetail/Beauty-Tech-Intern/42"></a>',
    { jobUrlBase: "https://careers.example.com" },
  );

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Beauty Tech Intern");
  assert.equal(jobs[0].url, "https://careers.example.com/en_US/jobs/JobDetail/Beauty-Tech-Intern/42");
});
