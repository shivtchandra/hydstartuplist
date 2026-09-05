import { Suspense } from 'react';
import OpportunityExplorer from '../components/OpportunityExplorer.jsx';
export const metadata={title:'Your saved jobs | Mapping HYD'};
export default function SavedPage(){return <Suspense fallback={<p>Loading your shortlist…</p>}><OpportunityExplorer savedOnly initial={{jobs:[],total:0}}/></Suspense>;}
