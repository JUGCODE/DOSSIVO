import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {partnerApplicationRequest} from '../lib/partner-applications.js';
function setup(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(readFileSync(new URL('../drizzle/0022_worthless_firestar.sql',import.meta.url),'utf8'));const db={prepare(q){
 return {bind(...args){return {all:async()=>({results:sql.prepare(q).all(...args)})};}};
 }};const add=(owner,revision,type='promotion',action='review')=>sql.prepare('INSERT INTO dossivo_partner_application_events VALUES(?,?,?,?,?,?,?,?,?)').run('operation-'+owner+type+revision,owner,type,revision,action==='review'?'private-reviewer-account':owner,action,action==='review'?'needs_changes':'pending',action==='review'?'scope':'','2026-11-07T10:00:00.000Z');return {db,sql,add};}
const call=(db,query,actor='owner',admin=false,configuration='["admin"]')=>partnerApplicationRequest(db,actor,configuration,new Request('https://test/api?'+query),{admin});
test('history access requires login and configured admin privilege before any database read',async()=>{
 const db={prepare(){throw Error('must not access');}};
 assert.equal((await call(db,'history=promotion',null)).status,401);
 assert.equal((await call(db,'history=promotion&recipientId=owner','owner',true)).status,403);
 assert.equal((await call(db,'history=promotion&recipientId=owner','admin',true,null)).status,403);
});
test('applicant history binds to session and projects no other identities or private content',async t=>{
 const {db,add}=setup(t);add('owner',1,'promotion','submit');add('owner',2);add('other',1);add('owner',1,'delivery');
 const r=await call(db,'history=promotion&recipientId=other');assert.equal(r.headers.get('cache-control'),'private, no-store');const data=await r.json();assert.deepEqual(data.events.map(e=>e.revision),[2,1]);assert.equal(data.events[0].role,'reviewer');assert.equal(data.events[1].role,'applicant');
 assert.doesNotMatch(JSON.stringify(data),/private-reviewer-account|operation-|owner_id|profile_json|actorId|contract/);
 assert.deepEqual((await(await call(db,'history=promotion','nobody')).json()).events,[]);
});
test('authorized administrators can inspect the selected applicant and exact acting account',async t=>{
 const {db,add}=setup(t);add('owner',1);add('other',1,'delivery');
 const data=await(await call(db,'history=promotion&recipientId=owner','admin',true)).json();assert.equal(data.events[0].actorId,'private-reviewer-account');assert.equal(data.events.length,1);
 assert.equal((await call(db,'history=promotion','admin',true)).status,400);
});
test('history pagination uses revision cursor; new events cannot duplicate or displace older pages',async t=>{
 const {db,add}=setup(t);for(let n=1;n<=27;n++)add('owner',n);
 const page=await(await call(db,'history=promotion')).json();assert.equal(page.events.length,25);assert.equal(page.hasMore,true);assert.equal(page.nextBefore,3);
 add('owner',28);
 const older=await(await call(db,'history=promotion&before='+page.nextBefore)).json();assert.deepEqual(older.events.map(e=>e.revision),[2,1]);assert.equal(older.hasMore,false);assert.equal(older.nextBefore,null);
 const latest=await(await call(db,'history=promotion')).json();assert.equal(latest.events[0].revision,28);
});
test('history rejects malformed types and cursors and still permits own audit reading after reviewer removal',async t=>{
 const {db,add}=setup(t);add('owner',1);
 for(const q of ['history=','history=bad','history=promotion&before=0','history=promotion&before=-1','history=promotion&before=1.5','history=promotion&before=Infinity','history=promotion&before=9007199254740992'])assert.equal((await call(db,q)).status,400,q);
 const r=await call(db,'history=promotion','owner',false,null);assert.equal(r.status,200);assert.equal((await r.json()).events.length,1);
});
