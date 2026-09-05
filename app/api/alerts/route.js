import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin.js';
import { readFilters } from '../../../lib/opportunities.js';
import { alertsReady,hash,sendOnce,escapeEmail } from '../../../lib/alerts.js';
import { signAlert } from '../../../lib/alert-tokens.js';
import { getSiteUrl } from '../../../lib/site-url.js';
export const dynamic='force-dynamic';
export async function POST(req){
  if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
  if(!alertsReady())return NextResponse.json({message:'Your search is saved locally. Email alerts are not available yet.'},{status:503});
  const text=await req.text();if(text.length>4096)return NextResponse.json({error:'Request too large'},{status:413});
  let body;try{body=JSON.parse(text);}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
  const email=String(body.email||'').trim().toLowerCase();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'Enter a valid email address'},{status:400});
  const filters=readFilters(new URLSearchParams(body.filters||{}));
  const frequency=body.frequency==='hourly'&&process.env.HOURLY_ALERTS_ENABLED==='1'?'hourly':'daily';
  const id=hash(email+JSON.stringify(filters));const db=await getAdminDb();if(!db)return NextResponse.json({error:'Subscriptions unavailable'},{status:503});
  const ref=db.collection('alert_subscriptions').doc(id);
  const allowed=await db.runTransaction(async tx=>{const snap=await tx.get(ref);const old=snap.data();if(old?.confirmationAt>Date.now()-3600000)return false;
    tx.set(ref,{email,filters,frequency,status:old?.status==='active'?'active':'pending',createdAt:old?.createdAt||new Date().toISOString(),confirmationAt:Date.now()},{merge:true});return true;});
  if(!allowed)return NextResponse.json({message:'If this address can receive alerts, a confirmation has already been requested. Check your inbox.'});
  const token=signAlert(id,'confirm',process.env.ALERT_TOKEN_SECRET);const url=`${getSiteUrl()}/alerts/manage?token=${token}`;
  const result=await sendOnce('confirm:'+id+':'+Math.floor(Date.now()/3600000),email,'Confirm your Hyderabad job alerts',`<h2>Confirm your saved search</h2><p>${escapeEmail(Object.values(filters).filter(Boolean).join(' · ')||'Hyderabad roles')}</p><p><a href="${escapeEmail(url)}">Review and confirm alerts</a></p><p>If you did not request this, ignore this email. Nothing is enabled until you confirm.</p>`,{control:true});
  return NextResponse.json({message:result.sent?'Check your email to confirm this search.':result.reason},{status:result.sent?200:503});
}
