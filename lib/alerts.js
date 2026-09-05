import { createHash } from 'node:crypto';
import { getAdminDb } from './firebaseAdmin.js';
import { signAlert } from './alert-tokens.js';
import { getSiteUrl } from './site-url.js';
export function alertsReady(){return process.env.ALERTS_ENABLED==='1' && !!process.env.RESEND_API_KEY && !!process.env.ALERT_TOKEN_SECRET && !!process.env.NEWSLETTER_FROM;}
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function escapeEmail(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function manageUrl(id){return `${getSiteUrl()}/alerts/manage?token=${signAlert(id,'manage',process.env.ALERT_TOKEN_SECRET)}`;}
export async function sendOnce(key,to,subject,html,{control=false,checkpoint=null}={}) {
  if(!alertsReady())return {sent:false,reason:'Email alerts are not enabled yet.'};
  const db=await getAdminDb();if(!db)return {sent:false,reason:'Email storage unavailable'};
  if((await db.collection('email_suppressions').doc(hash(to.toLowerCase())).get()).exists)return {sent:false,reason:'This address cannot receive alerts.'};
  const ref=db.collection('alert_deliveries').doc(hash(key));
  const day=new Date().toISOString().slice(0,10),month=day.slice(0,7);
  const daily=db.collection('mail_usage').doc(day),monthly=db.collection('mail_usage').doc(month);
  const acquired=await db.runTransaction(async tx=>{
    const [snap,d,m]=await Promise.all([tx.get(ref),tx.get(daily),tx.get(monthly)]);const old=snap.data();
    if(old?.status==='sent')return {done:true,checkpoint:old.checkpoint};
    if(old?.leaseUntil>Date.now())return null;
    if(old?.createdAt && Date.now()-old.createdAt>23*3600000)return null;
    const dayLimit=Math.max(1,Number(process.env.MAIL_DAILY_LIMIT||100)),monthLimit=Math.max(1,Number(process.env.MAIL_MONTHLY_LIMIT||3000));
    if(!old && ((d.data()?.count||0)>=dayLimit-(control?0:10)||(m.data()?.count||0)>=monthLimit-(control?0:50)))return null;
    if(!old){tx.set(daily,{count:(d.data()?.count||0)+1});tx.set(monthly,{count:(m.data()?.count||0)+1});}
    const payload=old?.payload||{to,subject,html};
    const deliveredCheckpoint=old?old.checkpoint??null:checkpoint;
    tx.set(ref,{status:'pending',leaseUntil:Date.now()+60000,createdAt:old?.createdAt||Date.now(),payload,checkpoint:deliveredCheckpoint},{merge:true});return {payload,checkpoint:deliveredCheckpoint};
  });
  if(acquired?.done)return {sent:true,checkpoint:acquired.checkpoint};if(!acquired)return {sent:false,reason:'Delivery capacity is temporarily unavailable.'};
  try {
    const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':hash(key)},body:JSON.stringify({from:process.env.NEWSLETTER_FROM,...acquired.payload})});
    if(!response.ok)throw Error('Email provider rejected delivery');
    await ref.set({status:'sent',sentAt:new Date().toISOString(),leaseUntil:0},{merge:true});return {sent:true,checkpoint:acquired.checkpoint};
  }catch{return {sent:false,reason:'Delivery is pending. Please try again later.'};}
}
