import {NextResponse} from 'next/server';
import {getAdminDb} from '../../../lib/firebaseAdmin.js';
import {recordId} from '../../../lib/board-store.js';
export const dynamic='force-dynamic';
export async function POST(req){
  if(req.headers.get('origin')!==new URL(req.url).origin)return new NextResponse(null,{status:403});
  const text=await req.text();if(text.length>1024)return new NextResponse(null,{status:413});
  let input;try{input=JSON.parse(text);}catch{return new NextResponse(null,{status:400});}
  if(!/^[a-f0-9-]{36}$/.test(input.device||'')||typeof input.company!=='string'||input.company.length>160||typeof input.follow!=='boolean')return new NextResponse(null,{status:400});
  const db=await getAdminDb();if(!db)return new NextResponse(null,{status:204});
  const id=recordId(input.company),ref=db.collection('follow_memberships').doc(recordId(input.device+id)),company=db.collection('company_demand').doc(id),device=db.collection('follow_devices').doc(input.device);
  await db.runTransaction(async tx=>{const [r,c,d]=await Promise.all([tx.get(ref),tx.get(company),tx.get(device)]);const previous=r.data()?.active===true;
    if(previous===input.follow)return;if(input.follow&&(d.data()?.count||0)>=100)return;
    const delta=input.follow?1:-1;tx.set(ref,{active:input.follow});tx.set(company,{count:Math.max(0,(c.data()?.count||0)+delta)});tx.set(device,{count:Math.max(0,(d.data()?.count||0)+delta)});
  });return new NextResponse(null,{status:204});
}
