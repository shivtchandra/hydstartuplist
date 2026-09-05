'use client';
import { Suspense,useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteNav from '../../components/SiteNav.jsx';
import { trackEvent } from '../../../lib/engagement-client.js';
function Manage(){const params=useSearchParams();const [message,setMessage]=useState('');
  async function act(action){setMessage('Saving…');try{const r=await fetch('/api/alerts/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:params.get('token'),action})});const d=await r.json();setMessage(d.message||d.error);if(r.ok&&action==='confirm')trackEvent('alert_confirmed');}catch{setMessage('Could not update preferences. Try again.');}}
  return <><SiteNav/><main className="op-shell"><h1>Your email preferences</h1><p>Confirm a requested search or manage an existing subscription.</p><div className="op-detail-actions"><button onClick={()=>act('confirm')}>Confirm requested alerts</button><button onClick={()=>act('daily')}>Switch to daily</button><button onClick={()=>act('unsubscribe')}>Unsubscribe from this search</button></div><p role="status">{message}</p></main></>;}
export default function Page(){return <Suspense fallback={<p>Loading preferences…</p>}><Manage/></Suspense>;}
