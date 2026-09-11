import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin.js';
import { opportunityDataset } from '../../../../lib/opportunity-store.js';
import { matchesJob } from '../../../../lib/opportunities.js';
import { alertsReady,hash,sendOnce,escapeEmail,manageUrl } from '../../../../lib/alerts.js';
import { getSiteUrl } from '../../../../lib/site-url.js';
import { jobUrlId } from '../../../../lib/jobs-seo.js';
export const dynamic='force-dynamic';
export const maxDuration = 20;
export async function GET(req){
  if(!process.env.CRON_SECRET||req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return new NextResponse(null,{status:401});
  if(!alertsReady())return NextResponse.json({enabled:false});
  const db=await getAdminDb();const data=await opportunityDataset();if(!db||data.stale)return NextResponse.json({error:'Fresh data unavailable'},{status:503});
  const snap=await db.collection('alert_subscriptions').where('status','==','active').get();let sent=0;const started=Date.now();
  for(const doc of snap.docs){if(Date.now()-started>40000)break;const sub=doc.data();
    const now=Date.now(),istHour=new Date(now+19800000).getUTCHours();
    if(sub.frequency!=='hourly'&&istHour!==8)continue;
    const slot=sub.frequency==='hourly'?new Date().toISOString().slice(0,13):new Date(now+19800000).toISOString().slice(0,10);
    if(sub.lastSlot===slot)continue;
    const jobs=data.jobs.filter(j=>j.firstSeenAt && j.firstSeenAt>(sub.lastCheckedAt||sub.confirmedAt) && matchesJob(j,sub.filters));
    if(!jobs.length){await doc.ref.set({lastSlot:slot,lastCheckedAt:new Date(now).toISOString()},{merge:true});continue;}
    const html=`<h2>New matches for your Hyderabad search</h2><p>${escapeEmail(Object.values(sub.filters).filter(Boolean).join(' · ')||'All Hyderabad roles')}</p><ul>${jobs.slice(0,30).map(j=>`<li><a href="${getSiteUrl()}/jobs/${jobUrlId(j.id)}">${escapeEmail(j.title)} — ${escapeEmail(j.company)}</a><p>${escapeEmail(j.area)} · Matches your saved search</p></li>`).join('')}</ul><p><a href="${getSiteUrl()}/jobs?${escapeEmail(new URLSearchParams(sub.filters).toString())}">View all matches</a></p><p><a href="${escapeEmail(manageUrl(doc.id))}">Preferences or unsubscribe</a></p>`;
    const result=await sendOnce(`digest:${doc.id}:${slot}`,sub.email,`${jobs.length} new Hyderabad role${jobs.length===1?'':'s'}`,html,{checkpoint:new Date(now).toISOString()});
    if(result.sent){sent++;await doc.ref.set({lastSlot:slot,lastCheckedAt:result.checkpoint||sub.lastCheckedAt||sub.confirmedAt},{merge:true});}
  }
  return NextResponse.json({sent});
}
