import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../../lib/firebaseAdmin.js';
import { withTimeout } from '../../../../../lib/build-phase.js';
import { recordId } from '../../../../../lib/board-store.js';
import { opportunityDataset } from '../../../../../lib/opportunity-store.js';
export const dynamic='force-dynamic';
export async function GET(req) {
  const id=new URL(req.url).searchParams.get('id');
  try {const data=await opportunityDataset();let job=data.jobs.find(j=>j.id===id);
    if(!job && id){const db=await getAdminDb();if(db){if(process.env.JOBS_V2_READS==='1')job=(await withTimeout(db.collection('jobs_v2').doc(recordId(id)).get(),4000,null))?.data();else job=(await withTimeout(db.collection('job_board').doc('ats_latest').get(),4000,null))?.data()?.jobs?.find(j=>j.id===id);}}
    return NextResponse.json(job?{job}:{error:'Listing no longer available'},{status:job?200:404});
  } catch {return NextResponse.json({error:'Could not load this role'},{status:503});}
}
