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
  const redirect=jobsRedirect(req);
  if(redirect)return redirect;
  // The homepage used to render the jobs explorer for ?view=jobs, which forced it
  // to read searchParams and render dynamically. /jobs is the canonical jobs page.
  if(req.nextUrl.pathname==='/' && req.nextUrl.searchParams.get('view')==='jobs'){
    const url=req.nextUrl.clone();
    url.pathname='/jobs';
    url.searchParams.delete('view');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config={matcher:['/','/jobs']};
