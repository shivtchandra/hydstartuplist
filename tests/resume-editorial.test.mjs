import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRewriteQuality, cleanRedundantSkillLabels, rewriteRoleProfile, roleAwareGuidance } from '../lib/resume/rewrite-guidance.js';
import { buildTailoringPrompt, generateValidatedTailoring } from '../lib/resume/tailor.js';

const source = `# Example Candidate
**Full-Stack Developer | API integration | Cloud monitoring**
## SUMMARY
Full-stack developer with API integration and cloud monitoring experience. Built a service that reduced errors by 20% through request validation.
## SKILLS
- Languages: Python, JavaScript
- Delivery: AWS, Docker, GitHub Actions
- AI: LangChain, RAG
## EXPERIENCE
Full-Stack Developer — Example Company | 2023 - Present
- Built a service that reduced errors by 20% through request validation.
- Checked frontend and backend request contracts with the backend developer.
## PROJECTS
### Workflow service
- Built an API workflow with Python and Docker.
## EDUCATION
Bachelor of Science, Example University, 2023`;

const weak = source
  .replace('**Full-Stack Developer | API integration | Cloud monitoring**', '**AWS | Docker | Python | JavaScript**')
  .replace('Full-stack developer with API integration and cloud monitoring experience. Built a service that reduced errors by 20% through request validation.', 'Built a service that reduced errors by 20% through request validation.')
  .replace('AWS, Docker, GitHub Actions', 'AWS')
  .replace('- AI: LangChain, RAG\n', '');

const good = source.replace(
  'Full-stack developer with API integration and cloud monitoring experience. Built a service that reduced errors by 20% through request validation.',
  'Full-stack developer with API integration, cloud monitoring and request validation experience.'
);

test('role routing covers technical and nontechnical careers without matching incidental vendors', () => {
  for (const [title, expected] of [
    ['Associate QA Consultant, Amazon Connect', 'quality'], ['SDET', 'quality'],
    ['React Frontend Engineer', 'frontend'], ['Cloud Engineer', 'platform'],
    ['AI Engineer', 'ai'], ['Data Analyst', 'data'], ['Product Manager', 'product'],
    ['UX Designer', 'design'], ['Account Executive', 'commercial'],
    ['Backend Developer', 'software'], ['Security Analyst', 'security'],
    ['Registered Nurse', 'general'], ['', 'general'],
  ]) assert.equal(rewriteRoleProfile(title).id, expected, title);
  assert.equal(rewriteRoleProfile('Salesforce QA Consultant').id, 'quality');
  assert.match(roleAwareGuidance({jobTitle:'Registered Nurse'}), /Do not force technical terminology/);
});

test('both modes adapt evidence selection without inventing vacancy eligibility', () => {
  for (const rewriteMode of ['job', 'role']) {
    const prompt = buildTailoringPrompt({resumeText:source, jobTitle:'QA Consultant', rewriteMode});
    assert.match(prompt, /ROLE-AWARE EDITORIAL PRIORITIES \(quality\)/);
    assert.match(prompt, /formal QA employment/);
    assert.match(prompt, /source-supported professional identity|supported professional identity/);
    assert.match(prompt, /preferred exposure/);
    if (rewriteMode === 'role') assert.match(prompt, /no employer-specific eligibility/);
  }
});

test('the reviewed failure pattern finds task-only prose, raw keyword headlines and lost supporting skills', () => {
  const issues = assessRewriteQuality(weak, source, {jobTitle:'QA Consultant'});
  assert.deepEqual(issues.map(issue=>issue.code), ['task-only-summary','keyword-only-headline','lost-relevant-skills','repeated-summary-evidence']);
  assert.match(issues.find(issue=>issue.code==='lost-relevant-skills').message, /docker/i);
  assert.match(issues.find(issue=>issue.code==='lost-relevant-skills').message, /langchain/i);
  assert.equal(assessRewriteQuality(good, source, {jobTitle:'QA Consultant'}).length, 0);
});

test('skill aliases and concise achievement previews do not trigger spurious repairs', () => {
  const original = good.replace('Languages: Python, JavaScript', 'Web: React.js, Node.js, PostgreSQL');
  const rewritten = original.replace('Web: React.js, Node.js, PostgreSQL', 'Web: React, NodeJS, Postgres');
  assert.equal(assessRewriteQuality(rewritten, original, {jobTitle:'Frontend Engineer'}).length, 0);
  const preview = good.replace('Full-stack developer with API integration, cloud monitoring and request validation experience.', 'Full-stack developer with API integration experience and a 20% reduction in service errors.');
  assert.ok(!assessRewriteQuality(preview, source, {jobTitle:'QA Consultant'}).some(issue=>issue.code==='repeated-summary-evidence'));
});

test('multiline summaries are not accidentally compared against themselves', () => {
  const output = good.replace('Full-stack developer with API integration, cloud monitoring and request validation experience.', 'Full-stack developer with API integration, cloud monitoring\nand request validation experience across service delivery.');
  assert.ok(!assessRewriteQuality(output, source).some(issue=>issue.code==='repeated-summary-evidence'));
});

test('a short factual but weak draft receives an editorial pass, not just overlong drafts', async () => {
  const prompts = [];
  const result = await generateValidatedTailoring({prompt:'Source and target',resumeText:source,jobTitle:'QA Consultant',generate:async prompt=>{
    prompts.push(prompt); return {fullTailoredResume:prompts.length===1?weak:good};
  }});
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /IMPROVE THE VALID DRAFT/);
  assert.match(prompts[1], /lost-relevant-skills/);
  assert.equal(result.qualityAttempts,1);
  assert.equal(result.compressionAttempts,0);
  assert.equal(result.tailored.fullTailoredResume,good);
  assert.deepEqual(result.qualityIssues,[]);
});

test('an unsafe, unchanged or unavailable editorial pass keeps the factual draft and exposes remaining issues', async () => {
  for (const edited of [good.replace('20%','90%'), weak, null]) {
    let calls=0;
    const result=await generateValidatedTailoring({prompt:'Source and target',resumeText:source,jobTitle:'QA Consultant',generate:async()=>{
      calls++;
      if(calls===1)return {fullTailoredResume:weak};
      if(edited===null)throw new Error('Service unavailable');
      return {fullTailoredResume:edited};
    }});
    assert.equal(calls,2);
    assert.equal(result.tailored.fullTailoredResume,weak);
    assert.ok(result.qualityIssues.length>0);
    assert.match(result.tailored.warnings.join(' '),/Review rewrite:/);
  }
});

test('redundant skill labels are removed without changing substantive groups or experience', () => {
  const text = '# Candidate\n## SKILLS\n- **Communication:** Communication\n- **Analysis:** SQL, Excel\n## EXPERIENCE\n- Communication: Communication';
  const cleaned = cleanRedundantSkillLabels(text);
  assert.match(cleaned, /## SKILLS\n- Communication\n/);
  assert.match(cleaned, /\*\*Analysis:\*\* SQL, Excel/);
  assert.match(cleaned, /## EXPERIENCE\n- Communication: Communication/);
  assert.equal(cleanRedundantSkillLabels(cleaned), cleaned);
});

test('an already strong draft avoids the extra request', async()=>{
  let calls=0;
  const result=await generateValidatedTailoring({prompt:'Source and target',resumeText:source,jobTitle:'QA Consultant',generate:async()=>{
    calls++;return {fullTailoredResume:good};
  }});
  assert.equal(calls,1);
  assert.equal(result.qualityAttempts,0);
});
