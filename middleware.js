import { NextResponse } from 'next/server';
import { jobUrlId } from './lib/jobs-seo.js';

// Handled here instead of in app/jobs/page.jsx: a page component that reads
// searchParams forces the whole route into per-request dynamic rendering,
// which silently ignored `revalidate` and made /jobs a full SSR hit on every
// request (Fluid CPU / ISR Writes culprit). Middleware can redirect before
// the cached response is served without touching the route's cacheability.
function jobsRedirect(req){
  const job=req.nextUrl.searchParams.get('job');
  if(!job)return null;
  return NextResponse.redirect(new URL(`/jobs/${jobUrlId(job)}`,req.url));
}

export function middleware(req){
  if(req.nextUrl.pathname==='/jobs'){
    const redirect=jobsRedirect(req);
    if(redirect)return redirect;
    return NextResponse.next();
  }
  if(req.nextUrl.searchParams.has('startup')||req.nextUrl.searchParams.get('view')==='companies')return NextResponse.next();
  const existing=req.cookies.get('hyd-landing')?.value;
  const variant=['new','control'].includes(existing)?existing:(crypto.getRandomValues(new Uint8Array(1))[0]%2?'new':'control');
  const headers=new Headers(req.headers);headers.set('x-hyd-landing',variant);
  const res=NextResponse.next({request:{headers}});
  if(!existing)res.cookies.set('hyd-landing',variant,{httpOnly:true,sameSite:'lax',secure:req.nextUrl.protocol==='https:',maxAge:60*60*24*35,path:'/'});
  return res;
}
export const config={matcher:['/','/jobs']};
