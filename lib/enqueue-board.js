import { getApps } from 'firebase-admin/app';
import { recordId } from './board-store.js';
export async function enqueueBoard(boardId,eventId) {
  const project=process.env.GCP_PROJECT_ID,region=process.env.GCP_REGION||'asia-south1',url=process.env.WORKER_URL,account=process.env.TASK_SERVICE_ACCOUNT;
  if(!project||!url||!account)throw Error('Task delivery not configured');
  const credential=getApps()[0]?.options.credential;if(!credential)throw Error('Task credentials unavailable');
  const token=await credential.getAccessToken();const parent=`projects/${project}/locations/${region}/queues/hyd-job-scans`;
  const r=await fetch(`https://cloudtasks.googleapis.com/v2/${parent}/tasks`,{method:'POST',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({task:{name:`${parent}/tasks/event-${recordId(eventId)}`,httpRequest:{httpMethod:'POST',url:url+'/scan',headers:{'Content-Type':'application/json'},body:Buffer.from(JSON.stringify({boardId})).toString('base64'),oidcToken:{serviceAccountEmail:account,audience:url}}}})});
  if(!r.ok&&r.status!==409)throw Error('Could not enqueue board');
}
