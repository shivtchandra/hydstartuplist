import { NextResponse } from 'next/server';
import { readFilters } from '../../../../lib/opportunities.js';
import { searchOpportunities } from '../../../../lib/opportunity-store.js';
export const dynamic='force-dynamic';
export async function GET(req) {
  try {
    const p=new URL(req.url).searchParams;
    const data=await searchOpportunities(readFilters(p),p.get('cursor')||'');
    return NextResponse.json(data,{headers:{'Cache-Control':'public, max-age=15, stale-while-revalidate=30'}});
  } catch(err) {return NextResponse.json({error:err.message==='Invalid cursor'?err.message:'Jobs temporarily unavailable'}, {status:err.message==='Invalid cursor'?400:503});}
}
