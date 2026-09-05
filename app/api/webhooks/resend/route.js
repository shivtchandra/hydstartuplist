import { NextResponse } from 'next/server';
import { createHmac,timingSafeEqual } from 'node:crypto';
import { getAdminDb } from '../../../../lib/firebaseAdmin.js';
import { hash } from '../../../../lib/alerts.js';
export const dynamic='force-dynamic';
export async function POST(req){
  const secret=process.env.RESEND_WEBHOOK_SECRET;if(!secret)return new NextResponse(null,{status:503});
  const raw=await req.text();if(raw.length>100000)return new NextResponse(null,{status:413});
  const id=req.headers.get('svix-id'),time=req.headers.get('svix-timestamp');
  if(!id||!time||Math.abs(Date.now()/1000-Number(time))>300)return new NextResponse(null,{status:401});
  const expected=createHmac('sha256',Buffer.from(secret.replace(/^whsec_/,''),'base64')).update(`${id}.${time}.${raw}`).digest();
  const valid=(req.headers.get('svix-signature')||'').split(' ').some(sig=>{try{const [v,s]=sig.split(',');const got=Buffer.from(s||'','base64');return v==='v1'&&got.length===expected.length&&timingSafeEqual(got,expected);}catch{return false;}});
  if(!valid)return new NextResponse(null,{status:401});
  let event;try{event=JSON.parse(raw);}catch{return new NextResponse(null,{status:400});}
  if(!['email.bounced','email.complained'].includes(event.type))return new NextResponse(null,{status:204});
  const db=await getAdminDb();if(!db)return new NextResponse(null,{status:503});
  for(const email of event.data?.to||[]){await db.collection('email_suppressions').doc(hash(String(email).toLowerCase())).set({reason:event.type,at:new Date().toISOString()});}
  return new NextResponse(null,{status:204});
}
