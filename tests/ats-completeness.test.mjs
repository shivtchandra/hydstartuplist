import test from 'node:test';import assert from 'node:assert/strict';
import {fetchBoardJobs} from '../lib/ats/index.js';
test('a valid empty board is a successful complete scan',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({jobs:[]}),{headers:{'Content-Type':'application/json'}});
  try{const result=await fetchBoardJobs('greenhouse','example');assert.equal(result.ok,true);assert.equal(result.complete,true);assert.deepEqual(result.jobs,[]);}finally{globalThis.fetch=original;}
});
test('failed and malformed boards never become successful empty scans',async()=>{
  const original=globalThis.fetch;
  try{globalThis.fetch=async()=>new Response('Unavailable',{status:503});assert.equal((await fetchBoardJobs('greenhouse','example')).ok,false);
    globalThis.fetch=async()=>new Response('{}');assert.equal((await fetchBoardJobs('greenhouse','example')).ok,false);
  }finally{globalThis.fetch=original;}
});
test('advertised totals prevent truncated board replacement',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({total:20,content:[]}));
  try{assert.equal((await fetchBoardJobs('smartrecruiters','example')).ok,false);}finally{globalThis.fetch=original;}
});
