export function cleanCompanyDescription(value) {
  return String(value||'').replace(/DPIIT-recogni[sz]ed\s*\((?:null|undefined|)\)\.?/gi,'').replace(/\b(?:null|undefined)\b/g,'').replace(/\s{2,}/g,' ').trim();
}
export function fundingLabel(value) {
  return ({EarlyTraction:'Early traction',Prototype:'Prototype',Validation:'Validation',Scaling:'Scaling'})[value]||value||'Not disclosed';
}
export function hiringStatus(company,now=Date.now()) {
  const checked=Date.parse(company.hiring?.checkedAt || company.hiringCheckedAt || '');
  if(!Number.isFinite(checked)||now-checked>7*86400000)return 'Not recently checked';
  return company.hiring?.active && company.hiring?.count>0 ? 'Hiring verified' : 'No openings found';
}
