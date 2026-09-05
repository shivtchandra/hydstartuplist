import { createHash } from 'node:crypto';
import { getAllJobs } from './jobs.js';
import { getPublicStartups } from './startups-public.js';
import { getAdminDb } from './firebaseAdmin.js';
import { withTimeout, isNextProductionBuild } from './build-phase.js';
import { prepareJobs, filterJobs, mapGroups, jobSummary, readFilters } from './opportunities.js';
let lastGood=null, expires=0, pending=null;
export async function opportunityDataset() {
  if(lastGood && Date.now()<expires) return lastGood;
  if(pending) return pending;
  pending=(async()=>{
    let jobs, companies;
    [jobs,companies]=await Promise.all([getAllJobs(),getPublicStartups()]);
    if(process.env.JOBS_V2_READS==='1' && !isNextProductionBuild()) {
      const db=await getAdminDb();
      const snap=db && await withTimeout(db.collection('jobs_v2').get(),5000,null);
      if(!snap) { if(lastGood) return {...lastGood,stale:true}; throw new Error('Job store unavailable'); }
      jobs=snap.docs.map(d=>d.data());
    }
    if (jobs.sourceStale && lastGood) return {...lastGood,stale:true};
    const prepared=prepareJobs(jobs,companies);
    const version=createHash('sha256').update(JSON.stringify(prepared.map(({fetchedAt,lastCheckedAt,lastSeenAt,...job})=>job))).digest('hex').slice(0,16);
    lastGood={jobs:prepared,companies,version,stale:!!jobs.sourceStale}; expires=Date.now()+60000; return lastGood;
  })().catch(err=>{if(lastGood) return {...lastGood,stale:true}; throw err;}).finally(()=>{pending=null;});
  return pending;
}
export async function searchOpportunities(filters={},cursor='') {
  filters=readFilters(new URLSearchParams(filters));
  const data=await opportunityDataset();
  const jobs=filterJobs(data.jobs,filters);
  const signature=createHash('sha256').update(JSON.stringify(filters)).digest('hex').slice(0,12);
  let offset=0;
  if(cursor) {
    let c;try{c=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw new Error('Invalid cursor');}
    if(c.version!==data.version || c.signature!==signature) return {reset:true,version:data.version};
    if(!Number.isSafeInteger(c.offset)||c.offset<0) throw new Error('Invalid cursor');
    offset=c.offset;
  }
  const next=offset+30;
  const active=data.jobs.filter(j=>j.status!=='closed');
  const unique=key=>[...new Set(active.map(j=>j[key]).filter(Boolean))].sort();
  return {jobs:jobs.slice(offset,next).map(jobSummary),total:jobs.length,employers:mapGroups(jobs).length,
    version:data.version,stale:data.stale,nextCursor:next<jobs.length?Buffer.from(JSON.stringify({version:data.version,signature,offset:next})).toString('base64url'):null,
    facets:{roles:unique('role'),areas:unique('area'),levels:unique('level'),types:unique('category')},
    shortcuts:{today:active.some(j=>j.firstSeenAt && Date.now()-Date.parse(j.firstSeenAt)<86400000),early:active.some(j=>['intern','junior'].includes(j.level))}};
}
