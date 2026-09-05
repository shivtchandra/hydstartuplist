import test from 'node:test';import assert from 'node:assert/strict';
import {prepareJobs,filterJobs,mapGroups} from '../lib/opportunities.js';
const jobs=prepareJobs([{id:'1',title:'Front-end JS developer',company:'A',url:'https://a.com/1',location:'Hyderabad',description:'JavaScript',firstSeenAt:'2026-09-01',status:'active'},{id:'2',title:'Backend engineer',company:'B',url:'https://b.com/2',status:'closed'}]);
test('skill aliases share the same results',()=>assert.equal(filterJobs(jobs,{q:'frontend javascript'}).length,1));
test('map and results use identical matching membership',()=>assert.equal(mapGroups(filterJobs(jobs,{})).reduce((n,c)=>n+c.count,0),filterJobs(jobs,{}).length));
test('unknown work arrangement remains explicitly searchable',()=>assert.equal(filterJobs(jobs,{work:'unknown'}).length,1));
test('unknown location stays in map-area result lists',()=>assert.equal(filterJobs(jobs,{bounds:'17,18,78,79'}).length,1));
