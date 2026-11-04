import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRewriteQuality } from '../lib/resume/rewrite-guidance.js';
import { generateValidatedTailoring } from '../lib/resume/tailor.js';

const cases = [
  { title: 'Frontend Engineer', profession: 'Frontend Developer', skills: 'React, TypeScript, JavaScript, Docker', work: 'Delivered responsive interfaces with React and TypeScript for customer workflows.' },
  { title: 'Data Analyst', profession: 'Data Analyst', skills: 'SQL, Python, PostgreSQL, Excel', work: 'Analyzed customer trends with SQL and explained findings through monthly business reports.' },
  { title: 'Account Executive', profession: 'Sales Representative', skills: 'Salesforce, Excel, customer relationships', work: 'Qualified leads and maintained customer relationships while coordinating sales reports with colleagues.' },
  { title: 'Registered Nurse', profession: 'Registered Nurse', skills: 'patient assessment, care coordination, documentation', work: 'Coordinated patient assessments and documented care plans with the ward team.' },
];

for (const spec of cases) test(`editorial repair preserves facts and identity for ${spec.title}`, async () => {
  const source = `# Example Candidate\n## SUMMARY\n${spec.profession} with experience in collaborative delivery.\n## SKILLS\n${spec.skills}\n## EXPERIENCE\n${spec.profession} — Example Employer | 2022 - Present\n- ${spec.work}\n## EDUCATION\nExample qualification, Example College, 2022`;
  const weak = source.replace(`${spec.profession} with experience in collaborative delivery.`, spec.work);
  const improved = source;
  assert.ok(assessRewriteQuality(weak, source, {jobTitle:spec.title}).some(issue=>issue.code==='task-only-summary' || issue.code==='repeated-summary-evidence'));
  assert.deepEqual(assessRewriteQuality(improved, source, {jobTitle:spec.title}), []);
  let calls=0;
  const result=await generateValidatedTailoring({prompt:'Original source and role',resumeText:source,jobTitle:spec.title,generate:async()=>({fullTailoredResume:++calls===1?weak:improved})});
  assert.equal(calls,2);
  assert.equal(result.tailored.fullTailoredResume,improved);
  assert.deepEqual(result.qualityIssues,[]);
});

test('an editorial pass cannot trade two cosmetic issues for missing relevant skills', async()=>{
  const source=`# Example Candidate
**Backend Developer | API integration**
## SUMMARY
Backend developer with API integration and deployment experience.
## SKILLS
Python, Docker, AWS
## EXPERIENCE
Backend Developer — Example Company | 2023 - Present
- Built a Python API and deployed it with Docker on AWS.
## EDUCATION
Bachelor of Science, Example University, 2023`;
  const weak=source.replace('**Backend Developer | API integration**','**Python | Docker | AWS**').replace('Backend developer with API integration and deployment experience.','Built a Python API and deployed it with Docker on AWS.');
  const regression=source.replace('Python, Docker, AWS','Python');
  let calls=0;
  const result=await generateValidatedTailoring({prompt:'Original source',resumeText:source,jobTitle:'Backend Engineer',generate:async()=>({fullTailoredResume:++calls===1?weak:regression})});
  assert.equal(result.tailored.fullTailoredResume,weak);
  assert.ok(result.qualityIssues.length>0);
});
