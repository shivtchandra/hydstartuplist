import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionState } from '../lib/session-state.js';

function fixture() {
  const entries = new Map();
  const storage = { getItem:key=>entries.get(key)??null, setItem:(key,value)=>entries.set(key,value) };
  const create = () => createSessionState({storage:()=>storage});
  return {entries,storage,create};
}

test('draft inputs, filters and preview choices survive a new page instance', () => {
  const {create}=fixture();
  const first=create();
  first.set('resume:text','Unsaved resume changes','');
  first.set('matches:filters',{remote:true,min:65},{remote:false,min:0});
  first.set('pack:job-a:preview','clean','changes');
  const reloaded=create();
  assert.equal(reloaded.get('resume:text',''),'Unsaved resume changes');
  assert.deepEqual(reloaded.get('matches:filters',{remote:false,min:0}),{remote:true,min:65});
  assert.equal(reloaded.get('pack:job-a:preview','changes'),'clean');
});

test('in-flight work survives unsubscribing but is not resurrected after a reload', async () => {
  const {create,entries}=fixture();
  const state=create();
  let notifications=0;
  const unsubscribe=state.subscribe('pack:busy',()=>notifications++);
  state.set('pack:busy',true,false,false);
  assert.equal(notifications,1);
  unsubscribe();
  assert.equal(state.get('pack:busy',false,false),true);
  await Promise.resolve().then(()=>{
    state.set('pack:result','Completed draft','');
    state.set('pack:busy',false,false,false);
  });
  assert.equal(notifications,1);
  assert.equal(create().get('pack:result',''),'Completed draft');
  assert.ok(![...entries.keys()].some(key=>key.endsWith('pack:busy')));
  assert.equal(create().get('pack:busy',false,false),false);
});

test('job drafts and original-resume versions cannot bleed into one another', () => {
  const state=fixture().create();
  state.set('pack:job-a:resume-v1:description','First job requirements','');
  state.set('pack:job-a:resume-v1:tab','letter','resume');
  assert.equal(state.get('pack:job-b:resume-v1:description',''),'');
  assert.equal(state.get('pack:job-a:resume-v2:description',''),'');
  assert.equal(state.get('pack:job-a:resume-v2:tab','resume'),'resume');
  assert.equal(state.get('pack:job-a:resume-v1:tab','resume'),'letter');
});

test('functional background updates use the latest snapshot across old and new subscribers', () => {
  const state=fixture().create();
  state.set('applications',{first:'saved'},{},false);
  const oldCallback=()=>state.set('applications',current=>({...current,first:'tailored'}),{},false);
  state.set('applications',current=>({...current,second:'applied'}),{},false);
  oldCallback();
  assert.deepEqual(state.get('applications',{},false),{first:'tailored',second:'applied'});
});

test('invalid storage and unavailable storage preserve usable state', () => {
  const {entries,create}=fixture();
  entries.set('mapping_hyd_session_v1:filters','{broken');
  entries.set('mapping_hyd_session_v1:tab','42');
  assert.deepEqual(create().get('filters',{remote:false}),{remote:false});
  assert.equal(create().get('tab','resume'),'resume');
  const denied=createSessionState({storage:()=>{throw new Error('Storage denied');}});
  denied.set('text','Recoverable draft','');
  assert.equal(denied.get('text',''),'Recoverable draft');
});

test('old session objects receive new default fields without discarding saved selections', () => {
  const {entries,create}=fixture();
  entries.set('mapping_hyd_session_v1:filters',JSON.stringify({remote:true}));
  assert.deepEqual(create().get('filters',{remote:false,min:0,posted:0}),{remote:true,min:0,posted:0});
});

test('unchanged snapshots do not notify or cause rerender loops', () => {
  const state=fixture().create();
  const initial={text:'Draft'};
  assert.equal(state.get('draft',initial),initial);
  let changes=0;
  state.subscribe('draft',()=>changes++);
  state.set('draft',value=>value,initial);
  assert.equal(changes,0);
  assert.equal(state.get('draft',{}),initial);
});
