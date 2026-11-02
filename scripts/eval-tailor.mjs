// Hard test of the Resume Hub AI on made-up resumes and real portal job posts, through the
// real local routes. Spends OpenAI credits. Needs the dev server: node scripts/eval-tailor.mjs
// Finished cases are kept in .mini/eval/cases, so a rerun only does what is missing or failed.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hasMeaningfulJobDescription, unchangedShare } from "../lib/resume/tailor.js";
import { findResumeBlanks, parseResumeLayout, resumePrintDocument } from "../lib/resume/layout.js";

const BASE = process.env.EVAL_BASE || "http://localhost:3001";
const OUT = process.env.EVAL_OUT || ".mini/eval";
// Reruns the same people and job posts as an earlier run, for a fair before and after.
const BASELINE = process.env.EVAL_BASELINE || "";
const LEVELS = (process.env.EVAL_LEVELS || "fit,stretch,poor").split(",");
const CONCURRENCY = 3;
const SOURCE_PROVIDERS = ["greenhouse", "lever", "ashby", "workday", "smartrecruiters", "eightfold"];

const PEOPLE = [
  { id: "01-fresher", early: true, keep: ["Vasavi Software Labs", "Campus Bus Tracker", "Expense Splitter", "Library Book Recommender"], fit: /\b(graduate|intern|junior|associate) .*(software|developer|engineer)|software (engineer|developer) (i|1|intern)\b/i, stretch: /^software (engineer|developer)\b(?!.*(senior|staff|lead))/i, poor: /account executive|finance manager|legal counsel/i },
  { id: "02-backend", early: false, keep: ["Northwind Payments", "Bluecart Retail"], fit: /\b(senior )?(backend|back-end|software) engineer\b(?!.*(front|mobile|ios|android))/i, stretch: /\b(staff|principal|engineering manager)\b.*engineer|engineering manager/i, poor: /account executive|recruiter|designer/i },
  { id: "03-data-analyst", early: true, keep: ["Kirana Direct", "Medora Health"], fit: /\b(data|business|product) analyst\b(?!.*senior)/i, stretch: /\b(senior .*analyst|data scientist|analytics manager)\b/i, poor: /software engineer|machine learning engineer|account executive/i },
  { id: "04-designer", early: false, keep: ["Paisa Bazaar Labs", "Studio Kolam"], fit: /\b(product|ux|ui)[ /]*(ux )?designer\b(?!.*(lead|principal|staff))/i, stretch: /\b(lead|principal|staff|senior) .*designer|design manager\b/i, poor: /backend engineer|accountant|data engineer/i },
  { id: "05-sales-ops", early: false, keep: ["Malabar Foods", "Coastline Logistics"], fit: /\b(sales manager|account manager|account executive|business development)\b/i, stretch: /\b(head of sales|sales director|vp.*sales|customer success manager)\b/i, poor: /software engineer|data scientist|ux designer/i },
  { id: "06-finance", early: false, keep: ["Lotus SaaS", "Sharma & Rao"], fit: /\b(finance|financial|fp&a) analyst\b/i, stretch: /\b(finance manager|senior finance|controller|accounting manager)\b/i, poor: /software engineer|recruiter|product designer/i },
  { id: "07-pm", early: false, keep: ["Trellis Commerce", "HireLoop", "Zenith Mobility"], fit: /\b(senior|group|lead|principal) product manager\b/i, stretch: /\b(director|head|vp).*product\b/i, poor: /accountant|backend engineer|quality/i },
  { id: "08-switcher", early: true, keep: ["St. Xavier", "QuizMaker", "Attendance Bot"], fit: /\b(junior|associate|graduate|trainee).*(developer|software|engineer)|frontend (developer|engineer)\b(?!.*senior)/i, stretch: /\b(full.?stack|software) (developer|engineer)\b(?!.*(senior|staff|lead))/i, poor: /finance manager|sales director|data scientist/i },
  { id: "09-thin", early: true, keep: ["Sagar Tech", "Andhra University"], fit: /\b(technical support|support engineer|customer support|it support)\b/i, stretch: /\b(site reliability|devops|sre|systems? engineer)\b/i, poor: /product manager|financial analyst|ux designer/i },
  { id: "10-messy", early: false, keep: ["Finbridge Technologies", "Orbit Infosoft"], fit: /\b(qa|quality|test|sdet)\b.*\b(engineer|analyst|lead)?\b/i, stretch: /\b(sdet|test architect|qa lead|quality lead|quality manager)\b/i, poor: /account executive|ux designer|finance/i },
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function post(path, body, { retries = 14 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const started = Date.now();
    const res = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 429 || attempt >= retries) return { status: res.status, data, ms: Date.now() - started };
    await sleep(60_000);
  }
}

const inIndia = (job) => /india|hyderabad|bengaluru|bangalore|pune|gurgaon|gurugram|mumbai|chennai|noida|remote/i.test(job.location || "");
const provider = (job) => /^ats-([a-z0-9]+)-/.exec(job.id)?.[1] || "";

/** Picks real posts with readable text, spreading across companies and job sources. */
async function pickJobs(jobs) {
  if (BASELINE) {
    return PEOPLE.flatMap((person) => LEVELS.map((level) => {
      const before = JSON.parse(readFileSync(`${BASELINE}/cases/${person.id}-${level}.json`, "utf8"));
      const job = jobs.find((j) => j.id === before.job.id) || before.job;
      return { person, level, job, text: readFileSync(`${BASELINE}/jds/${person.id}-${level}.txt`, "utf8") };
    }));
  }
  const used = new Set();
  const picks = [];
  for (const person of PEOPLE) {
    for (const level of ["fit", "stretch", "poor"]) {
      const pool = jobs.filter((j) => inIndia(j) && person[level].test(j.title) && SOURCE_PROVIDERS.includes(provider(j)));
      pool.sort((a, b) => (used.has(a.company) - used.has(b.company)) || (SOURCE_PROVIDERS.indexOf(provider(a)) - SOURCE_PROVIDERS.indexOf(provider(b))));
      let found = null;
      for (let i = 0; i < pool.length && i < 30 && !found; i += 10) {
        const batch = pool.slice(i, i + 10);
        const { data } = await post("/api/career/job-text", { jobs: batch.map((j) => ({ id: j.id, url: j.url })) });
        const hit = batch.find((j) => hasMeaningfulJobDescription(data.texts?.[j.id]) && data.texts[j.id].length > 800);
        if (hit) found = { job: hit, text: data.texts[hit.id] };
      }
      if (found) used.add(found.job.company);
      picks.push({ person, level, ...(found || {}) });
    }
  }
  return picks;
}

function formatChecks(resume, person, pdfPath) {
  const layout = parseResumeLayout(resume);
  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"]).toString();
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdfPath]).toString())?.[1] || 0);
  return {
    pages,
    strayMarkdown: /\*\*|^#+\s|\]\(http/m.test(text),
    nameFirst: layout[0]?.kind === "name",
    sections: layout.filter((b) => b.kind === "section").map((b) => b.text),
    entries: layout.filter((b) => b.kind === "entry").length,
    entriesWithDates: layout.filter((b) => b.kind === "entry" && b.when).length,
    keptAll: person.keep.every((name) => resume.toLowerCase().includes(name.toLowerCase())),
    missing: person.keep.filter((name) => !resume.toLowerCase().includes(name.toLowerCase())),
    emailInPdf: /@example\.com/.test(text),
  };
}

function summaryWords(resume) {
  const blocks = parseResumeLayout(resume);
  const at = blocks.findIndex((b) => b.kind === "section" && /summary|profile|about|objective/i.test(b.text));
  if (at < 0) return 0;
  const body = [];
  for (const b of blocks.slice(at + 1)) {
    if (b.kind === "section" || b.kind === "entry") break;
    body.push(b.text);
  }
  return body.join(" ").split(/\s+/).filter(Boolean).length;
}

async function runCase(pick, page) {
  const { person, level, job, text } = pick;
  const file = `${OUT}/cases/${person.id}-${level}.json`;
  if (existsSync(file) && JSON.parse(readFileSync(file, "utf8")).status === 200) return;
  const resumeText = readFileSync(`tests/fixtures/resumes/${person.id}.txt`, "utf8");
  const result = { person: person.id, level, job: job ? { id: job.id, title: job.title, company: job.company, source: provider(job) } : null };
  if (!job) {
    result.status = 0;
    result.code = "NO_JOB_FOUND";
    writeFileSync(file, JSON.stringify(result, null, 1));
    return;
  }
  const fit = await post("/api/career/match", {
    resumeText,
    earlyCareer: person.early,
    jobs: [{ id: job.id, title: job.title, company: job.company, experience: job.experience || "", description: text.slice(0, 3000) }],
  });
  result.fit = fit.data.matches?.[job.id] || { error: fit.status };
  result.warned = (result.fit.score ?? 100) < 50;

  const pack = await post("/api/resume/tailor", { resumeText, jobDescription: text, jobTitle: job.title, company: job.company, jobSkills: job.skills || [] }, { retries: 2 });
  Object.assign(result, { status: pack.status, ms: pack.ms, code: pack.data.code, error: pack.data.error });
  const tailored = pack.data.tailored;
  if (tailored) {
    const resume = tailored.fullTailoredResume;
    const pdfPath = `${OUT}/pdf/${person.id}-${level}.pdf`;
    await page.setContent(resumePrintDocument(resume, "resume").replace(/window\.print\(\)/, ""), { waitUntil: "load" });
    await page.waitForTimeout(100);
    await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
    Object.assign(result, {
      resume,
      changes: tailored.changes,
      warnings: tailored.warnings,
      placeholders: tailored.placeholders,
      coverLetter: tailored.coverLetter,
      answers: tailored.screeningAnswers,
      metrics: {
        unchanged: Number(unchangedShare(resumeText, resume).toFixed(2)),
        changes: tailored.changes.length,
        blanks: findResumeBlanks(resume),
        summaryWords: summaryWords(resume),
        coverWords: tailored.coverLetter.split(/\s+/).filter(Boolean).length,
        format: formatChecks(resume, person, pdfPath),
      },
    });
  }
  writeFileSync(file, JSON.stringify(result, null, 1));
  writeFileSync(`${OUT}/jds/${person.id}-${level}.txt`, text);
  console.log(person.id, level, result.status, result.code || "", result.ms, job.title);
}

for (const dir of ["cases", "pdf", "jds"]) mkdirSync(`${OUT}/${dir}`, { recursive: true });
const { chromium } = createRequire("/Users/shivat/Documents/place finder/mapping-hyd-reels/package.json")("playwright");
const browser = await chromium.launch({ channel: "chrome" });
const { jobs } = await (await fetch(`${BASE}/data/jobs-index.json`)).json();
const picks = await pickJobs(jobs);
console.log("jobs picked", picks.filter((p) => p.job).length, "of", picks.length);
let next = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  const page = await browser.newPage();
  while (next < picks.length) await runCase(picks[next++], page);
}));
await browser.close();
console.log("done");
