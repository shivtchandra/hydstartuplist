'use client';
export function trackEvent(event,variant='new') {
  try {
    let s=JSON.parse(sessionStorage.getItem('hyd-session')||'null');
    if(!s||Date.now()-s.started>1800000) {s={id:crypto.randomUUID(),started:Date.now()};sessionStorage.setItem('hyd-session',JSON.stringify(s));}
    const ref=document.referrer;const source=!ref?'direct':/google|bing|duckduckgo/.test(ref)?'search':/linkedin|instagram|facebook|t.co/.test(ref)?'social':'other';
    fetch('/api/events',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({event,session:s.id,variant,device:innerWidth<768?'phone':innerWidth<1024?'tablet':'desktop',source})}).catch(()=>{});
  }catch{}
}
