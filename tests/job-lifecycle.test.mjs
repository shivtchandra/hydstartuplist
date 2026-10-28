import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileBoard, freshnessLabel, verificationLabel, deduplicateJobs } from '../lib/job-lifecycle.js';
const at = '2026-09-05T00:00:00.000Z';
const old = [{ id:'a', firstSeenAt:'2026-08-01T00:00:00Z', status:'active' }];
test('incomplete scans preserve records and emit nothing',()=>assert.deepEqual(reconcileBoard(old,[],{complete:false,checkedAt:at}),{jobs:old,events:[]}));
test('two complete missing scans close a vacancy once',()=>{
  const first=reconcileBoard(old,[],{complete:true,checkedAt:at});
  assert.equal(first.jobs[0].status,'active');
  const second=reconcileBoard(first.jobs,[],{complete:true,checkedAt:at});
  assert.equal(second.events[0].type,'closed');
  assert.equal(reconcileBoard(second.jobs,[],{complete:true,checkedAt:at}).events.length,0);
});
test('updates preserve discovery; baseline never alerts',()=>{
  assert.equal(reconcileBoard(old,[{id:'a'}],{complete:true,checkedAt:at}).jobs[0].firstSeenAt,old[0].firstSeenAt);
  assert.equal(reconcileBoard([],[{id:'a'}],{complete:true,checkedAt:at,baseline:true}).events.length,0);
});
test('future timestamps and unknown dates are honest',()=>assert.equal(freshnessLabel({postedAt:'2099-01-01'},Date.parse(at)),'Posting date unavailable'));
test('dedup keeps distinct query-based requisitions',()=>{
  assert.equal(deduplicateJobs([{id:'a',url:'https://a.com/jobs?id=1'},{id:'b',url:'https://a.com/jobs?id=2'},{id:'c',url:'https://a.com/jobs?id=1&utm_source=x'}]).length,2);
});
test('rescans cannot make an existing requisition look newly posted',()=>{
  const previous=[{id:'a',sourcePostedAt:'2026-08-01T00:00:00Z',postedAt:'2026-08-01T00:00:00Z',firstSeenAt:'2026-08-02T00:00:00Z'}];
  const incoming=[{id:'a',sourcePostedAt:'2026-09-04T00:00:00Z',postedAt:'2026-09-04T00:00:00Z'}];
  const [job]=reconcileBoard(previous,incoming,{complete:true,checkedAt:at}).jobs;
  assert.equal(job.sourcePostedAt,'2026-08-01T00:00:00.000Z');
});
test('impossible source dates fall back to discovery while verification stays separate',()=>{
  const now=Date.parse(at);
  const job={sourcePostedAt:'2026-09-04T00:00:00Z',firstSeenAt:'2026-08-01T00:00:00Z',lastSeenAt:'2026-09-04T23:00:00Z'};
  assert.equal(freshnessLabel(job,now),'Discovered 35d ago');
  assert.equal(verificationLabel(job,now),'Verified open 1h ago');
});
