import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
import {getAdminDb} from '../lib/firebaseAdmin.js';
import {recordId} from '../lib/board-store.js';
const db=await getAdminDb();if(!db)throw Error('Firebase unavailable');
const apply=process.argv.includes('--apply');
const docs=await Promise.all(['ats_latest','adzuna_latest'].map(id=>db.collection('job_board').doc(id).get()));
const jobs=docs.flatMap(d=>d.data()?.jobs||[]);let missing=0;
for(const j of jobs){const ref=db.collection('jobs_v2').doc(recordId(j.id));if((await ref.get()).exists)continue;missing++;
  if(apply)await ref.set({...j,boardId:j.atsProvider?`${j.atsProvider}:${j.atsSlug}`:'adzuna',sourcePostedAt:j.sourcePostedAt||null,postedAt:j.sourcePostedAt||null,firstSeenAt:j.firstSeenAt||null,status:j.status||'active',migrationBaseline:true});}
console.log(JSON.stringify({mode:apply?'applied':'dry-run',source:jobs.length,missing,eventsEmitted:0}));
