import http from 'node:http';
import { initializeApp,applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fetchBoardJobs,toPublicJob } from '../lib/ats/index.js';
import { acquireBoard,commitBoard,recordId } from '../lib/board-store.js';
import fs from 'node:fs';
initializeApp({credential:applicationDefault()});const db=getFirestore();
const registry=JSON.parse(fs.readFileSync(new URL('../data/ats-boards.json',import.meta.url))).filter(b=>b.active!==false);
const boards=registry.map((b,i)=>({...b,id:`${b.atsProvider}:${b.atsSlug}`,order:i}));
const safeProviders=new Set(['greenhouse','lever','ashby','recruitee','breezy','smartrecruiters']);
async function accessToken(){const r=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'},signal:AbortSignal.timeout(3000)});if(!r.ok)throw Error('Task authentication unavailable');return (await r.json()).access_token;}
async function dispatch(){
  if(process.env.INGESTION_ENABLED!=='1')return {enabled:false};
  const state=await db.collection('board_status').get();const status=new Map(state.docs.map(d=>[d.data().boardId,d.data()]));
  const follows=await db.collection('company_demand').get();const demand=new Map(follows.docs.map(d=>[d.id,d.data().count||0]));
  const ordered=[...boards].sort((a,b)=>(demand.get(recordId(b.name))||0)-(demand.get(recordId(a.name))||0)||(status.get(b.id)?.changes||0)-(status.get(a.id)?.changes||0)||a.order-b.order);
  const priority=new Set(ordered.filter(b=>safeProviders.has(b.atsProvider)).slice(0,20).map(b=>b.id));
  const token=await accessToken();let queued=0;
  for(const board of ordered){
    const previous=status.get(board.id)||{};if(previous.nextCheckAt>Date.now()||previous.leaseUntil>Date.now())continue;
    const minutes=priority.has(board.id)?15:Math.max(120,board.minPollMinutes||120);
    const slot=Math.floor(Date.now()/300000),name=`scan-${recordId(board.id).slice(0,24)}-${slot}`;
    const parent=`projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.GCP_REGION}/queues/${process.env.TASK_QUEUE}`;
    const r=await fetch(`https://cloudtasks.googleapis.com/v2/${parent}/tasks`,{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({task:{name:`${parent}/tasks/${name}`,dispatchDeadline:'240s',httpRequest:{httpMethod:'POST',url:process.env.WORKER_URL+'/scan',headers:{'Content-Type':'application/json'},oidcToken:{serviceAccountEmail:process.env.TASK_SERVICE_ACCOUNT,audience:process.env.WORKER_URL},body:Buffer.from(JSON.stringify({boardId:board.id,minutes})).toString('base64')}}})});
    if(!r.ok&&r.status!==409)throw Error(`Task dispatch failed: ${r.status}`);queued++;
  }return {queued};
}
async function scan(body){
  if(process.env.INGESTION_ENABLED!=='1')return {enabled:false};
  const board=boards.find(b=>b.id===body.boardId);if(!board)throw Error('Unknown board');
  const lease=await acquireBoard(db,board.id);if(!lease)return {busy:true};
  const day=new Date().toISOString().slice(0,10),usage=db.collection('background_usage').doc(day);
  const permitted=await db.runTransaction(async tx=>{const s=await tx.get(usage);const calls=s.data()?.calls||0;const units=s.data()?.estimatedInr||0;const cost=Math.max(.01,Number(process.env.SCAN_ESTIMATED_INR||.05));
    if(calls>=Number(process.env.DAILY_SCAN_LIMIT||2400)||units+cost>Number(process.env.DAILY_BACKGROUND_INR||60))return false;
    tx.set(usage,{calls:calls+1,estimatedInr:units+cost});return true;});
  if(!permitted){await lease.ref.set({leaseUntil:0,nextCheckAt:Date.now()+3600000,error:'Daily background budget reached'},{merge:true});return {budgetPaused:true};}
  const started=Date.now();
  try {
    const state=(await lease.ref.get()).data();
    const result=await fetchBoardJobs(board.atsProvider,board.atsSlug,{companyName:board.name,geoFilter:true});
    if(!result.ok||!result.complete)throw Error('Incomplete scan; previous records retained');
    const at=new Date().toISOString();const jobs=result.jobs.map(j=>toPublicJob(j,{company:board.name,startupId:board.startupId||null,employerType:board.employerType||'other',website:board.website||null,boardUrl:board.boardUrl||null,fetchedAt:at}));
    const minutes=safeProviders.has(board.atsProvider)?Math.max(15,body.minutes||120):Math.max(120,board.minPollMinutes||120);
    const outcome=await commitBoard(db,lease,board,jobs,at,{baseline:!state.baselineComplete,intervalMinutes:minutes});
    await lease.ref.set({durationMs:Date.now()-started},{merge:true});return {jobs:outcome.jobs.length};
  }catch(error){await db.runTransaction(async tx=>{const s=await tx.get(lease.ref);const old=s.data();if(old?.leaseToken!==lease.token)return;const failures=(old.failures||0)+1;
    tx.set(lease.ref,{leaseUntil:0,failures,error:String(error.message).slice(0,180),nextCheckAt:Date.now()+Math.min(86400000,Math.max(120*60000,60000*2**failures)),durationMs:Date.now()-started},{merge:true});});return {retained:true,error:'Source scan failed'};}
}
http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.writeHead(405);return res.end('{}');}
  try {let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw Error('Request too large');}
    const result=req.url==='/dispatch'?await dispatch():req.url==='/scan'?await scan(JSON.parse(raw||'{}')):null;
    res.writeHead(result?200:404);res.end(JSON.stringify(result||{}));
  }catch(error){console.error(error.message);res.writeHead(503);res.end('{"error":"Worker unavailable"}');}
}).listen(Number(process.env.PORT||8080));
