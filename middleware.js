import { NextResponse } from 'next/server';
export function middleware(req){
  if(req.nextUrl.searchParams.has('startup')||req.nextUrl.searchParams.get('view')==='companies')return NextResponse.next();
  const existing=req.cookies.get('hyd-landing')?.value;
  const variant=['new','control'].includes(existing)?existing:(crypto.getRandomValues(new Uint8Array(1))[0]%2?'new':'control');
  const headers=new Headers(req.headers);headers.set('x-hyd-landing',variant);
  const res=NextResponse.next({request:{headers}});
  if(!existing)res.cookies.set('hyd-landing',variant,{httpOnly:true,sameSite:'lax',secure:req.nextUrl.protocol==='https:',maxAge:60*60*24*35,path:'/'});
  return res;
}
export const config={matcher:['/']};
