import Link from 'next/link';
import SiteNav from '../components/SiteNav.jsx';
export const metadata={title:'Explore more of Hyderabad | Mapping HYD'};
export default function MorePage(){return <><SiteNav/><main className="op-shell"><h1>More of Hyderabad.</h1><p>Explore the companies and stories behind the opportunities.</p><div className="op-saved-searches">{[['/?view=companies','All companies'],['/gccs','Global capability centres'],['/feed','Company feed'],['/news','News'],['/stories','Stories'],['/insights','Ecosystem insights'],['/newsletter','Newsletter'],['/submit','Submit a company']].map(([url,label])=><p key={url}><Link href={url}>{label} ↗</Link></p>)}</div></main></>;}
