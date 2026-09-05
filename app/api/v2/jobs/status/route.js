import { NextResponse } from 'next/server';
import { opportunityDataset } from '../../../../../lib/opportunity-store.js';
import { getAdminDb } from '../../../../../lib/firebaseAdmin.js';
import { withTimeout } from '../../../../../lib/build-phase.js';
import { recordId } from '../../../../../lib/board-store.js';
export const dynamic='force-dynamic';
export async function POST(req) {
  const raw=await req.text();
  if(raw.length>24000)return new NextResponse(null,{status:413});
  let ids;try{ids=JSON.parse(raw).ids;}catch{return new NextResponse(null,{status:400});}
  if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||id.length>200))return new NextResponse(null,{status:400});
  try {
    const data=await opportunityDataset(),wanted=new Set(ids);
    const found=new Map(data.jobs.filter(j=>wanted.has(j.id)).map(j=>[j.id,j]));
    const missing=ids.filter(id=>!found.has(id));
    if(missing.length){const db=await getAdminDb();if(db){
      const records=process.env.JOBS_V2_READS==='1'
        ?(await withTimeout(db.getAll(...missing.map(id=>db.collection('jobs_v2').doc(recordId(id)))),4000,[])).map(d=>d.data())
        :(await withTimeout(db.collection('job_board').doc('ats_latest').get(),4000,null))?.data()?.jobs||[];
      for(const job of records)if(job&&wanted.has(job.id))found.set(job.id,job);
    }}
    return NextResponse.json({jobs:[...found.values()].map(({id,status})=>({id,status})),stale:data.stale});
  }catch{return NextResponse.json({error:'Status temporarily unavailable'},{status:503});}
}
