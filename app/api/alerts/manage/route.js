import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin.js';
import { verifyAlert } from '../../../../lib/alert-tokens.js';
export const dynamic='force-dynamic';
export async function POST(req){
  if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
  let body;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
  const payload=verifyAlert(String(body.token||''),process.env.ALERT_TOKEN_SECRET||'');
  if(!process.env.ALERT_TOKEN_SECRET||!payload)return NextResponse.json({error:'This link is invalid or has expired.'},{status:400});
  const db=await getAdminDb();if(!db)return NextResponse.json({error:'Preferences unavailable'},{status:503});
  const ref=db.collection('alert_subscriptions').doc(payload.id);const snap=await ref.get();if(!snap.exists)return NextResponse.json({error:'Subscription not found'},{status:404});
  const previous=snap.data();
  if(payload.action==='confirm' && body.action!=='confirm')return NextResponse.json({error:'Use the preferences link in a job digest to manage an active subscription.'},{status:400});
  if(payload.action==='confirm') {
    if(previous.status!=='active')await ref.set({status:'active',confirmedAt:new Date().toISOString(),lastCheckedAt:new Date().toISOString()},{merge:true});
    return NextResponse.json({message:'Confirmed. New matching roles will arrive in your daily digest.'});
  }
  if(body.action==='unsubscribe'){await ref.set({status:'unsubscribed'},{merge:true});return NextResponse.json({message:'You have been unsubscribed from this search.'});}
  if(body.action==='daily'){await ref.set({frequency:'daily'},{merge:true});return NextResponse.json({message:'Frequency changed to daily.'});}
  return NextResponse.json({error:'Choose a valid action'},{status:400});
}
