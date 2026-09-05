import { createHash,randomUUID } from 'node:crypto';
import { reconcileBoard } from './job-lifecycle.js';
export const recordId=value=>createHash('sha256').update(String(value)).digest('hex');
export async function acquireBoard(db,boardId,now=Date.now()) {
  const ref=db.collection('board_status').doc(recordId(boardId)),token=randomUUID();
  const granted=await db.runTransaction(async tx=>{const snap=await tx.get(ref);const old=snap.data();if(old?.leaseUntil>now)return false;
    tx.set(ref,{boardId,leaseToken:token,leaseUntil:now+240000,lastAttemptAt:now},{merge:true});return true;});
  return granted?{ref,token}:null;
}
export async function commitBoard(db,lease,board,jobs,checkedAt,{baseline=false,intervalMinutes=120}={}) {
  const current=await db.collection('jobs_v2').where('boardId','==',board.id).get();
  const previous=current.docs.map(d=>d.data());
  const outcome=reconcileBoard(previous,jobs.map(j=>({...j,boardId:board.id})),{complete:true,checkedAt,baseline});
  if(outcome.jobs.length+outcome.events.length>440)throw Error('Board exceeds atomic write budget; retain previous records and partition before retry');
  await db.runTransaction(async tx=>{
    const snap=await tx.get(lease.ref);const state=snap.data();
    if(state?.leaseToken!==lease.token || state.leaseUntil<Date.now())throw Error('Stale board lease');
    if(state.lastSuccessAt>=Date.parse(checkedAt))throw Error('Older scan rejected');
    for(const job of outcome.jobs)tx.set(db.collection('jobs_v2').doc(recordId(job.id)),job);
    for(const event of outcome.events)tx.set(db.collection('job_events').doc(recordId(`${event.jobId}:${event.type}:${event.at}`)),event);
    tx.set(lease.ref,{lastSuccessAt:Date.parse(checkedAt),nextCheckAt:Date.parse(checkedAt)+intervalMinutes*60000,leaseUntil:0,failures:0,error:null,activeJobs:outcome.jobs.filter(j=>j.status!=='closed').length,changes:outcome.events.length,baselineComplete:true},{merge:true});
  });return outcome;
}
