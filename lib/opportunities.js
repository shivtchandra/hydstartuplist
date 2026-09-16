import { inferRoleType, inferExperienceLevel } from './job-facets.js';
import { canonicalJobUrl, collapseDuplicatePostings, deduplicateJobs, validDate } from './job-lifecycle.js';


/** Prefer public Phenom job pages over iCIMS login stubs stored from older syncs. */
function rewritePhenomApplyUrl(job, url) {
  const raw = String(url || "");
  const m = raw.match(/icims\.com\/jobs\/(\d+)\/login\/?$/i);
  if (!m) return url;
  const reqId = m[1];
  if (job.atsSlug === "amd" || /careers\.amd\.com/i.test(job.boardUrl || "")) {
    return `https://careers.amd.com/careers-home/jobs/${reqId}`;
  }
  const board = String(job.boardUrl || "").split("?")[0];
  if (/\/jobs\/?$/i.test(board) || board.includes("/careers-home/jobs")) {
    return `${board.replace(/\/?$/, "")}/${reqId}`;
  }
  return url;
}

export const FILTER_KEYS = ['q','role','level','area','work','salary','type','when','sort','company','bounds'];
export function readFilters(params) {
  return Object.fromEntries(FILTER_KEYS.map(key => [key, String(params.get(key) || '').slice(0,160)]));
}
export function searchText(value) {
  return String(value || '').toLowerCase().replace(/front[ -]end/g,'frontend').replace(/back[ -]end/g,'backend')
    .replace(/\bjs\b/g,'javascript').replace(/\bts\b/g,'typescript').replace(/[^\p{L}\p{N}+#.]+/gu,' ').trim();
}
export function workArrangement(job) {
  const explicit = String(job.workArrangement || job.workplaceType || '').toLowerCase();
  if (['remote','hybrid','onsite'].includes(explicit)) return explicit;
  const text = `${job.title || ''} ${job.location || ''}`;
  if (/\bhybrid\b/i.test(text)) return 'hybrid';
  if (/\bremote\b/i.test(text)) return 'remote';
  if (/\bon[ -]?site\b/i.test(text)) return 'onsite';
  return 'unknown';
}
export function cleanArea(value) {
  const areas=['Financial District','Nanakramguda','HITEC City','Gachibowli','Madhapur','Jubilee Hills','Banjara Hills','Secunderabad','Kukatpally','Kondapur','Begumpet','Raidurg','Shamshabad','Kompally','Uppal','Ameerpet','Somajiguda','Manikonda','Narsingi','Miyapur','Punjagutta','Balanagar','Hussainialam'];
  const text=String(value||'').toLowerCase();
  return areas.find(a=>text.includes(a.toLowerCase())) || (/hitech|hi-tec/.test(text)?'HITEC City':'Hyderabad');
}
export function prepareJobs(jobs, companies = []) {
  const byId = new Map(companies.map(c=>[c.id,c]));
  const byName = new Map(companies.map(c=>[searchText(c.name),c]));
  // Collapse after mapping so the freshest pick compares normalized postedAt values.
  return collapseDuplicatePostings(deduplicateJobs(jobs).map(j=>{
    const company=byId.get(j.startupId) || byName.get(searchText(j.company));
    return {...j, area:cleanArea(j.area || company?.area || j.location), role:inferRoleType(j.title) || 'Other',
      level:j.experienceLevel || inferExperienceLevel(j.title,j.description) || 'unknown',
      levelInferred:!j.experienceLevel, work:workArrangement(j),
      lat:Number.isFinite(company?.lat) ? company.lat : null, lng:Number.isFinite(company?.lng) ? company.lng : null,
      locationPrecision:company?.locationVerified === true ? 'office' : 'area',
      companyId:company?.id || null,
      // Prefer sourcePostedAt; fall back to postedAt (older ATS snapshots often omit sourcePostedAt).
      postedAt:validDate(j.sourcePostedAt || j.postedAt),
      sourcePostedAt:validDate(j.sourcePostedAt || j.postedAt),
      applyUrl:rewritePhenomApplyUrl(j, canonicalJobUrl(j.url)), category:j.category || 'other'};
  }));
}
export function matchesJob(j, f, now=Date.now()) {
  if (j.status === 'closed') return false;
  const terms=searchText(f.q).split(' ').filter(Boolean);
  const hay=searchText(`${j.title} ${j.company} ${j.description || ''} ${(j.skills || []).join(' ')}`);
  if (!terms.every(term=>hay.includes(term))) return false;
  if (f.bounds && Number.isFinite(j.lat) && Number.isFinite(j.lng)) {
    const b=f.bounds.split(',').map(Number);
    if(b.length===4 && b.every(Number.isFinite) && (j.lat<b[0]||j.lat>b[1]||j.lng<b[2]||j.lng>b[3]))return false;
  }
  if (f.role && j.role !== f.role) return false;
  if (f.level && j.level !== f.level && !(f.level==='early' && ['intern','junior'].includes(j.level))) return false;
  if (f.area && j.area !== f.area) return false;
  if (f.company && ![j.companyId, j.company].includes(f.company)) return false;
  if (f.work && j.work !== f.work) return false;
  if (f.salary === 'yes' && !j.salary) return false;
  if (f.type && j.category !== f.type) return false;
  if (f.when) {
    const date=f.when==='discovered' ? j.firstSeenAt : j.sourcePostedAt || j.postedAt;
    const days={today:1,discovered:1,week:7,month:30}[f.when];
    const valid=validDate(date,now);
    if(days && (!valid || now-Date.parse(valid)>days*86400000)) return false;
  }
  return true;
}
/** Rank time for default newest sort: real post dates outrank scrape-only discovery. */
export function jobSortTime(job) {
  const posted = Date.parse(job?.sourcePostedAt || job?.postedAt || "") || 0;
  if (posted) return posted + 1e15; // dated listings (Adzuna/ATS) above undated HTML scrapes
  return Date.parse(job?.firstSeenAt || "") || 0;
}

export function filterJobs(jobs,filters,now=Date.now()) {
  return jobs.filter(j=>matchesJob(j,filters,now)).sort((a,b)=>filters.sort==='company' ? a.company.localeCompare(b.company) :
    jobSortTime(b)-jobSortTime(a) || String(a.id).localeCompare(String(b.id)));
}
export function mapGroups(jobs) {
  const companies=new Map();
  for(const j of jobs) {
    const key=j.companyId || j.company;
    if(!companies.has(key)) companies.set(key,{id:key,name:j.company,area:j.area,lat:j.lat,lng:j.lng,precision:j.locationPrecision,count:0});
    companies.get(key).count++;
  }
  return [...companies.values()];
}
/**
 * Cap how much of a result list one employer may occupy.
 *
 * NxtWave posts the same BD role once per language group, which filled 9 of the first 30
 * early-career rows and pushed every other employer off the page. The surplus rows are real
 * openings, so they are not discarded: the employer's last visible row carries `moreAtCompany`
 * and the UI offers a link into the company-filtered view.
 *
 * Skip this when the reader has already asked for one company — there, seeing all of them is
 * the entire point.
 */
export const employerShareKey = j => String(j?.companyId || j?.company || '').toLowerCase().trim();

export function capEmployerShare(jobs, limit = 3, isExempt) {
  const totals = new Map();
  for (const j of jobs) totals.set(employerShareKey(j), (totals.get(employerShareKey(j)) || 0) + 1);

  const shown = new Map(), rows = [];
  for (const j of jobs) {
    const k = employerShareKey(j);
    if (isExempt?.(k)) { rows.push(j); continue; }
    const n = (shown.get(k) || 0) + 1;
    shown.set(k, n);
    if (n <= limit) rows.push(j);
  }

  for (const [k, count] of totals) {
    const hidden = count - limit;
    if (hidden <= 0 || isExempt?.(k)) continue;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (employerShareKey(rows[i]) !== k) continue;
      rows[i] = { ...rows[i], moreAtCompany: { company: rows[i].company, count: hidden, key: k } };
      break;
    }
  }
  return rows;
}
export function jobSummary({description,...j}) { return j; }
