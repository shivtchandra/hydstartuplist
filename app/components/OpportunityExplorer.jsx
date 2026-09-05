'use client';
import ExploreModes from './ExploreModes.jsx';
import { useEffect,useMemo,useRef,useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname,useRouter,useSearchParams } from 'next/navigation';
import SiteNav from './SiteNav.jsx';
import { FILTER_KEYS,readFilters } from '../../lib/opportunities.js';
import { freshnessLabel } from '../../lib/job-lifecycle.js';
import { jobUrlId } from '../../lib/jobs-seo.js';
import { readShortlist,writeShortlist } from '../../lib/shortlist.js';
import { trackEvent } from '../../lib/engagement-client.js';
const Map=dynamic(()=>import('./OpportunityMap.jsx'),{ssr:false,loading:()=> <div className="op-map-status">Loading map…</div>});

function money(salary) {
  if(!salary)return 'Salary not disclosed';
  if(typeof salary==='string')return salary;
  const min=salary.min??salary.salary_min,max=salary.max??salary.salary_max;
  return min||max ? `${salary.currency||'INR'} ${Number(min||max).toLocaleString('en-IN')}${min&&max?'–'+Number(max).toLocaleString('en-IN'):''}` : 'Salary disclosed on listing';
}
function readable(key) {return ({intern:'Internship',junior:'Early career',mid:'Mid-level',senior:'Senior',lead:'Lead',manager:'Manager',unknown:'Not specified'})[key]||key;}

export default function OpportunityExplorer({initial,variant='new',savedOnly=false}) {
  const params=useSearchParams(),router=useRouter(),pathname=usePathname();
  const filters=useMemo(()=>readFilters(params),[params]);
  const [query,setQuery]=useState(filters.q),[data,setData]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [view,setView]=useState(savedOnly||pathname==='/jobs'?'list':'map'),[sheet,setSheet]=useState(false),[groups,setGroups]=useState([]),[mapVersion,setMapVersion]=useState('');
  const [detail,setDetail]=useState(null),[detailError,setDetailError]=useState(''),[newAvailable,setNewAvailable]=useState(false);
  const [shortlist,setShortlist]=useState({jobs:{},companies:[],searches:[]}),[storageReady,setStorageReady]=useState(false),[notice,setNotice]=useState('');
  const [compare,setCompare]=useState(false),[areaA,setAreaA]=useState(''),[areaB,setAreaB]=useState(''),[comparison,setComparison]=useState(null);
  const [emailOpen,setEmailOpen]=useState(false),[email,setEmail]=useState(''),[emailState,setEmailState]=useState(''),[savedSearch,setSavedSearch]=useState(null);
  const [lastVisit,setLastVisit]=useState(null),[refresh,setRefresh]=useState(0);
  const emailRef=useRef(null),sheetRef=useRef(null),abortDetail=useRef(null),initialRequest=useRef(true),detailRef=useRef(null);
  const filterQuery=useMemo(()=>{const p=new URLSearchParams();for(const k of FILTER_KEYS)if(filters[k])p.set(k,filters[k]);return p.toString();},[filters]);
  function change(patch) {const p=new URLSearchParams(params.toString());for(const [key,value] of Object.entries(patch)){if(value)p.set(key,value);else p.delete(key);}p.delete('job');router.replace(`${pathname}?${p}`,{scroll:false});}
  useEffect(()=>{setQuery(filters.q);},[filters.q]);
  useEffect(()=>{if(query===filters.q)return;const t=setTimeout(()=>change({q:query}),300);return()=>clearTimeout(t);},[query,filters.q]);
  useEffect(()=>{
    setShortlist(readShortlist());setStorageReady(true);
    try{setLastVisit(localStorage.getItem('hyd-last-visit'));localStorage.setItem('hyd-last-visit',new Date().toISOString());}catch{}
    trackEvent(pathname==='/'?'landing':'results',variant);
    const update=()=>setShortlist(readShortlist());window.addEventListener('storage',update);window.addEventListener('hyd-shortlist',update);
    return()=>{window.removeEventListener('storage',update);window.removeEventListener('hyd-shortlist',update);};
  },[variant]);
  useEffect(()=>{
    const c=new AbortController();let alive=true;
    if(initialRequest.current && !filterQuery && initial?.jobs && refresh===0){initialRequest.current=false;return()=>c.abort();}
    initialRequest.current=false;setBusy(true);setError('');
    fetch(`/api/v2/jobs?${filterQuery}`,{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(alive){setData(d);setNewAvailable(false);trackEvent('results',variant);}})
      .catch(e=>{if(e.name!=='AbortError')setError('Could not refresh jobs. Your previous results are still here.');}).finally(()=>{if(alive)setBusy(false);});
    return()=>{alive=false;c.abort();};
  },[filterQuery,refresh]);
  useEffect(()=>{
    const c=new AbortController();fetch(`/api/v2/map?${filterQuery}`,{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{setGroups(d.companies);setMapVersion(d.version);}).catch(()=>{});return()=>c.abort();
  },[filterQuery,refresh]);
  useEffect(()=>{
    const c=new AbortController();const t=setInterval(()=>{if(document.visibilityState!=='visible')return;fetch(`/api/v2/jobs?${filterQuery}`,{signal:c.signal}).then(r=>r.ok?r.json():null).then(d=>{if(d?.version&&d.version!==data?.version)setNewAvailable(true);}).catch(()=>{});},60000);
    return()=>{clearInterval(t);c.abort();};
  },[filterQuery,data?.version]);
  useEffect(()=>{
    const id=params.get('job');if(!id){setDetail(null);return;}
    abortDetail.current?.abort();const c=new AbortController();abortDetail.current=c;setDetailError('');
    setDetail(data?.jobs?.find(j=>j.id===id)||shortlist.jobs[id]?.job||{id,title:'Loading role…'});
    fetch('/api/v2/jobs/detail?id='+encodeURIComponent(id),{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>setDetail(d.job)).catch(e=>{if(e?.name!=='AbortError')setDetailError('This role could not be loaded. Try its original listing or return to results.');});
    trackEvent('detail',variant);return()=>c.abort();
  },[params.get('job')]);
  useEffect(()=>{if(sheet)sheetRef.current?.showModal();else sheetRef.current?.close();},[sheet]);
  useEffect(()=>{if(emailOpen)emailRef.current?.showModal();else emailRef.current?.close();},[emailOpen]);
  useEffect(()=>{
    if(!storageReady)return;let cancelled=false;
    const stored=readShortlist();
    const ids=Object.keys(stored.jobs).slice(0,100);if(!ids.length)return;
    fetch('/api/v2/jobs/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})}).then(r=>r.ok?r.json():{jobs:[]}).then(({jobs=[]})=>jobs.map(job=>({job}))).catch(()=>[]).then(results=>{
      if(cancelled)return;let changed=false;for(const result of results){if(result?.job && stored.jobs[result.job.id] && result.job.status==='closed'){stored.jobs[result.job.id].job={...stored.jobs[result.job.id].job,...result.job};changed=true;}}
      if(changed)persist(stored);
    });return()=>{cancelled=true;};
  },[storageReady]);
  useEffect(()=>{if(detail)detailRef.current?.focus();},[detail?.id]);
  function persist(next){if(writeShortlist(next)){setShortlist(next);setNotice('');}else setNotice('This browser could not save locally. Allow site storage and try again.');}
  function save(job,status='saved'){persist({...shortlist,jobs:{...shortlist.jobs,[job.id]:{job,status,at:new Date().toISOString()}}});if(status==='saved')trackEvent('save',variant);}
  function follow(company){
    const following=!shortlist.companies.includes(company);
    persist({...shortlist,companies:following?[...shortlist.companies,company]:shortlist.companies.filter(c=>c!==company)});
    try {let device=localStorage.getItem('hyd-follow-device');if(!device){device=crypto.randomUUID();localStorage.setItem('hyd-follow-device',device);}
      fetch('/api/follows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device,company,follow:following})}).catch(()=>{});
    }catch{}
  }
  function openJob(job){const p=new URLSearchParams(params.toString());p.set('job',job.id);router.push(`${pathname}?${p}`,{scroll:false});}
  function closeJob(){const p=new URLSearchParams(params.toString());p.delete('job');router.replace(`${pathname}?${p}`,{scroll:false});}
  async function loadMore(){if(!data.nextCursor)return;setBusy(true);try{const r=await fetch(`/api/v2/jobs?${filterQuery}&cursor=${encodeURIComponent(data.nextCursor)}`);if(!r.ok)throw Error();const d=await r.json();if(d.reset){setNewAvailable(true);return;}setData(prev=>({...d,jobs:[...prev.jobs,...d.jobs]}));}catch{setError('Could not load more roles. Try again.');}finally{setBusy(false);}}
  function saveSearch(){const entry={name:filters.q||filters.role||'Hyderabad roles',filters:{...filters},at:new Date().toISOString()};persist({...shortlist,searches:[entry,...shortlist.searches.filter(s=>JSON.stringify(s.filters)!==JSON.stringify(entry.filters))].slice(0,20)});setSavedSearch(entry);setEmailOpen(true);}
  async function subscribe(e){e.preventDefault();setEmailState('Sending confirmation…');try{const r=await fetch('/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,filters:savedSearch?.filters||filters,frequency:'daily'})});const d=await r.json();setEmailState(d.message||d.error||'Check your email.');}catch{setEmailState('Could not subscribe. Your search is still saved on this device.');}}
  useEffect(()=>{
    if(!compare||!areaA||!areaB)return;const c=new AbortController();setComparison(null);
    Promise.all([areaA,areaB].map(area=>{const p=new URLSearchParams(filterQuery);p.set('area',area);return fetch('/api/v2/map?'+p,{signal:c.signal}).then(r=>r.json());})).then(setComparison).catch(()=>{});return()=>c.abort();
  },[compare,areaA,areaB,filterQuery]);
  const visible=savedOnly?Object.values(shortlist.jobs).filter(s=>s.status!=='hidden').map(s=>s.job):(data?.jobs||[]).filter(j=>shortlist.jobs[j.id]?.status!=='hidden');
  const recent=lastVisit?(data?.jobs||[]).filter(j=>j.firstSeenAt&&j.firstSeenAt>lastVisit).length:0;
  const facet=data?.facets||{};
  return <><SiteNav active={savedOnly?'saved':pathname==='/jobs'?'jobs':''}/><main className={`op-shell${pathname==='/'?' op-map-home':''}`} id="main-content">
    {!savedOnly&&<ExploreModes active="jobs" />}
    <header className="op-heading"><div><p className="op-eyebrow">MAPPING HYD / OPPORTUNITIES</p><h1>{savedOnly?'Your next moves.':'Find your next role in Hyderabad.'}</h1><p>{savedOnly?'Your shortlist stays on this device.':'Real roles. Local employers. A clearer next move.'}</p></div><Link className="op-company-link" href="/?view=companies">Explore all companies ↗</Link></header>
    {!savedOnly&&<><div className="op-search"><label className="op-query"><span className="sr-only">Role, skill, or company</span><input placeholder="Role, skill, or company" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Area" value={filters.area} onChange={e=>change({area:e.target.value})}><option value="">All Hyderabad</option>{facet.areas?.map(a=><option key={a}>{a}</option>)}</select><button onClick={()=>setSheet(true)}>Filters{FILTER_KEYS.filter(k=>!['q','sort','area'].includes(k)&&filters[k]).length?' •':''}</button></div>
      <div className="op-shortcuts">{data?.shortcuts?.today&&<button onClick={()=>change({when:'discovered'})}>Discovered today ↗</button>}{data?.shortcuts?.early&&<button onClick={()=>change({level:'early'})}>Early career ↗</button>}<button onClick={()=>{setView('map');}}>Hiring by area ↗</button><button onClick={()=>setCompare(!compare)}>Compare areas</button></div></>}
    {storageReady&&recent>0&&!savedOnly&&<p className="op-return">Since your last visit: {recent} newly discovered roles in these results.</p>}
    {shortlist.companies.length>0&&<div className="op-follows"><span>Following</span>{shortlist.companies.map(c=><button key={c} onClick={()=>change({company:c})}>{c}</button>)}</div>}
    {savedOnly&&shortlist.searches.length>0&&<section className="op-saved-searches"><h2>Saved searches</h2>{shortlist.searches.map((s,i)=><Link key={i} href={'/jobs?'+new URLSearchParams(Object.entries(s.filters).filter(([,v])=>v))}>{s.name} ↗</Link>)}</section>}
    {compare&&<section className="op-compare"><h2>Compare hiring in two areas</h2><p>Using your current role filters. These are office areas, not commute estimates.</p><div>{[[areaA,setAreaA],[areaB,setAreaB]].map(([value,set],i)=><select key={i} aria-label={`Comparison area ${i+1}`} value={value} onChange={e=>set(e.target.value)}><option value="">Choose area</option>{facet.areas?.map(a=><option key={a}>{a}</option>)}</select>)}</div>{comparison&&<div className="op-comparison">{comparison.map((g,i)=><article key={i}><h3>{[areaA,areaB][i]}</h3><strong>{g.total??'—'} roles</strong><p>{g.companies?.length??0} hiring employers</p>{g.work&&<p>{g.work.hybrid||0} hybrid · {g.work.remote||0} remote · {g.work.unknown||0} unspecified</p>}</article>)}</div>}</section>}
    <div className="op-results-bar"><span role="status">{savedOnly?visible.length:(data?.total??'—')} roles{!savedOnly&&data?.employers!=null?` · ${data.employers} employers`:''}{busy?' · Updating…':''}</span><div>{!savedOnly&&<button onClick={saveSearch}>Save search</button>}<div className="op-view"><button aria-pressed={view==='list'} onClick={()=>setView('list')}>List</button><button aria-pressed={view==='map'} onClick={()=>setView('map')}>Map</button></div></div></div>
    {filterQuery&&!savedOnly&&<div className="op-active">{Object.entries(filters).filter(([,v])=>v).map(([k,v])=><button key={k} onClick={()=>change({[k]:''})}>{k}: {v} ×</button>)}<button onClick={()=>router.replace(pathname==='/'?'/?view=jobs':pathname,{scroll:false})}>Clear all</button></div>}
    {newAvailable&&<button className="op-refresh" onClick={()=>setRefresh(v=>v+1)}>Updated matches available — refresh results</button>}
    {(error||notice||data?.stale)&&<p className="op-warning" role="status">{error||notice||'Showing cached results. Source checks are temporarily delayed.'}</p>}
    <div className={`op-workspace op-view-${view}${detail?' op-has-detail':''}`}>
      <section className="op-results" aria-label="Job results">{visible.map(job=><article className="op-job" key={job.id}>
        <div className="op-job-top"><a className="op-job-title" href={'/jobs/'+jobUrlId(job.id)} onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();openJob(job);}}}>{job.title}</a><button className="op-save" aria-label={`Save ${job.title}`} aria-pressed={!!shortlist.jobs[job.id]} onClick={()=>save(job)}>{shortlist.jobs[job.id]?'Saved':'Save'}</button></div>
        <p className="op-employer">{job.company} <span>· {job.area||job.location}</span></p><p className="op-facts">{job.work&&job.work!=='unknown'?job.work:'Work arrangement unspecified'} · {readable(job.level)}{job.levelInferred&&job.level!=='unknown'?' (inferred)':''}</p>
        <p className="op-pay">{money(job.salary)}</p><div className="op-job-bottom"><span>{job.status==='closed'?'Closed':freshnessLabel(job)}</span>{savedOnly?<select aria-label={`Status for ${job.title}`} value={shortlist.jobs[job.id]?.status||'saved'} onChange={e=>save(job,e.target.value)}><option value="saved">Saved</option><option value="applied">Applied</option><option value="hidden">Hidden</option></select>:<button onClick={()=>save(job,'hidden')}>Hide</button>}</div>
      </article>)}{!visible.length&&<div className="op-empty"><h2>{savedOnly?'Start your shortlist':'No matching roles right now'}</h2><p>{savedOnly?'Save a role while exploring. Find it here when you are ready.':'Try fewer filters, or save this search for later.'}</p><Link href="/jobs">Browse roles ↗</Link>{!savedOnly&&<button onClick={saveSearch}>Save this search</button>}</div>}
      {!savedOnly&&data?.nextCursor&&<button className="op-load" disabled={busy} onClick={loadMore}>Load more roles</button>}</section>
      <aside className="op-context">{detail?<section className="op-detail" ref={detailRef} tabIndex={-1} aria-label="Selected role"><button onClick={closeJob}>← Back to results</button><p className="op-eyebrow">{detail.company}</p><h2>{detail.title}</h2><p>{detail.area||detail.location} · {freshnessLabel(detail)}</p><p>{money(detail.salary)}</p>{detailError&&<p role="status">{detailError}</p>}<div className="op-detail-actions">{detail.applyUrl&&detail.status!=='closed'&&<a className="op-primary" href={detail.applyUrl} target="_blank" rel="noopener noreferrer" onClick={()=>trackEvent('apply',variant)}>{detail.source==='adzuna'?'View listing on Adzuna':'Apply on employer site'} ↗</a>}<button onClick={()=>save(detail)}>Save role</button><button onClick={()=>follow(detail.company)}>{shortlist.companies.includes(detail.company)?'Unfollow company':'Follow company'}</button></div>{detail.status==='closed'&&<p>This role has closed. <Link href={'/jobs?q='+encodeURIComponent(detail.role||detail.title)}>Find similar active roles</Link></p>}<h3>About the role</h3><p className="op-description">{String(detail.description||'Read the complete requirements on the original listing.').replace(/<[^>]*>/g,' ')}</p><Link href={'/jobs/'+jobUrlId(detail.id)}>Open permanent job page ↗</Link></section>:<Map companies={mapVersion===data?.version?groups:[]} onSelect={c=>{change(c.isArea?{area:c.area,company:''}:{company:c.name});trackEvent(c.isArea?'results':'company',variant);setView('list');}} onBounds={b=>{change({bounds:[b.south,b.north,b.west,b.east].join(',')});setNotice('Searching this map area. Roles without a verified location remain included.');setView('list');}}/>}</aside>
    </div>
    <dialog className="op-dialog" ref={sheetRef} onCancel={()=>setSheet(false)} onClick={e=>{if(e.target===sheetRef.current)setSheet(false);}}><header><h2>Find your fit</h2><button autoFocus onClick={()=>setSheet(false)} aria-label="Close filters">×</button></header><div className="op-filter-grid">
      {[['role','Role',facet.roles||[]],['level','Experience',['early',...(facet.levels||[])]],['work','Work arrangement',['remote','hybrid','onsite','unknown']],['type','Employer type',facet.types||[]],['when','Freshness',['discovered','today','week','month']],['sort','Sort',['newest','company']]].map(([key,label,options])=><label key={key}>{label}<select value={filters[key]} onChange={e=>change({[key]:e.target.value})}><option value="">Any</option>{options.map(v=><option key={v} value={v}>{readable(v)}</option>)}</select></label>)}<label><input type="checkbox" checked={filters.salary==='yes'} onChange={e=>change({salary:e.target.checked?'yes':''})}/> Salary disclosed</label></div><p>Unknown experience and work arrangements are available as explicit filter options.</p><button className="op-primary" onClick={()=>setSheet(false)}>Show {data?.total??''} roles</button></dialog>
    <dialog ref={emailRef} className="op-dialog op-alert-box" onCancel={()=>setEmailOpen(false)} aria-label="Saved search alerts"><button className="op-dismiss" onClick={()=>setEmailOpen(false)} aria-label="Close email signup">×</button><h2>Search saved on this device.</h2><p>Get a daily email for: <strong>{Object.values(savedSearch?.filters||filters).filter(Boolean).join(' · ')||'all Hyderabad roles'}</strong>. Confirm your address to start. No email is sent when there are no new matches.</p><form onSubmit={subscribe}><input type="email" aria-label="Email address" placeholder="you@example.com" required value={email} onChange={e=>setEmail(e.target.value)}/><button className="op-primary">Send confirmation</button></form><p role="status">{emailState}</p></dialog>
    <footer className="op-footer">Explore Hyderabad <Link href="/?view=companies">Companies</Link><Link href="/gccs">GCCs</Link><Link href="/more">News, insights & more</Link><span>Source dates and coverage vary. Saved items stay on this device.</span></footer>
  </main></>;
}
