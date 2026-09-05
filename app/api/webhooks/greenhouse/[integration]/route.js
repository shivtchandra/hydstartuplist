import { NextResponse } from 'next/server';
import { createHmac,timingSafeEqual } from 'node:crypto';
import { getAdminDb } from '../../../../../lib/firebaseAdmin.js';
import { enqueueBoard } from '../../../../../lib/enqueue-board.js';
export const dynamic='force-dynamic';
export async function POST(req,{params}) {
  const db=await getAdminDb();if(!db)return new NextResponse(null,{status:503});
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(params.integration))return new NextResponse(null,{status:400});
  const integration=(await db.collection('ats_integrations').doc(params.integration).get()).data();
  if(!integration?.enabled||!integration.secret||!integration.boardId)return new NextResponse(null,{status:404});
  const raw=await req.text();if(raw.length>100000)return new NextResponse(null,{status:413});
  const signature=(req.headers.get('signature')||'').replace(/^sha256\s+/,'');
  const expected=createHmac('sha256',integration.secret).update(raw).digest();const actual=Buffer.from(signature,'hex');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return new NextResponse(null,{status:401});
  let body;try{body=JSON.parse(raw);}catch{return new NextResponse(null,{status:400});}
  if(body.action==='ping')return NextResponse.json({ok:true});
  if(!['job_post_created','job_post_updated','job_post_deleted'].includes(body.action))return new NextResponse(null,{status:204});
  const id=req.headers.get('greenhouse-event-id');if(!id)return new NextResponse(null,{status:400});
  // Store no webhook payload: only request a fresh public board scan.
  try{await enqueueBoard(integration.boardId,id);return NextResponse.json({queued:true});}catch{return new NextResponse(null,{status:503});}
}
