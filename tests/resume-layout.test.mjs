import test from "node:test";
import assert from "node:assert/strict";
import { findResumeBlanks, parseResumeLayout, resumeHtml } from "../lib/resume/layout.js";
import { linkPdfItems } from "../lib/resume/parse-client.js";

const SAMPLE = `# SHIVA CHANDRA T
Hyderabad, India | a@b.co | [LinkedIn](https://linkedin.com/in/x)
**Software Developer | Python**

## SUMMARY
Builds things.

## EXPERIENCE
### Multicloud Engineer Associate — Cognizant | Feb 2026 – Sep 2026
- Built dashboards.
### Mapping HYD — Jobs (mapmyhyd.com) | Next.js 14 · Firestore | Live
- **Pipeline:** tracks roles.
**Also shipped:** DriveScope.`;

test("resume parses into header, sections and role lines with dates apart", () => {
  const blocks = parseResumeLayout(SAMPLE);
  assert.deepEqual(blocks.slice(0, 3).map((b) => b.kind), ["name", "contact", "contact"]);
  const [job, project] = blocks.filter((b) => b.kind === "entry");
  assert.deepEqual(job, { kind: "entry", lead: "Multicloud Engineer Associate", rest: " — Cognizant", when: "Feb 2026 – Sep 2026" });
  assert.equal(project.lead, "Mapping HYD — Jobs (mapmyhyd.com)");
  assert.equal(project.rest, " | Next.js 14 · Firestore");
  assert.equal(project.when, "Live");
});

test("a role line with no markdown still gets its dates on the right", () => {
  const [, entry] = parseResumeLayout("NAME\nTechnical Intern — Getto Jul 2025 – Oct 2025");
  assert.equal(entry.kind, "entry");
  assert.equal(entry.when, "Jul 2025 – Oct 2025");
});

test("no literal markdown reaches the page and links stay clickable", () => {
  const html = resumeHtml(SAMPLE);
  assert.doesNotMatch(html, /\*\*/);
  assert.match(html, /<b>Pipeline:<\/b>/);
  assert.match(html, /<a href="https:\/\/linkedin\.com\/in\/x"[^>]*>linkedin\.com\/in\/x<\/a>/);
  assert.match(html, /href="mailto:a@b\.co"/);
});

test("resume text cannot inject markup or script links", () => {
  const html = resumeHtml('NAME\n<img src=x onerror=alert(1)> [x](javascript:alert(1))');
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /href="javascript/);
});

test("long blanks are caught, links are not blanks", () => {
  const long = "[Add verified workplace technology, endpoint management, or IT support experience, if applicable.]";
  assert.deepEqual(findResumeBlanks(`Summary. ${long} [LinkedIn](https://x.com)`), [long]);
  assert.match(resumeHtml(`NAME\nSUMMARY\nText ${long}`), /<mark/);
});

test("PDF link annotations become markdown links; email stays plain", () => {
  const item = (str, x) => ({ str, width: 40, transform: [1, 0, 0, 1, x, 700] });
  const items = [item("LinkedIn", 100), item("me@x.co", 200), item("Plain", 300)];
  const out = linkPdfItems(items, [
    { subtype: "Link", url: "https://linkedin.com/in/x", rect: [95, 695, 145, 712] },
    { subtype: "Link", url: "mailto:me@x.co", rect: [195, 695, 245, 712] },
  ]);
  assert.deepEqual(out.map((i) => i.str), ["[LinkedIn](https://linkedin.com/in/x)", "me@x.co", "Plain"]);
});
