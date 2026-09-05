import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileBoard, freshnessLabel, deduplicateJobs } from '../lib/job-lifecycle.js';
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
