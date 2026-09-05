import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
import {getAdminDb} from '../lib/firebaseAdmin.js';
const db=await getAdminDb();if(!db)throw Error('Firebase unavailable');
const [ats,adzuna,records]=await Promise.all([db.collection('job_board').doc('ats_latest').get(),db.collection('job_board').doc('adzuna_latest').get(),db.collection('jobs_v2').get()]);
const expected=[...(ats.data()?.jobs||[]),...(adzuna.data()?.jobs||[])];const byId=new Map(records.docs.map(d=>[d.data().id,d.data()]));
const missing=expected.filter(j=>!byId.has(j.id)).length;const changedDescriptions=expected.filter(j=>byId.has(j.id)&&j.description!==byId.get(j.id).description).length;
console.log(JSON.stringify({source:expected.length,destination:byId.size,missing,changedDescriptions,pass:missing===0&&changedDescriptions===0}));
if(missing||changedDescriptions)process.exitCode=1;
