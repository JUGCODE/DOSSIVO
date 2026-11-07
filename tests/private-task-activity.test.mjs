import test from 'node:test';
import assert from 'node:assert/strict';
import {createTaskActivity} from '../lib/private-task-activity.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const ok=value=>Response.json(value);
test('task activity: reversed responses and repeated same-task reads only publish latest result',async()=>{
 const activity=createTaskActivity(),a=deferred(),b=deferred(),published=[];
 async function read(wait,value){const current=activity.begin('detail');const result=await activity.request(()=>wait.promise,'/task-A');if(current())published.push(result);}
 const first=read(a),second=read(b);b.resolve(ok({version:2}));await second;a.resolve(ok({version:1}));await first;
 assert.deepEqual(published,[{version:2}]);
});
test('task activity: list lane does not cancel detail and old completion cannot clear current loading',()=>{
 const activity=createTaskActivity(),old=activity.begin('detail'),latest=activity.begin('detail');
 activity.begin('list');assert.equal(old(),false);assert.equal(latest(),true);
});
test('task activity: malformed 401 clears session once and suppresses all in-flight data',async()=>{
 let cleared=0;const activity=createTaskActivity(()=>cleared++),late=deferred(),unauthorized=deferred();
 const detail=activity.begin('detail'),list=activity.begin('list'),download=activity.begin('download');
 const pending=activity.request(()=>late.promise,'/task');
 const other401=activity.request(()=>unauthorized.promise,'/other');
 await assert.rejects(activity.request(async()=>new Response('not JSON',{status:401}),'/task'),/AUTH_REQUIRED/);
 assert.equal(cleared,1);assert.equal(detail(),false);assert.equal(list(),false);assert.equal(download(),false);
 late.resolve(ok({private:'old'}));await pending;assert.equal(detail(),false);
 unauthorized.resolve(new Response('',{status:401}));await assert.rejects(other401,/AUTH_REQUIRED/);assert.equal(cleared,1);
});
test('task activity: disposal and reactivation never revive old requests or stale authentication failure',async()=>{
 let cleared=0;const activity=createTaskActivity(()=>cleared++),wait=deferred();
 const old=activity.begin('detail'),pending=activity.request(()=>wait.promise,'/task');
 activity.dispose();assert.equal(old(),false);activity.activate();const current=activity.begin('detail');
 wait.resolve(new Response('',{status:401}));await assert.rejects(pending,/AUTH_REQUIRED/);
 assert.equal(cleared,0);assert.equal(old(),false);assert.equal(current(),true);
});
test('task activity: mutation retries retain exact caller request and errors remain visible',async()=>{
 const activity=createTaskActivity();const options={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idempotencyKey:'stable',action:'assess'})};let received;
 await assert.rejects(activity.request(async(url,opts)=>{received=opts;return Response.json({code:'VERSION_CONFLICT'},{status:409});},'/api/private-tasks',options),/VERSION_CONFLICT/);
 assert.deepEqual(received,{...options,cache:'no-store'});
});
