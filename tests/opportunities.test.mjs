import test from 'node:test';import assert from 'node:assert/strict';
import {prepareJobs,filterJobs,mapGroups} from '../lib/opportunities.js';
const jobs=prepareJobs([{id:'1',title:'Front-end JS developer',company:'A',url:'https://a.com/1',location:'Hyderabad',description:'JavaScript',firstSeenAt:'2026-09-01',status:'active'},{id:'2',title:'Backend engineer',company:'B',url:'https://b.com/2',status:'closed'}]);
test('skill aliases share the same results',()=>assert.equal(filterJobs(jobs,{q:'frontend javascript'}).length,1));
test('map and results use identical matching membership',()=>assert.equal(mapGroups(filterJobs(jobs,{})).reduce((n,c)=>n+c.count,0),filterJobs(jobs,{}).length));
test('unknown work arrangement remains explicitly searchable',()=>assert.equal(filterJobs(jobs,{work:'unknown'}).length,1));
test('unknown location stays in map-area result lists',()=>assert.equal(filterJobs(jobs,{bounds:'17,18,78,79'}).length,1));

test('ATS jobs keep postedAt when sourcePostedAt is missing', () => {
  const [job] = prepareJobs([{
    id: 'ats-workday-ncr-1',
    title: 'Quality Engineer',
    company: 'NCR Voyix',
    source: 'ats',
    postedAt: '2026-09-04T19:10:22.383Z',
    url: 'https://example.com/j',
    location: 'Hyderabad',
    status: 'active',
  }]);
  assert.equal(job.sourcePostedAt, '2026-09-04T19:10:22.383Z');
  assert.equal(filterJobs([job, ...jobs], {}).some(j => j.id === 'ats-workday-ncr-1'), true);
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
