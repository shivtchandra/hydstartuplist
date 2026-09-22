'use client';

import ExploreModes from './ExploreModes.jsx';
import { useEffect,useMemo,useRef,useState,startTransition } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname,useRouter,useSearchParams } from 'next/navigation';
import SiteNav from './SiteNav.jsx';
import MobileTabBar from './MobileTabBar.jsx';
import StartupLogo from './StartupLogo.jsx';
import { FILTER_KEYS,readFilters } from '../../lib/opportunities.js';
import { freshnessLabel } from '../../lib/job-lifecycle.js';
import { jobExperienceDisplay } from '../../lib/job-facets.js';
import { jobUrlId } from '../../lib/jobs-seo.js';
import { cleanJobDescriptionHtml } from '../../lib/job-content.js';
import { domainOf } from '../../lib/startupUi.js';
import { readShortlist,writeShortlist } from '../../lib/shortlist.js';
import { pushShortlistToCloud, useAuthUser } from '../../lib/auth-client.js';
import { trackEvent } from '../../lib/engagement-client.js';
const Map=dynamic(()=>import('./OpportunityMap.jsx'),{ssr:false,loading:()=> <div className="op-map-status">Loading map…</div>});

function money(salary) {
  if(!salary) return 'Competitive / As per industry';
  if(typeof salary==='string') return salary;
  const min=salary.min??salary.salary_min,max=salary.max??salary.salary_max;
  const curr = salary.currency || 'INR';
  return min||max ? `${curr} ${Number(min||max).toLocaleString('en-IN')}${min&&max?' – '+Number(max).toLocaleString('en-IN'):''}` : 'Disclosed on application';
}

function formatSalaryPill(salary) {
  if (!salary) return null;
  const min = salary.min ?? salary.salary_min;
  const max = salary.max ?? salary.salary_max;
  if (!min && !max) return null;
  const currency = salary.currency || 'INR';
  const fmt = (n) => {
    if (n >= 100000) {
      const l = n / 100000;
      return `${currency === 'INR' ? '₹' : currency + ' '}${Number(l.toFixed(1)).toString()}L`;
    }
    return `${currency === 'INR' ? '₹' : currency + ' '}${Number(n).toLocaleString('en-IN')}`;
  };
  if (min && max) {
    if (min === max) return fmt(min);
    return `${fmt(min)}–${fmt(max)}`;
  }
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
}
// The `intern` band also holds freshers, trainees and entry-level hires, so labelling it
// "Internship" tells a job seeker something untrue about a full-time role.
function readable(key) {return ({intern:'Intern & fresher',junior:'Early career',mid:'Mid-level',senior:'Senior',lead:'Lead',manager:'Manager',unknown:'Not specified',discovered:'New today',today:'Posted today',week:'This week',month:'This month',newest:'Newest',company:'Company',remote:'Remote',hybrid:'Hybrid',onsite:'On-site',early:'Early career'})[key]||key;}

/** Themed filter dropdown — replaces native <select> (avoids stuck focus rings). */
function OpFilterSelect({ label, value, onChange, options, emptyLabel = 'Any', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.blur();
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected ? selected.label : emptyLabel;

  function pick(next) {
    onChange(next);
    setOpen(false);
    // Clear focus ring after choosing — native selects were leaving :focus-visible on.
    requestAnimationFrame(() => btnRef.current?.blur());
  }

  return (
    <div className={`op-dd${open ? ' is-open' : ''}${value ? ' has-value' : ''}`} ref={ref}>
      {label ? <span className="op-dd-label">{label}</span> : null}
      <button
        ref={btnRef}
        type="button"
        className="op-dd-btn"
        aria-label={ariaLabel || label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`op-dd-value${!value ? ' is-placeholder' : ''}`}>{display}</span>
        <svg className="op-dd-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="op-dd-menu" role="listbox">
          <li role="option" aria-selected={!value}>
            <button type="button" className={!value ? 'is-sel' : ''} onClick={() => pick('')}>
              {emptyLabel}
            </button>
          </li>
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button type="button" className={o.value === value ? 'is-sel' : ''} onClick={() => pick(o.value)}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OpportunityExplorer({initial,variant='new',savedOnly=false}) {
  const { user: authUser } = useAuthUser();
  const params=useSearchParams(),router=useRouter(),pathname=usePathname();
  const filters=useMemo(()=>readFilters(params),[params]);
  const [query,setQuery]=useState(filters.q),[data,setData]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [view,setView]=useState('list'),[sheet,setSheet]=useState(false),[groups,setGroups]=useState([]),[mapVersion,setMapVersion]=useState('');
  const [selectedJobId,setSelectedJobId]=useState(null);
  const [detail,setDetail]=useState(null),[detailError,setDetailError]=useState(''),[newAvailable,setNewAvailable]=useState(false);
  const [shortlist,setShortlist]=useState({jobs:{},companies:[],searches:[]}),[storageReady,setStorageReady]=useState(false),[notice,setNotice]=useState('');
  const [compare,setCompare]=useState(false),[areaA,setAreaA]=useState(''),[areaB,setAreaB]=useState(''),[comparison,setComparison]=useState(null);
  const [emailOpen,setEmailOpen]=useState(false),[email,setEmail]=useState(''),[emailState,setEmailState]=useState(''),[savedSearch,setSavedSearch]=useState(null);
  const [lastVisit,setLastVisit]=useState(null),[refresh,setRefresh]=useState(0);
  const emailRef=useRef(null),sheetRef=useRef(null),abortDetail=useRef(null),initialRequest=useRef(true),detailRef=useRef(null);
  const filterQuery=useMemo(()=>{const p=new URLSearchParams();for(const k of FILTER_KEYS)if(filters[k])p.set(k,filters[k]);return p.toString();},[filters]);
  function change(patch) {
    const p=new URLSearchParams(params.toString());
    for(const [key,value] of Object.entries(patch)){if(value)p.set(key,value);else p.delete(key);}
    p.delete('job');
    if(pathname==='/' && !p.get('view')) p.set('view','jobs');
    startTransition(()=>{router.replace(`${pathname}?${p}`,{scroll:false});});
  }
  useEffect(()=>{setQuery(filters.q);},[filters.q]);
  useEffect(()=>{if(query===filters.q)return;const t=setTimeout(()=>change({q:query}),450);return()=>clearTimeout(t);},[query,filters.q]);
  useEffect(()=>{
    setShortlist(readShortlist());setStorageReady(true);
    try{setLastVisit(localStorage.getItem('hyd-last-visit'));localStorage.setItem('hyd-last-visit',new Date().toISOString());}catch{}
    trackEvent(pathname==='/'?'landing':'results',variant);
    const update=()=>setShortlist(readShortlist());window.addEventListener('storage',update);window.addEventListener('hyd-shortlist',update);
    return()=>{window.removeEventListener('storage',update);window.removeEventListener('hyd-shortlist',update);};
  },[variant]);
  useEffect(()=>{
    const c=new AbortController();let alive=true;
    if(initialRequest.current && !filterQuery && initial?.jobs && !initial.stale && refresh===0){initialRequest.current=false;setBusy(false);return()=>c.abort();}
    initialRequest.current=false;setBusy(true);setError('');
    fetch(`/api/v2/jobs?${filterQuery}`,{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{
      if(!alive) return;
      startTransition(()=>{setData(d);setNewAvailable(false);});
      trackEvent('results',variant);
    })
      .catch(e=>{if(alive && e.name!=='AbortError')setError('Could not refresh jobs. Your previous results are still here.');})
      .finally(()=>{if(alive)setBusy(false);});
    return()=>{alive=false;c.abort();};
  },[filterQuery,refresh]);
  useEffect(()=>{
    if(view!=='map' && !compare) return;
    const c=new AbortController();
    fetch(`/api/v2/map?${filterQuery}`,{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{setGroups(d.companies);setMapVersion(d.version);}).catch(()=>{});
    return()=>c.abort();
  },[filterQuery,refresh,view,compare]);
  useEffect(()=>{
    const c=new AbortController();const t=setInterval(()=>{if(document.visibilityState!=='visible')return;fetch(`/api/v2/jobs?${filterQuery}`,{signal:c.signal}).then(r=>r.ok?r.json():null).then(d=>{if(c.signal.aborted||!d?.version)return;if(data?.stale&&!d.stale){startTransition(()=>{setData(d);setNewAvailable(false);setError('');});}else if(d.version!==data?.version)setNewAvailable(true);}).catch(()=>{});},60000);
    return()=>{clearInterval(t);c.abort();};
  },[filterQuery,data?.version,data?.stale]);
  // Legacy ?job= links → permanent SSR page (Google must not index query shells).
  useEffect(()=>{
    const legacy=params.get('job');
    if(!legacy) return;
    router.replace('/jobs/'+jobUrlId(legacy));
  },[params.get('job')]);

  useEffect(()=>{
    const id=selectedJobId;if(!id){setDetail(null);return;}
    abortDetail.current?.abort();const c=new AbortController();abortDetail.current=c;setDetailError('');
    setDetail(data?.jobs?.find(j=>j.id===id)||shortlist.jobs[id]?.job||{id,title:'Loading role…'});
    fetch('/api/v2/jobs/detail?id='+encodeURIComponent(id),{signal:c.signal}).then(r=>r.ok?r.json():Promise.reject()).then(d=>setDetail(d.job)).catch(e=>{if(e?.name!=='AbortError')setDetailError('This role could not be loaded. Try its original listing or return to results.');});
    trackEvent('detail',variant);return()=>c.abort();
  },[selectedJobId]);
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
  useEffect(()=>{
    if(!detail) return;
    const onKeyDown = (e) => {
      if(e.key === 'Escape') closeJob();
    };
    window.addEventListener('keydown', onKeyDown);
    if(detailRef.current) {
      detailRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    return () => window.removeEventListener('keydown', onKeyDown);
  },[detail?.id]);
  function persist(next){if(writeShortlist(next)){startTransition(()=>{setShortlist(next);setNotice('');});if(authUser?.uid)pushShortlistToCloud(authUser.uid,next);}else setNotice('This browser could not save locally. Allow site storage and try again.');}
  function save(job,status='saved'){persist({...shortlist,jobs:{...shortlist.jobs,[job.id]:{job,status,at:new Date().toISOString()}}});if(status==='saved')trackEvent('save',variant);}
  async function shareJob(job){
    if(!job?.id) return;
    const url = `${typeof window!=='undefined'?window.location.origin:''}/jobs/${jobUrlId(job.id)}`;
    const title = `${job.title} at ${job.company}`;
    const text = `${title} — Hyderabad role on Mapping HYD`;
    try {
      if (typeof navigator!=='undefined' && navigator.share) {
        await navigator.share({ title, text, url });
        trackEvent('share', variant);
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Link copied — share it anywhere.');
      trackEvent('share', variant);
    } catch {
      setNotice('Copy this link: '+url);
    }
  }
  function follow(company){
    const following=!shortlist.companies.includes(company);
    persist({...shortlist,companies:following?[...shortlist.companies,company]:shortlist.companies.filter(c=>c!==company)});
    try {let device=localStorage.getItem('hyd-follow-device');if(!device){device=crypto.randomUUID();localStorage.setItem('hyd-follow-device',device);}
      fetch('/api/follows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device,company,follow:following})}).catch(()=>{});
    }catch{}
  }
  function openJob(job){setView('list');setSelectedJobId(job.id);}
  function closeJob(){setSelectedJobId(null);setDetail(null);}
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
  const filterFields = (
    <div className="op-filter-grid">
      <div className="op-filter-area">
        <OpFilterSelect
          label="Area"
          value={filters.area}
          emptyLabel="All Hyderabad"
          onChange={(v) => change({ area: v })}
          options={(facet.areas || []).map((a) => ({ value: a, label: a }))}
        />
      </div>
      {[
        ['role', 'Role', facet.roles || []],
        ['level', 'Experience', ['early', ...(facet.levels || [])]],
        ['work', 'Work', ['remote', 'hybrid', 'onsite', 'unknown']],
        ['type', 'Type', facet.types || []],
        ['when', 'Freshness', ['discovered', 'today', 'week', 'month']],
        ['sort', 'Sort', ['newest', 'company']],
      ].map(([key, label, options]) => (
        <OpFilterSelect
          key={key}
          label={label}
          value={filters[key]}
          emptyLabel="Any"
          onChange={(v) => change({ [key]: v })}
          options={options.map((v) => ({ value: v, label: readable(v) }))}
        />
      ))}
      <label className="op-filter-check">
        <input type="checkbox" checked={filters.salary === 'yes'} onChange={(e) => change({ salary: e.target.checked ? 'yes' : '' })} />
        Salary
      </label>
    </div>
  );
  const mapHome = pathname === '/' && !savedOnly;
  const brandMark = (
    <Link href="/" className="tn-brand">
      <span className="cmd-mark" aria-hidden="true">
        <svg viewBox="0 0 100 120" width="17" height="20" fill="none">
          <rect x="21" y="18" width="15" height="64" rx="3" fill="currentColor" />
          <rect x="21" y="42" width="58" height="15" rx="3" fill="currentColor" />
          <path d="M64 18 H79 V57 C79 63 77 68 73.5 72.5 L71.5 75 L69 111 L66.3 75.5 L64.3 72.8 C61 68.2 64 63.4 64 57 Z" fill="currentColor" />
          <circle cx="71.5" cy="40" r="7" fill="#ff5722" />
        </svg>
      </span>
      <span className="tn-title">
        <span className="tn-title-full">Mapping<b> HYD</b></span>
        <span className="tn-title-short">Mapping<b> HYD</b></span>
      </span>
    </Link>
  );

  return <>
    {mapHome ? (
      <div className="startup-workspace">
        <header className="topnav">
          <div className="topnav-row">
            {brandMark}
            <ExploreModes active="jobs" />
            <div className="tn-search">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Role, skill, or company"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Role, skill, or company"
              />
            </div>
            <nav className="tn-links">
              <Link href="/saved">Saved</Link>
              <Link href="/gccs">GCCs</Link>
              <Link href="/more">More</Link>
            </nav>
            <Link className="btn cmd-submit tn-cta" href="/submit" aria-label="Submit a startup">Submit a startup</Link>
          </div>
        </header>
        <MobileTabBar />
      </div>
    ) : (
      <SiteNav active={savedOnly ? 'saved' : pathname === '/jobs' ? 'jobs' : ''} />
    )}
    <main className={`op-shell${mapHome ? ' op-map-home' : ''}`} id="main-content">
    <div className="op-hero">
      <header className="op-heading">
        <div>
          <p className="op-eyebrow">MAPPING HYD / OPPORTUNITIES</p>
          <h1>{savedOnly ? 'Your next moves.' : 'Find your next role in Hyderabad.'}</h1>
          <p>{savedOnly ? 'Your shortlist stays on this device.' : 'Real roles. Local employers. A clearer next move.'}</p>
        </div>
        <Link className="op-company-link" href="/?view=companies">Explore all companies ↗</Link>
      </header>
      {!savedOnly && <>
        {!mapHome && (
          <div className="op-search">
            <label className="op-query"><span className="sr-only">Role, skill, or company</span><input placeholder="Role, skill, or company" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <button className="op-filters-mobile-btn" onClick={() => setSheet(true)}>Filters{FILTER_KEYS.filter((k) => !['q', 'sort'].includes(k) && filters[k]).length ? ' •' : ''}</button>
          </div>
        )}
        {mapHome && (
          <div className="op-search op-search-mobile-only">
            <button className="op-filters-mobile-btn" onClick={() => setSheet(true)}>Filters{FILTER_KEYS.filter((k) => !['q', 'sort'].includes(k) && filters[k]).length ? ' •' : ''}</button>
          </div>
        )}
        <div className="op-controls">
          <aside className="op-filters-panel" aria-label="Filters">
            {filterFields}
            {FILTER_KEYS.filter((k) => k !== 'q' && filters[k]).length > 0 && (
              <button type="button" className="op-filters-clear" onClick={() => { setBusy(true); startTransition(() => router.replace(pathname === '/' ? '/?view=jobs' : pathname, { scroll: false })); }}>Clear</button>
            )}
          </aside>
          <div className="op-shortcuts" role="group" aria-label="Quick options">
            <button type="button" className="op-chip" aria-pressed={view === 'list'} onClick={() => setView('list')}>All jobs</button>
            <button type="button" className="op-chip" aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
            <button
              type="button"
              className="op-chip"
              aria-pressed={filters.direct === 'yes'}
              onClick={() => change({ direct: filters.direct === 'yes' ? '' : 'yes' })}
            >
              Direct ATS
            </button>
            {data?.shortcuts?.early && (
              <button type="button" className="op-chip" aria-pressed={filters.level === 'early'} onClick={() => change({ level: filters.level === 'early' ? '' : 'early' })}>Early career</button>
            )}
            {data?.shortcuts?.today && (
              <button type="button" className="op-chip" aria-pressed={filters.when === 'discovered'} onClick={() => change({ when: filters.when === 'discovered' ? '' : 'discovered' })}>New today</button>
            )}
            <button
              type="button"
              className="op-chip"
              aria-pressed={filters.hyd === 'yes'}
              onClick={() => change({ hyd: filters.hyd === 'yes' ? '' : 'yes' })}
            >
              Hyderabad only
            </button>
            <button type="button" className="op-chip" aria-pressed={compare} onClick={() => setCompare((v) => !v)}>Compare areas</button>
          </div>
        </div>
      </>}
    </div>
    {storageReady&&recent>0&&!savedOnly&&<p className="op-return">Since your last visit: {recent} newly discovered roles in these results.</p>}
    {shortlist.companies.length>0&&<div className="op-follows"><span>Following</span>{shortlist.companies.map(c=><button key={c} onClick={()=>change({company:c})}>{c}</button>)}</div>}
    {savedOnly&&shortlist.searches.length>0&&<section className="op-saved-searches"><h2>Saved searches</h2>{shortlist.searches.map((s,i)=><Link key={i} href={'/jobs?'+new URLSearchParams(Object.entries(s.filters).filter(([,v])=>v))}>{s.name} ↗</Link>)}</section>}
    {compare&&<section className="op-compare"><h2>Compare hiring in two areas</h2><p>Using your current role filters. These are office areas, not commute estimates.</p><div className="op-compare-dds">{[[areaA,setAreaA],[areaB,setAreaB]].map(([value,set],i)=><OpFilterSelect key={i} ariaLabel={`Comparison area ${i+1}`} value={value} emptyLabel="Choose area" onChange={set} options={(facet.areas||[]).map(a=>({value:a,label:a}))}/>)}</div>{comparison&&<div className="op-comparison">{comparison.map((g,i)=><article key={i}><h3>{[areaA,areaB][i]}</h3><strong>{g.total??'—'} roles</strong><p>{g.companies?.length??0} hiring employers</p>{g.work&&<p>{g.work.hybrid||0} hybrid · {g.work.remote||0} remote · {g.work.unknown||0} unspecified</p>}</article>)}</div>}</section>}
    <div className="op-results-bar">
      <span role="status">
        {savedOnly ? visible.length : (data?.total ?? '—')} roles
        {!savedOnly && data?.employers != null ? ` · ${data.employers} employers` : ''}
        {busy ? ' · Updating…' : ''}
      </span>
      <div>
        {!savedOnly && (
          <button type="button" className="op-save-search-bar-btn" onClick={saveSearch}>
            Save search
          </button>
        )}
      </div>
    </div>
    {!savedOnly&&filters.level==='early'&&<p className="op-return op-alert-nudge">Get these early-career roles by email — <button type="button" className="op-text-btn" onClick={saveSearch}>alert me</button>.</p>}
    {filterQuery&&!savedOnly&&<div className="op-active">{Object.entries(filters).filter(([,v])=>v).map(([k,v])=><button key={k} onClick={()=>change({[k]:''})}>{k}: {v} ×</button>)}<button onClick={()=>router.replace(pathname==='/'?'/?view=jobs':pathname,{scroll:false})}>Clear all</button></div>}
    {newAvailable&&<button className="op-refresh" onClick={()=>setRefresh(v=>v+1)}>Updated matches available — refresh results</button>}
    {(error||notice||data?.stale)&&<p className="op-warning" role="status">{error||notice||'Showing cached results. Source checks are temporarily delayed.'}</p>}
    <div className={`op-workspace op-view-${view}${detail?' op-has-detail':''}`}>
      <section className="op-results" aria-label="Job results">
        {visible.map(job => {
          const expDisplay = jobExperienceDisplay(job) || (job.level && job.level !== 'unknown' ? readable(job.level) : null);
          const logoWebsite = job.website || (job.url ? domainOf(job.url) : null);
          const isSaved = !!shortlist.jobs[job.id];
          const isSelected = detail?.id === job.id;
          const salaryPill = formatSalaryPill(job.salary);

          return (
            <article
              className={`op-job op-job-card${isSelected ? ' is-selected' : ''}`}
              key={job.id}
              onClick={e => {
                if (e.target.closest('button, select, input')) return;
                openJob(job);
              }}
            >
              <div className="op-card-top-row">
                <div className="op-card-brand-col">
                  <StartupLogo
                    name={job.company || 'Company'}
                    website={logoWebsite}
                    logoUrl={job.logoUrl}
                    sector={job.sector || job.role}
                    size={44}
                    className="op-card-logo"
                  />
                </div>
                <div className="op-card-main-col">
                  <div className="op-card-header-line">
                    <div className="op-card-employer-meta">
                      <span className="op-card-company-name">{job.company}</span>
                      {job.area && <span className="op-card-dot">·</span>}
                      {job.area && <span className="op-card-location">{job.area}</span>}
                      {job.isDirect && <span className="op-direct-badge" title="Direct from company careers ATS">Direct ATS</span>}
                    </div>
                    <button
                      className={`op-save-btn${isSaved ? ' is-saved' : ''}`}
                      aria-label={`Save ${job.title}`}
                      aria-pressed={isSaved}
                      onClick={e => {
                        e.stopPropagation();
                        save(job);
                      }}
                    >
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                  </div>

                  <a
                    className="op-card-title-link"
                    href={'/jobs/' + jobUrlId(job.id)}
                    onClick={e => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                        e.preventDefault();
                        openJob(job);
                      }
                    }}
                  >
                    {job.title}
                  </a>

                  <div className="op-card-pills-row">
                    {expDisplay && <span className="op-tag-pill op-tag-exp">{expDisplay}</span>}
                    {job.area && job.area !== 'Hyderabad' && (
                      <span className="op-tag-pill op-tag-area">{job.area}</span>
                    )}
                    {job.role && job.role !== 'Other' && (
                      <span className="op-tag-pill op-tag-role">{job.role}</span>
                    )}
                    {job.work && job.work !== 'unknown' && (
                      <span className="op-tag-pill op-tag-work">{readable(job.work)}</span>
                    )}
                    {salaryPill && (
                      <span className="op-tag-pill op-tag-salary">{salaryPill}</span>
                    )}
                    {job.openings > 1 && (
                      <span className="op-tag-pill op-tag-openings">{job.openings} openings</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="op-card-footer-row">
                <span className="op-card-timestamp">
                  {job.status === 'closed' ? 'Closed' : freshnessLabel(job)}
                </span>
                {job.moreAtCompany && (
                  <button
                    type="button"
                    className="op-more-roles-btn"
                    onClick={e => {
                      e.stopPropagation();
                      change({ company: job.moreAtCompany.company });
                    }}
                  >
                    +{job.moreAtCompany.count} more roles at {job.moreAtCompany.company} →
                  </button>
                )}
                {savedOnly && (
                  <select
                    aria-label={`Status for ${job.title}`}
                    className="op-saved-status-select"
                    value={shortlist.jobs[job.id]?.status || 'saved'}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      e.stopPropagation();
                      save(job, e.target.value);
                    }}
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="hidden">Hidden</option>
                  </select>
                )}
              </div>
            </article>
          );
        })}
        {!visible.length && (
          <div className="op-empty">
            <h2>{savedOnly ? 'Start your shortlist' : 'No matching roles right now'}</h2>
            <p>
              {savedOnly
                ? 'Save a role while exploring. Find it here when you are ready.'
                : 'Try fewer filters, or save this search for later.'}
            </p>
            <Link href="/jobs">Browse roles ↗</Link>
            {!savedOnly && <button onClick={saveSearch}>Save this search</button>}
          </div>
        )}
        {!savedOnly && data?.nextCursor && (
          <button className="op-load" disabled={busy} onClick={loadMore}>
            Load more roles
          </button>
        )}
      </section>

      {detail && (
        <div
          className="op-drawer-backdrop"
          onClick={closeJob}
          aria-hidden="true"
        />
      )}

      <aside className={`op-context ${detail ? 'op-drawer-container op-has-active-detail' : ''}`}>
        {detail ? (
          <section className="op-detail op-detail-otta" ref={detailRef} tabIndex={-1} aria-label="Selected role">
            <div className="op-detail-top-bar">
              <button className="op-back-results-btn" onClick={closeJob}>
                ← Back to results
              </button>
              <div className="op-detail-top-tools">
                <button type="button" className="op-tool-btn" onClick={() => shareJob(detail)}>
                  Share
                </button>
                <button
                  type="button"
                  className={`op-tool-btn${shortlist.jobs[detail.id] ? ' is-saved' : ''}`}
                  onClick={() => save(detail)}
                >
                  {shortlist.jobs[detail.id] ? 'Saved' : 'Save'}
                </button>
                <button
                  type="button"
                  className="op-tool-btn op-drawer-close-btn"
                  onClick={closeJob}
                  aria-label="Close details"
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="op-detail-hero-card">
              <div className="op-detail-hero-header">
                <StartupLogo
                  name={detail.company || 'Company'}
                  website={detail.website || (detail.url ? domainOf(detail.url) : null)}
                  logoUrl={detail.logoUrl}
                  sector={detail.sector || detail.role}
                  size={52}
                  className="op-detail-avatar"
                />
                <div className="op-detail-hero-titles">
                  <div className="op-detail-company-line">
                    <span className="op-detail-company-name">{detail.company}</span>
                    {detail.isDirect && <span className="op-direct-badge">Direct ATS</span>}
                  </div>
                  <h2 className="op-detail-main-title">{detail.title}</h2>
                  <div className="op-detail-meta-line">
                    <span>{detail.area || detail.location || 'Hyderabad'}</span>
                    <span>·</span>
                    <span>{freshnessLabel(detail)}</span>
                  </div>
                </div>
              </div>

              {detail.applyUrl && detail.status !== 'closed' && (
                <a
                  className="op-primary-apply-cta"
                  href={detail.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('apply', variant)}
                >
                  Apply on official site →
                </a>
              )}
            </div>

            <div className="op-quick-facts-grid">
              <div className="op-fact-item">
                <span className="op-fact-label">Experience</span>
                <span className="op-fact-val">
                  {jobExperienceDisplay(detail) || (detail.level && detail.level !== 'unknown' ? readable(detail.level) : 'Not specified')}
                </span>
              </div>
              <div className="op-fact-item">
                <span className="op-fact-label">Compensation</span>
                <span className="op-fact-val">{money(detail.salary)}</span>
              </div>
              <div className="op-fact-item">
                <span className="op-fact-label">Workplace</span>
                <span className="op-fact-val">
                  {detail.work && detail.work !== 'unknown' ? readable(detail.work) : 'On-site / Unspecified'}
                </span>
              </div>
              <div className="op-fact-item">
                <span className="op-fact-label">Tech Area</span>
                <span className="op-fact-val">{detail.area || detail.location || 'Hyderabad'}</span>
              </div>
            </div>

            {detail.status === 'closed' && (
              <div className="op-closed-notice">
                This role has closed. <Link href={'/jobs?q=' + encodeURIComponent(detail.role || detail.title)}>Browse similar active openings →</Link>
              </div>
            )}

            {detailError && <p className="op-detail-error" role="status">{detailError}</p>}

            <div className="op-detail-description-section">
              <h3 className="op-section-heading">About the role</h3>
              <div
                className="op-description-content"
                dangerouslySetInnerHTML={{
                  __html: cleanJobDescriptionHtml(detail.description) || '<p>View the complete requirements and apply on the employer official site.</p>',
                }}
              />
            </div>

            <div className="op-detail-employer-box">
              <h3 className="op-section-heading">About {detail.company}</h3>
              <p className="op-employer-summary">
                {detail.company} is tracked on the Hyderabad startup & tech directory.
              </p>
              <div className="op-employer-links">
                <Link className="op-link-chip" href={'/jobs/' + jobUrlId(detail.id)}>
                  Permanent Role Page ↗
                </Link>
                <button
                  type="button"
                  className="op-link-chip"
                  onClick={() => follow(detail.company)}
                >
                  {shortlist.companies.includes(detail.company) ? 'Unfollow Company' : '+ Follow Company'}
                </button>
              </div>
            </div>
          </section>
        ) : view === 'map' ? (
          <Map
            companies={mapVersion === data?.version ? groups : []}
            onSelect={c => {
              change(c.isArea ? { area: c.area, company: '' } : { company: c.name });
              trackEvent(c.isArea ? 'results' : 'company', variant);
              setView('list');
            }}
            onBounds={b => {
              change({ bounds: [b.south, b.north, b.west, b.east].join(',') });
              setNotice('Searching this map area. Roles without a verified location remain included.');
              setView('list');
            }}
          />
        ) : null}
      </aside>
    </div>
    <dialog className="op-dialog op-filters-dialog" ref={sheetRef} onCancel={()=>setSheet(false)} onClick={e=>{if(e.target===sheetRef.current)setSheet(false);}}><header><h2>Find your fit</h2><button autoFocus onClick={()=>setSheet(false)} aria-label="Close filters">×</button></header>{filterFields}<p>Unknown experience and work arrangements are available as explicit filter options.</p><button className="op-primary" onClick={()=>setSheet(false)}>Show {data?.total??''} roles</button></dialog>
    <dialog ref={emailRef} className="op-dialog op-alert-box" onCancel={()=>setEmailOpen(false)} aria-label="Saved search alerts"><button className="op-dismiss" onClick={()=>setEmailOpen(false)} aria-label="Close email signup">×</button><h2>Search saved on this device.</h2><p>Get a daily email for: <strong>{Object.values(savedSearch?.filters||filters).filter(Boolean).join(' · ')||'all Hyderabad roles'}</strong>. Confirm your address to start. No email is sent when there are no new matches.</p><form onSubmit={subscribe}><input type="email" aria-label="Email address" placeholder="you@example.com" required value={email} onChange={e=>setEmail(e.target.value)}/><button className="op-primary">Send confirmation</button></form><p role="status">{emailState}</p></dialog>
    {pathname !== '/jobs' && !pathname.startsWith('/jobs/') && (
      <footer className="op-footer">
        {mapHome ? (
          <span>Scroll for the full Hyderabad startup directory.</span>
        ) : (
          <>
            Explore Hyderabad <Link href="/?view=companies">Companies</Link>
            <Link href="/gccs">GCCs</Link>
            <Link href="/more">News, insights & more</Link>
            <span>Source dates and coverage vary. Saved items stay on this device.</span>
          </>
        )}
      </footer>
    )}
  </main></>;
}
