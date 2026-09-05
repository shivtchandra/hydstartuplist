import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin.js';
export const dynamic='force-dynamic';
export async function GET(req){
  if(!process.env.ADMIN_PASSCODE||req.headers.get('x-admin-passcode')!==process.env.ADMIN_PASSCODE)return new NextResponse(null,{status:401});
  const db=await getAdminDb();if(!db)return NextResponse.json({boards:[],enabled:false});
  const [boards,usage,sessions]=await Promise.all([db.collection('board_status').get(),db.collection('background_usage').doc(new Date().toISOString().slice(0,10)).get(),db.collection('engagement_sessions').where('started','>=',Date.now()-28*86400000).get()]);
  const funnel={};for(const doc of sessions.docs){const s=doc.data();if(s.events?.landing===undefined)continue;const key=[s.variant,s.device,s.source].join('/');const f=funnel[key]||{landings:0,useful:0,apply:0};f.landings++;if(['detail','save','apply','company'].some(e=>s.events[e]!==undefined))f.useful++;if(s.events.apply!==undefined)f.apply++;funnel[key]=f;}
  return NextResponse.json({boards:boards.docs.map(d=>{const b=d.data();return {boardId:b.boardId,lastSuccessAt:b.lastSuccessAt||null,overdue:!b.nextCheckAt||b.nextCheckAt<Date.now(),failures:b.failures||0,error:b.error||null,activeJobs:b.activeJobs||0,changes:b.changes||0,durationMs:b.durationMs||null};}),usage:usage.data()||{},funnel});
}
