import test from 'node:test';import assert from 'node:assert/strict';
import {prepareJobs,filterJobs,mapGroups,careerStageCounts,jobSummary} from '../lib/opportunities.js';
import {freshnessLabel} from '../lib/job-lifecycle.js';
const jobs=prepareJobs([{id:'1',title:'Front-end JS developer',company:'A',url:'https://a.com/1',location:'Hyderabad',description:'JavaScript',firstSeenAt:'2026-09-01',status:'active'},{id:'2',title:'Backend engineer',company:'B',url:'https://b.com/2',status:'closed'}]);
test('skill aliases share the same results',()=>assert.equal(filterJobs(jobs,{q:'frontend javascript'}).length,1));
test('map and results use identical matching membership',()=>assert.equal(mapGroups(filterJobs(jobs,{})).reduce((n,c)=>n+c.count,0),filterJobs(jobs,{}).length));
test('unknown work arrangement remains explicitly searchable',()=>assert.equal(filterJobs(jobs,{work:'unknown'}).length,1));
test('unknown location stays in map-area result lists',()=>assert.equal(filterJobs(jobs,{bounds:'17,18,78,79'}).length,1));

test('ATS jobs keep postedAt when sourcePostedAt is missing', () => {
  const recentPost = new Date(Date.now() - 5 * 86400000).toISOString();
  const [job] = prepareJobs([{
    id: 'ats-workday-ncr-1',
    title: 'Quality Engineer',
    company: 'NCR Voyix',
    source: 'ats',
    postedAt: recentPost,
    url: 'https://example.com/j',
    location: 'Hyderabad',
    status: 'active',
  }]);
  assert.equal(job.sourcePostedAt, recentPost);
  assert.equal(filterJobs([job, ...jobs], {}).some(j => j.id === 'ats-workday-ncr-1'), true);
});

test('prepareJobs does not promote a role re-dated after discovery', () => {
  const now = Date.now();
  const [job] = prepareJobs([{
    id: 'ats-ashby-existing',
    title: 'Backend Engineer',
    company: 'Example',
    source: 'ats',
    atsProvider: 'ashby',
    sourcePostedAt: new Date(now - 60 * 60000).toISOString(),
    firstSeenAt: new Date(now - 10 * 86400000).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    url: 'https://example.com/existing',
    location: 'Hyderabad',
    status: 'active',
  }]);
  assert.equal(job.sourcePostedAt, null);
  assert.equal(filterJobs([job], { when: 'today' }, now).length, 0);
});

test('sponsored jobs pin to top and bypass hyd-only filter', () => {
  const prepared = prepareJobs([
    {
      id: 'hyd-1',
      title: 'Engineer',
      company: 'HydCo',
      url: 'https://a.com/h',
      location: 'Hyderabad',
      postedAt: '2026-09-23T18:00:00.000Z',
      status: 'active',
    },
    {
      id: 'priority-punarvi-energies-bdm',
      title: 'Business Development Manager',
      company: 'Punarvi Energies Ltd.',
      url: 'https://www.punarvienergies.com/careers/?role=bdm',
      location: 'Vijayawada, Andhra Pradesh',
      postedAt: '2026-09-23',
      status: 'active',
      sponsored: true,
    },
  ]);
  const ranked = filterJobs(prepared, {});
  assert.equal(ranked[0].id, 'priority-punarvi-energies-bdm');
  assert.equal(filterJobs(prepared, { hyd: 'yes' }).some((j) => j.id === 'priority-punarvi-energies-bdm'), true);
  assert.equal(filterJobs(prepared.map((j) => ({ ...j, sponsored: false })), { hyd: 'yes' }).some((j) => j.id === 'priority-punarvi-energies-bdm'), false);
});

test("career-stage classification survives the static index dropping full descriptions", () => {
  const jobs = prepareJobs([{ id: "grad", title: "Junior Developer", company: "Example", location: "Hyderabad",
    description: "We welcome recent university graduates to build applications.", url: "https://example.com/jobs/grad" }]);
  const summaries = jobs.map(jobSummary);
  assert.equal(summaries[0].careerStage, "fresher");
  assert.equal(summaries[0].description, undefined);
  assert.deepEqual(careerStageCounts(summaries), careerStageCounts(jobs));
});

test("verified evergreen roles show ongoing hiring without inventing a new posting date", () => {
  const now = Date.parse("2026-11-03T00:00:00Z");
  const job = { atsProvider: "greenhouse", status: "active", sourcePostedAt: "2024-02-25T00:00:00Z", lastSeenAt: "2026-11-03T00:00:00Z" };
  assert.equal(freshnessLabel(job, now), "Ongoing hiring");
  assert.notEqual(freshnessLabel({ ...job, status: "closed" }, now), "Ongoing hiring");
  assert.notEqual(freshnessLabel({ ...job, lastSeenAt: undefined, fetchedAt: job.lastSeenAt }, now), "Ongoing hiring");
});

test("career-stage discovery separates zero-experience openings from 1–2-year minimums", () => {
  const now = Date.now();
  const rows = [
    { id: "graduate", title: "Graduate Software Engineer", level: "intern", role: "Engineering", location: "Hyderabad", experience: "0–2 years" },
    { id: "one", title: "Software Engineer", level: "junior", role: "Engineering", location: "Hyderabad", experience: "1+ years" },
    { id: "two", title: "Software Engineer", level: "mid", role: "Engineering", location: "Hyderabad", experience: "2–5 years" },
    { id: "three", title: "Junior Educator", level: "junior", role: "Education", location: "Hyderabad", experience: "3–5 years" },
    { id: "senior", title: "Senior Designer", level: "senior", role: "Design", location: "Hyderabad", experience: "1–2 years" },
    { id: "closed", title: "Graduate Engineer", level: "intern", location: "Hyderabad", status: "closed" },
  ];
  assert.deepEqual(filterJobs(rows, { level: "fresher" }, now).map(j => j.id), ["graduate"]);
  assert.deepEqual(new Set(filterJobs(rows, { level: "early" }, now).map(j => j.id)), new Set(["graduate", "one", "two"]));
  assert.deepEqual(careerStageCounts(rows, { role: "Engineering" }, now), { all: 3, fresher: 1, early: 3 });
});

test("prepareJobs keeps old ATS postings still live on their board, drops stale scraped ones", () => {
  const old = new Date(Date.now() - 100 * 86400000).toISOString();
  const now = new Date().toISOString();
  const jobs = prepareJobs([
    { id: "a", title: "Graduate Software Engineer", company: "Canonical", url: "https://x/a", postedAt: old, lastSeenAt: now, atsProvider: "greenhouse", source: "ats" },
    { id: "b", title: "Data Analyst", company: "Old Co", url: "https://x/b", postedAt: old, lastSeenAt: now, source: "adzuna" },
  ]);
  assert.deepEqual(jobs.map((j) => j.id), ["a"]);
});
