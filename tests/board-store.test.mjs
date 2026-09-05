import test from 'node:test';import assert from 'node:assert/strict';
import {acquireBoard,commitBoard,recordId} from '../lib/board-store.js';
class MemoryDb {
  data=new Map();queue=Promise.resolve();
  collection(name){const db=this;return {doc(id){const key=name+'/'+id;return {key,get:async()=>({data:()=>db.data.get(key),exists:db.data.has(key)})};},where(field,op,value){return {get:async()=>({docs:[...db.data.entries()].filter(([key,v])=>key.startsWith(name+'/')&&v[field]===value).map(([,v])=>({data:()=>v}))})};}};}
  runTransaction(fn){const run=this.queue.then(async()=>{const writes=[];const result=await fn({get:r=>r.get(),set:(r,v,o)=>writes.push([r.key,v,o])});for(const [k,v,o] of writes)this.data.set(k,o?.merge?{...this.data.get(k),...v}:v);return result;});this.queue=run.catch(()=>{});return run;}
}
test('overlapping board workers get only one lease',async()=>{const db=new MemoryDb();const leases=await Promise.all([acquireBoard(db,'a'),acquireBoard(db,'a')]);assert.equal(leases.filter(Boolean).length,1);});
test('stale worker cannot overwrite successor records',async()=>{const db=new MemoryDb();const old=await acquireBoard(db,'a');db.data.set(old.ref.key,{leaseToken:'replacement',leaseUntil:Date.now()+240000});await assert.rejects(commitBoard(db,old,{id:'a'},[{id:'job'}],new Date().toISOString()),/Stale/);assert.equal(db.data.has('jobs_v2/'+recordId('job')),false);});
test('baseline stores jobs without emitting events',async()=>{const db=new MemoryDb();const lease=await acquireBoard(db,'a');await commitBoard(db,lease,{id:'a'},[{id:'job'}],new Date().toISOString(),{baseline:true});assert.equal(db.data.get('jobs_v2/'+recordId('job')).firstSeenAt,null);assert.equal([...db.data.keys()].some(k=>k.startsWith('job_events/')),false);});
