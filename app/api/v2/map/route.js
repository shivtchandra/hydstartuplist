import { NextResponse } from 'next/server';
import { readFilters,filterJobs,mapGroups } from '../../../../lib/opportunities.js';
import { opportunityDataset } from '../../../../lib/opportunity-store.js';
export const dynamic='force-dynamic';
export async function GET(req) {
  try {const data=await opportunityDataset();const jobs=filterJobs(data.jobs,readFilters(new URL(req.url).searchParams));
    return NextResponse.json({companies:mapGroups(jobs),total:jobs.length,version:data.version,stale:data.stale,work:jobs.reduce((out,j)=>{out[j.work]=(out[j.work]||0)+1;return out;},{})});
  } catch {return NextResponse.json({error:'Map data unavailable'},{status:503});}
}
