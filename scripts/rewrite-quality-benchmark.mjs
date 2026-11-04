import fs from 'node:fs/promises';
import path from 'node:path';
import { extractSkills } from '../lib/resume/ats-engine.js';
import { unchangedShare } from '../lib/resume/tailor.js';
import { assessRewriteQuality } from '../lib/resume/rewrite-guidance.js';

// Public examples only. Contact details are deliberately removed before requests.
const sampleRoot = process.env.REWRITE_SAMPLES_DIR || '/Users/shivat/Documents/place finder/hyderabad-eateries-map/.mini/resume-matching-eval';
const endpoint = process.env.REWRITE_ENDPOINT || 'http://localhost:3001/api/resume/tailor';
const stage = process.argv[2] || 'after';
const outDir = path.resolve('.mini/rewrite-quality', stage);
await fs.mkdir(outDir, { recursive: true });
const publicSamples = JSON.parse(await fs.readFile(path.join(sampleRoot, 'online-samples.json'), 'utf8'));
const cases = [
  { id: 'northwestern-cs', split: 'development', title: 'Junior Frontend Engineer', skills: ['JavaScript', 'React'], focus: 'build and test accessible web interfaces, maintain frontend features, debug application problems and collaborate on delivery', unsupported: ['Kubernetes', 'Django'] },
  { id: 'indeed-python', split: 'development', title: 'Python Developer', skills: ['Python', 'HTML'], focus: 'write and test Python programs, debug software, maintain applications across operating systems and document changes', unsupported: ['Django', 'AWS'] },
  { id: 'indeed-lead', split: 'held-out', title: 'Software Engineering Team Lead', skills: ['Leadership'], focus: 'lead software delivery, coordinate database and user interface development, review technical documentation and collaborate with clients', unsupported: ['Java', 'Kubernetes'] },
  { id: 'indeed-data', split: 'held-out', title: 'Data Analyst', skills: ['SQL', 'Data visualization'], focus: 'analyze customer and marketing data, create SQL reports, build statistical models and present findings to business stakeholders', unsupported: ['Python', 'Snowflake'] },
  { id: 'indeed-sales', split: 'held-out', title: 'Sales Representative', skills: ['Cold-calling', 'Customer relationship management'], focus: 'qualify leads, maintain customer relationships, conduct outbound prospecting, prepare sales reports and meet revenue goals', unsupported: ['Salesforce', 'HubSpot'] },
];
const normalize = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const quantityTokens = (text) => [...new Set(String(text).match(/\b\d[\d,.]*(?:%|\+|[kKmMbB])?(?![\w])/g) || [])].sort();
const selected = process.env.REWRITE_CASES?.split(',');
const rows = [];
for (const spec of cases.filter((item) => !selected || selected.includes(item.id))) {
  const sample = publicSamples.find((item) => item.id === spec.id);
  let source = sample.text || await fs.readFile(path.join(sampleRoot, sample.file), 'utf8');
  source = source.split('\n').filter((line) => !/@|https?:\/\/|linkedin\.com|github\.com|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/i.test(line)).join('\n').trim();
  for (const rewriteMode of ['job', 'role']) {
    const description = `In this role you will ${spec.focus}. Requirements include ${spec.skills.join(', ')} and clear communication. Preferred qualifications include ${spec.unsupported.join(' and ')}. Collaborate with the team to maintain reliable processes, explain technical decisions and deliver useful work to customers.`;
    const request = { resumeText: source, jobTitle: spec.title, rewriteMode, company: rewriteMode === 'job' ? 'Public Benchmark Employer' : '', jobDescription: rewriteMode === 'job' ? description : '', jobSkills: rewriteMode === 'job' ? spec.skills : [] };
    const started = Date.now();
    let status = 0; let data;
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(90000) });
      status = response.status; data = await response.json();
    } catch (error) { data = { error: error.message }; }
    const output = data?.tailored?.fullTailoredResume || '';
    const sourceQuantities = quantityTokens(source);
    const missingQuantities = sourceQuantities.filter((value) => !quantityTokens(output).includes(value));
    const novelQuantities = quantityTokens(output.replace(/\[[^\]]*\]/g, '')).filter((value) => !sourceQuantities.includes(value));
    const sourceSkills = new Set(extractSkills(source));
    const novelSkills = extractSkills(output).filter((value) => !sourceSkills.has(value));
    const unsupportedClaims = spec.unsupported.filter((value) => normalize(output).includes(normalize(value)) && !normalize(source).includes(normalize(value)));
    const qualityIssues = output ? assessRewriteQuality(output, source, request) : [];
    const summary = { qualityIssues, qualityAttempts: data?.qualityAttempts || 0, passedEditorialChecks: Boolean(output) && qualityIssues.length === 0, id: spec.id, split: spec.split, rewriteMode, status, mode: data.mode, latencyMs: Date.now() - started, code: data.code, sourceWords: source.split(/\s+/).length, outputWords: output.split(/\s+/).filter(Boolean).length, missingQuantities, novelQuantities, novelSkills, unsupportedClaims, changes: data?.tailored?.changes?.length || 0, unchangedShare: output ? unchangedShare(source, output) : null, warnings: data?.tailored?.warnings || [], passedMechanicalChecks: status === 200 && data.mode === 'openai' && !missingQuantities.length && !novelQuantities.length && !novelSkills.length && !unsupportedClaims.length };
    await fs.writeFile(path.join(outDir, `${spec.id}-${rewriteMode}.json`), JSON.stringify({ sourceUrl: sample.source, syntheticJobDescription: rewriteMode === 'job', request, response: data, summary }, null, 2));
    rows.push(summary);
    console.log(JSON.stringify({ id: spec.id, rewriteMode, status, mode: data.mode, passed: summary.passedMechanicalChecks }));
  }
}
await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify({ note: 'Mechanical regression checks only; not proof of semantic truth, ATS acceptance, readability or superiority. Inspect the saved before/after texts for qualitative quality.', cases: rows.length, passed: rows.filter((item) => item.passedMechanicalChecks).length, results: rows }, null, 2));
