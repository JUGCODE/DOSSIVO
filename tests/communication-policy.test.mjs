import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {CommunicationPolicyStore} from '../lib/communication-policy.js';
import {ContactStore} from '../lib/contact-store.js';
import {ConversationStore} from '../lib/conversation-store.js';
import {PrivateTaskStore} from '../lib/private-task-store.js';
import {BuyerAccessStore} from '../lib/buyer-access-store.js';

function dbFor(sqlite){
 const db={beforeBatch:null,prepare(sql){const make=values=>({sql,values,bind:(...v)=>make(v),first:async()=>sqlite.prepare(sql).get(...values)??null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>sqlite.prepare(sql).run(...values)});return make([]);},async batch(statements){if(db.beforeBatch){const hook=db.beforeBatch;db.beforeBatch=null;await hook();}sqlite.exec('BEGIN');try{const rows=statements.map(s=>sqlite.prepare(s.sql).run(...s.values));sqlite.exec('COMMIT');return rows;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};return db;
}
function setup(t,options={regionEnforcement:true}){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db=dbFor(sqlite),clock=()=> '2026-11-05T12:00:00.000Z',storeOptions={clock,...options};return {sqlite,db,clock,policy:new CommunicationPolicyStore(db,storeOptions),contacts:new ContactStore(db,storeOptions),chat:new ConversationStore(db,storeOptions),task:new PrivateTaskStore(db,{clock}),access:new BuyerAccessStore(db,{clock})};
}
const choose=(f,actor,service_region='INTERNATIONAL')=>f.policy.select(actor,{service_region,confirmed:true});
const registration=display_name=>({display_name,discoverable:true,synthetic_only:true});
const requestData=public_id=>({public_id,synthetic_only:true});
const message=(grant_id,body='Synthetic greeting')=>({grant_id,body,kind:'NOTE',synthetic_only:true});
function count(f,table){return f.sqlite.prepare('SELECT COUNT(*) n FROM '+table).get().n;}
async function pair(t){const f=setup(t);await choose(f,'account-a');await choose(f,'account-b');const a=await f.contacts.ensureProfile('account-a',registration('Synthetic Alice')),b=await f.contacts.ensureProfile('account-b',registration('Synthetic Bob'));return {...f,a,b};}
async function pending(t){const f=await pair(t);await f.contacts.request('account-a',requestData(f.b.public_id),'request');return {...f,request:(await f.contacts.requests('account-b')).incoming[0]};}
async function accepted(t){const f=await pending(t);await f.contacts.respond('account-b',{request_id:f.request.id,decision:'ACCEPT'},'accept');return {...f,contact:(await f.contacts.requests('account-a')).contacts[0]};}
let serial=0;
async function grantFixture(t,options){
 const f=setup(t,options);let s=(await f.task.command('supplier',{action:'create',idempotency_key:'create-'+(++serial),data:{synthetic_only:true,purpose:'Synthetic order',organization:'Synthetic supplier',facility:'Synthetic facility',period:'2026-10'}})).state;
 for(const action of ['add_material','assess','freeze_card'])s=(await f.task.command('supplier',{task_id:s.task_id,expected_version:s.version,idempotency_key:'task-'+(++serial),action,data:action==='add_material'?{sample:'normal'}:{}})).state;
 const g=await f.access.createGrant('supplier',{task_id:s.task_id,card_id:s.cards.at(-1).id,hours:48,fields:[],categories:['electricity'],access_mode:'CONTINUOUS_SUMMARY',version_policy:'FIXED'},'grant');await f.access.redeem('buyer',g.code,'redeem');return {...f,s,g};
}

test('communication region: unknown is closed and explicit confirmed choices are actor scoped and persistent',async t=>{
 const f=setup(t);for(const actor of ['new-account','cn@example.test','中文账户']){const s=await f.policy.status(actor);assert.equal(s.service_region,'UNKNOWN');assert.equal(s.available,false);await assert.rejects(f.policy.require(actor),{code:'COMMUNICATION_REGION_REQUIRED'});}
 for(const data of [{},{service_region:'INTERNATIONAL'},{service_region:'INTERNATIONAL',confirmed:false},{service_region:'UNKNOWN',confirmed:true},{service_region:'international',confirmed:true},{service_region:'OTHER',confirmed:true}])await assert.rejects(f.policy.select('new-account',data));
 assert.equal((await f.policy.status('new-account')).service_region,'UNKNOWN');
 const chosen=await choose(f,'new-account');assert.equal(chosen.service_region,'INTERNATIONAL');assert.equal(chosen.available,true);assert.equal(chosen.region_verified,false);await f.policy.require('new-account');
 await assert.rejects(f.policy.select('new-account',{service_region:'INTERNATIONAL',confirmed:true,actor_id:'another-account'}));
 assert.equal((await new CommunicationPolicyStore(f.db,{clock:f.clock,regionEnforcement:true}).status('new-account')).available,true);assert.equal((await f.policy.status('another-account')).service_region,'UNKNOWN');
 await choose(f,'new-account','CN_MAINLAND');const cn=await f.policy.status('new-account');assert.equal(cn.available,false);assert.equal(cn.service_region,'CN_MAINLAND');await assert.rejects(f.policy.require('new-account'),{code:'COMMUNICATION_NOT_AVAILABLE'});
});

test('communication region: an outdated declaration must be confirmed again before discovery or new actions',async t=>{
 const f=await pair(t);f.sqlite.prepare('UPDATE dossivo_communication_regions SET declaration_version=? WHERE actor_id=?').run('outdated-declaration','account-b');
 assert.equal((await f.policy.status('account-b')).service_region,'UNKNOWN');await assert.rejects(f.policy.require('account-b'),{code:'COMMUNICATION_REGION_REQUIRED'});await assert.rejects(f.contacts.publicProfile(f.b.public_id));await assert.rejects(f.contacts.request('account-a',requestData(f.b.public_id),'outdated-target'));
 await choose(f,'account-b');assert.equal((await f.contacts.publicProfile(f.b.public_id)).public_id,f.b.public_id);
});

test('communication region: profile opt-in and exact lookup require availability, and stale public links hide unavailable accounts',async t=>{
 const f=await pair(t);await assert.rejects(f.contacts.ensureProfile('unknown',registration('Synthetic unknown')),{code:'COMMUNICATION_REGION_REQUIRED'});
 await choose(f,'mainland','CN_MAINLAND');await assert.rejects(f.contacts.ensureProfile('mainland',registration('Synthetic mainland')),{code:'COMMUNICATION_NOT_AVAILABLE'});
 await assert.rejects(f.contacts.lookup('unknown',f.b.public_id),{code:'COMMUNICATION_REGION_REQUIRED'});await assert.rejects(f.contacts.lookup('mainland',f.b.public_id),{code:'COMMUNICATION_NOT_AVAILABLE'});
 assert.equal((await f.contacts.publicProfile(f.b.public_id)).public_id,f.b.public_id);
 await choose(f,'account-b','CN_MAINLAND');await assert.rejects(f.contacts.publicProfile(f.b.public_id));await assert.rejects(f.contacts.lookup('account-a',f.b.public_id));await assert.rejects(f.contacts.request('account-a',requestData(f.b.public_id),'cn-target'));
 assert.equal(count(f,'dossivo_contact_requests'),0);
 // Legacy contact profiles without a current declaration must not restore discovery.
 f.sqlite.prepare('DELETE FROM dossivo_communication_regions WHERE actor_id=?').run('account-a');await assert.rejects(f.contacts.publicProfile(f.a.public_id));
});

test('communication region: a pending request cannot be accepted after either participant becomes unavailable',async t=>{
 const f=await pending(t);await choose(f,'account-a','CN_MAINLAND');await assert.rejects(f.contacts.respond('account-b',{request_id:f.request.id,decision:'ACCEPT'},'accept-unavailable'));
 assert.equal(count(f,'dossivo_contacts'),0);assert.equal(f.sqlite.prepare('SELECT status FROM dossivo_contact_requests WHERE id=?').get(f.request.id).status,'PENDING');
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_operations WHERE key=?').get('accept-unavailable').n,0);
});

test('communication region race: changing request target before commit leaves no request or operation receipt',async t=>{
 const f=await pair(t);f.db.beforeBatch=()=>choose(f,'account-b','CN_MAINLAND');await assert.rejects(f.contacts.request('account-a',requestData(f.b.public_id),'request-region-race'));
 assert.equal(count(f,'dossivo_contact_requests'),0);assert.equal(count(f,'dossivo_contacts'),0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_operations WHERE key=?').get('request-region-race').n,0);
});

test('communication region race: profile opt-in rolls back if availability changes before its commit',async t=>{
 const f=setup(t);await choose(f,'new-profile');f.db.beforeBatch=()=>choose(f,'new-profile','CN_MAINLAND');await assert.rejects(f.contacts.ensureProfile('new-profile',registration('Synthetic new profile')));assert.equal(count(f,'dossivo_contact_profiles'),0);assert.equal((await f.policy.status('new-profile')).service_region,'CN_MAINLAND');
});

test('communication region race: changing requester before acceptance commit preserves pending consent and creates no contact',async t=>{
 const f=await pending(t);f.db.beforeBatch=()=>choose(f,'account-a','CN_MAINLAND');await assert.rejects(f.contacts.respond('account-b',{request_id:f.request.id,decision:'ACCEPT'},'accept-region-race'));
 assert.equal(count(f,'dossivo_contacts'),0);assert.equal(f.sqlite.prepare('SELECT status FROM dossivo_contact_requests WHERE id=?').get(f.request.id).status,'PENDING');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_operations WHERE key=?').get('accept-region-race').n,0);
});

test('communication region race: recommendation issuance rolls back if either party becomes unavailable',async t=>{
 const f=await accepted(t);f.db.beforeBatch=()=>choose(f,'account-b','CN_MAINLAND');await assert.rejects(f.contacts.referral('account-a',{public_id:f.b.public_id},'referral-region-race'));
 assert.equal(count(f,'dossivo_contact_referrals'),0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_operations WHERE key=?').get('referral-region-race').n,0);
});

test('communication region: existing recommendation links stop resolving after the recommender becomes unavailable',async t=>{
 const f=await accepted(t),r=await f.contacts.referral('account-a',{public_id:f.b.public_id},'referral');assert.equal((await f.contacts.referralInfo(r.token)).target_public_id,f.b.public_id);
 await choose(f,'account-a','CN_MAINLAND');await assert.rejects(f.contacts.referralInfo(r.token));await assert.rejects(f.contacts.referral('account-a',{public_id:f.b.public_id},'referral'));
});

test('communication region race: a referred request rechecks the third-party recommender before commit',async t=>{
 const f=await accepted(t),r=await f.contacts.referral('account-a',{public_id:f.b.public_id},'third-party-referral');await choose(f,'account-c');await f.contacts.ensureProfile('account-c',registration('Synthetic Charlie'));const before=count(f,'dossivo_contact_requests');
 f.db.beforeBatch=()=>choose(f,'account-a','CN_MAINLAND');await assert.rejects(f.contacts.request('account-c',{...requestData(f.b.public_id),referral_token:r.token},'referred-region-race'));
 assert.equal(count(f,'dossivo_contact_requests'),before);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_operations WHERE key=?').get('referred-region-race').n,0);
});

test('communication region: old direct routes and successful send keys cannot send after the peer becomes unavailable',async t=>{
 const f=await accepted(t),data=message(f.contact.id);await f.chat.send('account-a',data,'original-send');await choose(f,'account-b','CN_MAINLAND');
 await assert.rejects(f.chat.send('account-a',data,'original-send'));await assert.rejects(f.chat.send('account-a',message(f.contact.id,'New body'),'new-send'));await assert.rejects(f.chat.send('account-b',message(f.contact.id,'Reply'),'peer-send'));
 const history=await f.chat.thread('account-a',f.contact.id);assert.equal(history.messages.length,1);assert.equal(history.last_sequence,1);assert.equal(history.send_allowed,false);assert.equal((await f.chat.inbox('account-b')).unread_total,1);
 await f.chat.markRead('account-b',{grant_id:f.contact.id,through_message_id:history.messages[0].id});assert.equal((await f.chat.inbox('account-b')).unread_total,0);
 await f.contacts.block('account-b',{contact_id:f.contact.id,blocked:true},'block-unavailable');assert.equal((await f.contacts.requests('account-b')).contacts[0].blocked_by_me,true);
});

test('communication region race: direct send rechecks peer at commit without message or unread side effects',async t=>{
 const f=await accepted(t);await f.chat.send('account-a',message(f.contact.id,'Existing history'),'existing-send');f.db.beforeBatch=()=>choose(f,'account-b','CN_MAINLAND');await assert.rejects(f.chat.send('account-a',message(f.contact.id,'Must roll back'),'send-region-race'));
 const history=await f.chat.thread('account-a',f.contact.id);assert.equal(history.messages.length,1);assert.equal(history.last_sequence,1);assert.equal((await f.chat.inbox('account-b')).unread_total,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_conversation_messages WHERE idempotency_key=?').get('send-region-race').n,0);
});

test('communication region: legacy material-grant conversations cannot bypass current declarations or replay checks',async t=>{
 const f=await grantFixture(t);await assert.rejects(f.chat.send('supplier',message(f.g.grant.id),'unknown-send'),{code:'COMMUNICATION_REGION_REQUIRED'});await choose(f,'supplier');await choose(f,'buyer');const data=message(f.g.grant.id);await f.chat.send('supplier',data,'legacy-send');
 await choose(f,'buyer','CN_MAINLAND');await assert.rejects(f.chat.send('supplier',data,'legacy-send'));await assert.rejects(f.chat.send('supplier',message(f.g.grant.id,'Legacy bypass'),'legacy-new'));assert.equal((await f.chat.thread('supplier',f.g.grant.id)).messages.length,1);
});

test('communication region race: legacy-grant send rolls back when peer availability changes before commit',async t=>{
 const f=await grantFixture(t);await choose(f,'supplier');await choose(f,'buyer');f.db.beforeBatch=()=>choose(f,'buyer','CN_MAINLAND');await assert.rejects(f.chat.send('supplier',message(f.g.grant.id),'legacy-region-race'));
 assert.equal(count(f,'dossivo_conversation_messages'),0);assert.equal(count(f,'dossivo_conversations'),0);assert.equal((await f.chat.inbox('buyer')).unread_total,0);
});

test('communication region: material access remains separately authorized for unknown and mainland accounts',async t=>{
 const f=await grantFixture(t);assert.equal((await f.policy.status('supplier')).service_region,'UNKNOWN');assert.equal((await f.access.buyerRead('buyer',f.g.grant.id)).grant_id,f.g.grant.id);
 await choose(f,'supplier','CN_MAINLAND');await choose(f,'buyer','CN_MAINLAND');assert.equal((await f.access.buyerRead('buyer',f.g.grant.id,'DOWNLOADED')).grant_id,f.g.grant.id);assert.equal((await f.task.exportCard('supplier',f.s.task_id,f.s.cards.at(-1).id)).id,f.s.cards.at(-1).id);
 await f.access.revoke('supplier',f.g.grant.id,'separate-material-revoke');await assert.rejects(f.access.buyerRead('buyer',f.g.grant.id),{code:'ACCESS_UNAVAILABLE'});
});

test('development communication: default construction opens unknown and mainland accounts without inventing a declaration',async t=>{
 const f=setup(t,{});const before=count(f,'dossivo_communication_regions');
 for(const actor of ['unknown','中文账户','cn@example.test']){const s=await f.policy.status(actor);assert.equal(s.mode,'DEVELOPMENT_OPEN');assert.equal(s.region_enforcement,false);assert.equal(s.service_region,'UNKNOWN');assert.equal(s.available,true);assert.equal(s.region_verified,false);await f.policy.require(actor);await f.policy.requirePeer(actor);}
 assert.equal(count(f,'dossivo_communication_regions'),before);
 await choose(f,'mainland','CN_MAINLAND');const cn=await f.policy.status('mainland');assert.equal(cn.mode,'DEVELOPMENT_OPEN');assert.equal(cn.service_region,'CN_MAINLAND');assert.equal(cn.available,true);await f.policy.require('mainland');
 const strict=new CommunicationPolicyStore(f.db,{clock:f.clock,regionEnforcement:true});await assert.rejects(strict.require('mainland'),{code:'COMMUNICATION_NOT_AVAILABLE'});await assert.rejects(strict.require('unknown'),{code:'COMMUNICATION_REGION_REQUIRED'});
});

test('development communication: unknown and mainland parties can discover, request, consent, recommend and exchange Chinese messages',async t=>{
 const f=setup(t,{});await choose(f,'account-b','CN_MAINLAND');const a=await f.contacts.ensureProfile('account-a',registration('合成出口企业')),b=await f.contacts.ensureProfile('account-b',registration('合成中文买方'));
 assert.equal((await f.contacts.lookup('account-a',b.public_id)).display_name,'合成中文买方');assert.equal((await f.contacts.lookup('account-b',a.public_id)).public_id,a.public_id);assert.equal((await f.contacts.publicProfile(b.public_id)).identity_verified,false);
 await f.contacts.request('account-a',requestData(b.public_id),'dev-request');const request=(await f.contacts.requests('account-b')).incoming[0];assert.equal((await f.contacts.requests('account-a')).contacts.length,0);await f.contacts.respond('account-b',{request_id:request.id,decision:'ACCEPT'},'dev-accept');const contact=(await f.contacts.requests('account-a')).contacts[0];
 await f.chat.send('account-a',message(contact.id,'你好，这是合成测试消息。'),'dev-chinese-a');await f.chat.send('account-b',message(contact.id,'已收到，可以直接用中文回复。'),'dev-chinese-b');assert.deepEqual((await f.chat.thread('account-a',contact.id)).messages.map(m=>m.body),['你好，这是合成测试消息。','已收到，可以直接用中文回复。']);
 const forward=await f.contacts.referral('account-a',{public_id:b.public_id},'dev-recommend-b'),reverse=await f.contacts.referral('account-b',{public_id:a.public_id},'dev-recommend-a');assert.equal((await f.contacts.referralInfo(forward.token)).recommender_display_name,'合成出口企业');assert.equal((await f.contacts.referralInfo(reverse.token)).target_public_id,a.public_id);
 assert.equal((await f.policy.status('account-a')).service_region,'UNKNOWN');assert.equal((await f.policy.status('account-b')).service_region,'CN_MAINLAND');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_communication_regions WHERE actor_id=?').get('account-a').n,0);assert.equal(count(f,'dossivo_basic_grants'),0);
 const strictPolicy=new CommunicationPolicyStore(f.db,{clock:f.clock,regionEnforcement:true}),strictContacts=new ContactStore(f.db,{clock:f.clock,regionEnforcement:true}),strictChat=new ConversationStore(f.db,{clock:f.clock,regionEnforcement:true});
 await assert.rejects(strictPolicy.require('account-a'),{code:'COMMUNICATION_REGION_REQUIRED'});await assert.rejects(strictPolicy.require('account-b'),{code:'COMMUNICATION_NOT_AVAILABLE'});await assert.rejects(strictContacts.lookup('account-a',b.public_id));await assert.rejects(strictContacts.publicProfile(b.public_id));await assert.rejects(strictChat.send('account-b',message(contact.id,'严格开关不得被绕过'),'strict-cn-message'));assert.equal((await strictChat.thread('account-a',contact.id)).messages.length,2);assert.equal((await strictChat.thread('account-a',contact.id)).send_allowed,false);
});

test('development communication: prior mainland declarations unblock under explicit false while strict instances retain their own enforcement',async t=>{
 const f=setup(t,{regionEnforcement:false}),strict=new CommunicationPolicyStore(f.db,{clock:f.clock,regionEnforcement:true});await strict.select('existing-cn',{service_region:'CN_MAINLAND',confirmed:true});await assert.rejects(strict.require('existing-cn'),{code:'COMMUNICATION_NOT_AVAILABLE'});
 const profile=await f.contacts.ensureProfile('existing-cn',registration('合成现有大陆账户'));assert.equal((await f.contacts.publicProfile(profile.public_id)).public_id,profile.public_id);assert.equal((await f.policy.status('existing-cn')).available,true);assert.equal((await f.policy.status('existing-cn')).service_region,'CN_MAINLAND');await assert.rejects(strict.require('existing-cn'),{code:'COMMUNICATION_NOT_AVAILABLE'});
});

test('development communication: consent, private graph, blocks, synthetic limits and evidence permissions remain enforced',async t=>{
 const f=setup(t,{}),a=await f.contacts.ensureProfile('account-a',registration('Synthetic Alice')),b=await f.contacts.ensureProfile('account-b',registration('Synthetic Bob'));
 await assert.rejects(f.contacts.ensureProfile('real-profile',{...registration('Real profile'),synthetic_only:false}),{code:'REAL_DATA_DISABLED'});await assert.rejects(f.contacts.request('account-a',{public_id:b.public_id,synthetic_only:false},'real-request'),{code:'REAL_DATA_DISABLED'});
 await f.contacts.request('account-a',requestData(b.public_id),'private-request');const request=(await f.contacts.requests('account-b')).incoming[0];await assert.rejects(f.contacts.respond('account-a',{request_id:request.id,decision:'ACCEPT'},'forged-consent'));await assert.rejects(f.chat.send('account-a',message('dm_'+request.id),'pending-send'));assert.deepEqual(await f.contacts.requests('stranger'),{incoming:[],outgoing:[],contacts:[]});
 await f.contacts.respond('account-b',{request_id:request.id,decision:'ACCEPT'},'proper-consent');const contact=(await f.contacts.requests('account-a')).contacts[0];await assert.rejects(f.chat.send('account-a',{...message(contact.id),synthetic_only:false},'real-message'),{code:'REAL_DATA_DISABLED'});await assert.rejects(f.chat.send('account-a',{...message(contact.id),evidence_sequence:0},'ungranted-evidence'));await assert.rejects(f.chat.thread('stranger',contact.id));
 await f.chat.send('account-a',message(contact.id,'保留双方历史'),'before-block');await f.contacts.block('account-b',{contact_id:contact.id,blocked:true},'dev-block');await assert.rejects(f.chat.send('account-a',message(contact.id),'blocked-a'));await assert.rejects(f.chat.send('account-b',message(contact.id),'blocked-b'));await assert.rejects(f.contacts.referral('account-a',{public_id:b.public_id},'blocked-referral'));assert.equal((await f.chat.thread('account-b',contact.id)).messages.length,1);assert.equal(count(f,'dossivo_basic_grants'),0);assert.equal((await f.contacts.profile('account-a')).public_id,a.public_id);
});

test('development communication: legacy evidence-grant chat opens for unknown and mainland accounts while material authorization remains separate',async t=>{
 const f=await grantFixture(t,{});await choose(f,'buyer','CN_MAINLAND');await f.chat.send('supplier',message(f.g.grant.id,'合成供应方中文消息'),'dev-grant-supplier');await f.chat.send('buyer',message(f.g.grant.id,'合成买方中文回复'),'dev-grant-buyer');assert.equal((await f.chat.thread('buyer',f.g.grant.id)).messages.length,2);
 const strictChat=new ConversationStore(f.db,{clock:f.clock,regionEnforcement:true});await assert.rejects(strictChat.send('supplier',message(f.g.grant.id),'strict-unknown-grant'));await assert.rejects(strictChat.send('buyer',message(f.g.grant.id),'strict-cn-grant'));assert.equal((await strictChat.thread('buyer',f.g.grant.id)).messages.length,2);
 assert.equal((await f.access.buyerRead('buyer',f.g.grant.id,'DOWNLOADED')).grant_id,f.g.grant.id);await assert.rejects(f.access.buyerRead('stranger',f.g.grant.id),{code:'ACCESS_UNAVAILABLE'});await f.access.revoke('supplier',f.g.grant.id,'dev-material-revoke');await assert.rejects(f.access.buyerRead('buyer',f.g.grant.id),{code:'ACCESS_UNAVAILABLE'});assert.equal((await f.chat.thread('buyer',f.g.grant.id)).messages.length,2);
});

test('development communication: request payload fields cannot change server enforcement or rewrite declarations',async t=>{
 const f=setup(t,{});await assert.rejects(f.policy.select('account-a',{service_region:'CN_MAINLAND',confirmed:true,regionEnforcement:true}));await assert.rejects(f.policy.select('account-a',{service_region:'INTERNATIONAL',confirmed:true,region_enforcement:true}));assert.equal((await f.policy.status('account-a')).service_region,'UNKNOWN');assert.equal((await f.policy.status('account-a')).available,true);
 const a=await f.contacts.ensureProfile('account-a',{...registration('Synthetic Alice'),service_region:'CN_MAINLAND',regionEnforcement:true}),b=await f.contacts.ensureProfile('account-b',registration('Synthetic Bob'));await f.contacts.request('account-a',{...requestData(b.public_id),service_region:'CN_MAINLAND',regionEnforcement:true},'payload-request');const request=(await f.contacts.requests('account-b')).incoming[0];await f.contacts.respond('account-b',{request_id:request.id,decision:'ACCEPT',regionEnforcement:true},'payload-accept');const contact=(await f.contacts.requests('account-a')).contacts[0];await f.chat.send('account-a',{...message(contact.id,'请求内容不能修改服务端开关'),service_region:'CN_MAINLAND',regionEnforcement:true},'payload-message');
 assert.equal((await f.policy.status('account-a')).mode,'DEVELOPMENT_OPEN');assert.equal((await f.policy.status('account-a')).service_region,'UNKNOWN');assert.equal((await f.contacts.publicProfile(a.public_id)).public_id,a.public_id);
 const strictPolicy=new CommunicationPolicyStore(f.db,{clock:f.clock,regionEnforcement:true});await assert.rejects(strictPolicy.select('strict-cn',{service_region:'CN_MAINLAND',confirmed:true,regionEnforcement:false}));await strictPolicy.select('strict-cn',{service_region:'CN_MAINLAND',confirmed:true});await assert.rejects(strictPolicy.require('strict-cn'),{code:'COMMUNICATION_NOT_AVAILABLE'});assert.equal((await f.policy.status('strict-cn')).available,true);
});
