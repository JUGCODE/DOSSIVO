import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {COMMUNICATION_DECLARATION_VERSION} from '../lib/communication-policy.js';
import {ContactStore} from '../lib/contact-store.js';

function dbFor(sqlite){const db={beforeBatch:null,failAt:-1,prepare(sql){const make=values=>({sql,values,bind:(...v)=>make(v),first:async()=>sqlite.prepare(sql).get(...values)??null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>sqlite.prepare(sql).run(...values)});return make([]);},async batch(statements){if(db.beforeBatch){const hook=db.beforeBatch;db.beforeBatch=null;await hook();}sqlite.exec('BEGIN');try{const rows=statements.map((s,i)=>{if(i===db.failAt)throw Error('Injected failure');return sqlite.prepare(s.sql).run(...s.values);});sqlite.exec('COMMIT');return rows;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};return db;}
function setup(t){const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));// Positive baseline: these synthetic actors explicitly chose the international test service.
for(const actor of ['account-a', 'account-b', 'account-c', 'stranger', 'unregistered'])sqlite.prepare('INSERT INTO dossivo_communication_regions(actor_id,service_region,declaration_version,confirmed_at) VALUES(?,?,?,?)').run(actor,'INTERNATIONAL',COMMUNICATION_DECLARATION_VERSION,'2026-11-05T12:00:00.000Z');let now='2026-11-05T12:00:00.000Z';const clock=()=>now,db=dbFor(sqlite);return {sqlite,db,clock,setNow:value=>now=value,store:new ContactStore(db,{clock})};}
const registration=display_name=>({display_name,discoverable:true,synthetic_only:true});
async function pair(t){const f=setup(t),a=await f.store.ensureProfile('account-a',registration('Synthetic Alice')),b=await f.store.ensureProfile('account-b',registration('Synthetic Bob'));return {...f,a,b};}
async function accepted(t){const f=await pair(t);await f.store.request('account-a',{public_id:f.b.public_id,synthetic_only:true},'request');const request=(await f.store.requests('account-b')).incoming[0];await f.store.respond('account-b',{request_id:request.id,decision:'ACCEPT'},'accept');return {...f,request,contact:(await f.store.requests('account-a')).contacts[0]};}

test('contact profile: opt-in is explicit, public ID is random and stable, and exact lookup never exposes private identity fields',async t=>{
 const f=setup(t);assert.equal(await f.store.profile('account-a'),null);
 await assert.rejects(f.store.ensureProfile('account-a',{display_name:'Synthetic Alice',discoverable:true,synthetic_only:false}),{code:'REAL_DATA_DISABLED'});
 const a=await f.store.ensureProfile('account-a',registration('Synthetic Alice')),b=await f.store.ensureProfile('account-b',registration('Synthetic Bob'));
 assert.match(a.public_id,/^DS-[A-F0-9]{24}$/);assert.notEqual(a.public_id,b.public_id);
 assert.equal((await f.store.profile('account-a')).public_id,a.public_id);assert.equal((await f.store.ensureProfile('account-a',registration('Synthetic Alice'))).public_id,a.public_id);
 const lookup=await f.store.lookup('account-b',a.public_id.toLowerCase());assert.equal(lookup.public_id,a.public_id);assert.equal(lookup.display_name,'Synthetic Alice');assert.equal(lookup.identity_verified,false);
 for(const forbidden of ['account-a','email','phone','actor_id','buyer','supplier'])assert.ok(!JSON.stringify(lookup).includes(forbidden),forbidden);
 await assert.rejects(f.store.lookup('account-b',a.public_id.slice(0,-2)),{code:'CONTACT_UNAVAILABLE'});
});

test('contact requests: receiver consent is required, nonparticipants cannot see or accept requests, and no evidence grant is created',async t=>{
 const f=await pair(t);await f.store.request('account-a',{public_id:f.b.public_id,synthetic_only:true},'request');
 const a=await f.store.requests('account-a'),b=await f.store.requests('account-b'),stranger=await f.store.requests('stranger');
 assert.equal(a.outgoing.length,1);assert.equal(a.contacts.length,0);assert.equal(b.incoming.length,1);assert.deepEqual(stranger,{incoming:[],outgoing:[],contacts:[]});
 const request=b.incoming[0];await assert.rejects(f.store.respond('account-a',{request_id:request.id,decision:'ACCEPT'},'sender-accept'));await assert.rejects(f.store.respond('stranger',{request_id:request.id,decision:'ACCEPT'},'stranger-accept'));
 await f.store.respond('account-b',{request_id:request.id,decision:'ACCEPT'},'accept');
 const contacts=(await f.store.requests('account-a')).contacts;assert.equal(contacts.length,1);assert.match(contacts[0].id,/^dm_/);assert.equal(contacts[0].public_id,f.b.public_id);
 assert.equal((await f.store.requests('account-b')).contacts[0].public_id,f.a.public_id);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_basic_grants').get().n,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_conversation_messages').get().n,0);
 for(const secret of ['account-a','account-b','email','phone'])assert.ok(!JSON.stringify(contacts).includes(secret),secret);
});

test('contact requests: self contact and unregistered sender rejected; repeated keys and duplicate pair never multiply pending requests',async t=>{
 const f=await pair(t),data={public_id:f.b.public_id,synthetic_only:true};
 await assert.rejects(f.store.request('account-a',{...data,public_id:f.a.public_id},'self'));
 await assert.rejects(f.store.request('unregistered',data,'unregistered'));
 await f.store.request('account-a',data,'same');await f.store.request('account-a',data,'same');await f.store.request('account-a',data,'another');
 assert.equal((await f.store.requests('account-b')).incoming.length,1);
 await assert.rejects(f.store.request('account-a',{...data,public_id:f.a.public_id},'same'));
 await f.store.request('account-b',{public_id:f.a.public_id,synthetic_only:true},'reverse');
 assert.equal((await f.store.requests('account-a')).contacts.length,0,'crossed requests must not auto-consent');
});

test('contact decline: rejection never creates an accepted relationship and cannot be silently changed to acceptance',async t=>{
 const f=await pair(t);await f.store.request('account-a',{public_id:f.b.public_id,synthetic_only:true},'request');const request=(await f.store.requests('account-b')).incoming[0];
 await f.store.respond('account-b',{request_id:request.id,decision:'DECLINE'},'decline');assert.equal((await f.store.requests('account-a')).contacts.length,0);
 await assert.rejects(f.store.respond('account-b',{request_id:request.id,decision:'ACCEPT'},'decline'));
 assert.equal((await f.store.requests('account-b')).contacts.length,0);
});

test('contact block: one party cannot clear the other party block or mutate a third-party relationship',async t=>{
 const f=await accepted(t);await f.store.block('account-b',{contact_id:f.contact.id,blocked:true},'block-b');
 assert.equal((await f.store.requests('account-a')).contacts[0].status,'BLOCKED');
 await assert.rejects(f.store.block('stranger',{contact_id:f.contact.id,blocked:false},'stranger-unblock'));
 await f.store.block('account-a',{contact_id:f.contact.id,blocked:false},'unblock-a');assert.equal((await f.store.requests('account-a')).contacts[0].status,'BLOCKED');
 await f.store.block('account-b',{contact_id:f.contact.id,blocked:false},'unblock-b');assert.equal((await f.store.requests('account-a')).contacts[0].status,'ACCEPTED');
});

test('contact lookup: persistent per-actor throttling limits exact-ID enumeration',async t=>{
 const f=await pair(t);let limited=false;
 for(let i=0;i<100;i++){try{await f.store.lookup('account-a','DS-000000000000000000000000');}catch(e){if(e.code==='RATE_LIMITED'){limited=true;break;}assert.equal(e.code,'CONTACT_UNAVAILABLE');}}
 assert.equal(limited,true);const restarted=new ContactStore(f.db,{clock:f.clock});await assert.rejects(restarted.lookup('account-a',f.b.public_id),{code:'RATE_LIMITED'});
 assert.equal((await f.store.lookup('account-b',f.a.public_id)).public_id,f.a.public_id,'rate bucket cannot block another actor');
});

test('contact request: forged recommender metadata cannot impersonate a referral source',async t=>{
 const f=await pair(t);try{await f.store.request('account-a',{public_id:f.b.public_id,synthetic_only:true,recommender_id:'invented-account',recommender_label:'FORGED_RECOMMENDER'},'forged');}catch(e){assert.ok(['INVALID_INPUT','UNSUPPORTED_REFERRAL','CONTACT_UNAVAILABLE'].includes(e.code));}
 const incoming=await f.store.requests('account-b');assert.ok(!JSON.stringify(incoming).includes('FORGED_RECOMMENDER'));assert.ok(!JSON.stringify(incoming).includes('invented-account'));
});

test('contact opt-out: disabled discoverability blocks public lookup and new requests without rotating ID',async t=>{
 const f=await pair(t);const hidden=await f.store.ensureProfile('account-b',{...registration('Synthetic Bob'),discoverable:false});assert.equal(hidden.public_id,f.b.public_id);assert.equal(hidden.discoverable,false);
 await assert.rejects(f.store.lookup('account-a',f.b.public_id),{code:'CONTACT_UNAVAILABLE'});
 await assert.rejects(f.store.request('account-a',{public_id:f.b.public_id,synthetic_only:true},'hidden-target'),{code:'CONTACT_UNAVAILABLE'});
 const restored=await f.store.ensureProfile('account-b',registration('Synthetic Bob'));assert.equal(restored.public_id,f.b.public_id);assert.equal((await f.store.lookup('account-a',restored.public_id)).display_name,'Synthetic Bob');
});

test('contact referrals: only an accepted unblocked contact can issue a target-bound link naming the real recommender',async t=>{
 const f=await accepted(t);const c=await f.store.ensureProfile('account-c',registration('Synthetic Charlie'));
 await assert.rejects(f.store.referral('account-c',{public_id:f.b.public_id},'stranger-referral'));
 const referral=await f.store.referral('account-a',{public_id:f.b.public_id},'referral');assert.match(referral.token,/^[A-F0-9]{24}$/);
 assert.equal((await f.store.referral('account-a',{public_id:f.b.public_id},'referral')).token,referral.token);
 const info=await f.store.referralInfo(referral.token);assert.equal(info.target_public_id,f.b.public_id);assert.equal(info.recommender_public_id,f.a.public_id);assert.equal(info.recommender_display_name,'Synthetic Alice');assert.equal(info.identity_verified,false);
 await assert.rejects(f.store.request('account-c',{public_id:f.a.public_id,referral_token:referral.token,synthetic_only:true},'mismatched-referral'),{code:'CONTACT_UNAVAILABLE'});
 await f.store.request('account-c',{public_id:f.b.public_id,referral_token:referral.token,synthetic_only:true},'referred-request');
 const incoming=(await f.store.requests('account-b')).incoming.find(r=>r.public_id===c.public_id);assert.deepEqual(incoming.recommender,{display_name:'Synthetic Alice',public_id:f.a.public_id});assert.equal((await f.store.requests('account-c')).contacts.length,0,'referral does not auto-accept');
 await f.store.block('account-b',{contact_id:f.contact.id,blocked:true},'block-referrer');await assert.rejects(f.store.referralInfo(referral.token),{code:'CONTACT_UNAVAILABLE'});
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_basic_grants').get().n,0);
});

test('upgrade: contact schema preserves legacy grant conversations, message order and read positions',t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')&&x<'0011').sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 sqlite.prepare("INSERT INTO dossivo_conversations(id,grant_id,owner_id,buyer_id,status,created_at,last_sequence) VALUES('old-thread','old-grant','owner','buyer','ACTIVE','2026-11-05',3)").run();
 sqlite.prepare("INSERT INTO dossivo_conversation_messages(id,conversation_id,actor_id,kind,body,sequence,created_at,idempotency_key,command_hash) VALUES('old-message','old-thread','owner','NOTE','unchanged legacy body',3,'2026-11-05','legacy-key','legacy-hash')").run();
 sqlite.prepare("INSERT INTO dossivo_conversation_reads(conversation_id,actor_id,last_read_sequence,updated_at) VALUES('old-thread','buyer',3,'2026-11-05')").run();
 sqlite.exec(readFileSync(new URL('../drizzle/0011_famous_ego.sql',import.meta.url),'utf8'));
 const thread=sqlite.prepare("SELECT * FROM dossivo_conversations WHERE id='old-thread'").get();assert.equal(thread.grant_id,'old-grant');assert.equal(thread.contact_id,null);assert.equal(thread.last_sequence,3);
 assert.equal(sqlite.prepare("SELECT body FROM dossivo_conversation_messages WHERE id='old-message'").get().body,'unchanged legacy body');assert.equal(sqlite.prepare("SELECT last_read_sequence FROM dossivo_conversation_reads WHERE conversation_id='old-thread'").get().last_read_sequence,3);
 assert.throws(()=>sqlite.prepare("INSERT INTO dossivo_conversations(id,owner_id,buyer_id,created_at) VALUES('neither','owner','buyer','now')").run(),/CHECK/);
 assert.throws(()=>sqlite.prepare("INSERT INTO dossivo_conversations(id,grant_id,contact_id,owner_id,buyer_id,created_at) VALUES('both','g','c','owner','buyer','now')").run(),/CHECK/);
});

test('direct contact messaging: acceptance creates an independent bilateral thread without evidence grants',async t=>{
 const {ConversationStore}=await import('../lib/conversation-store.js');const f=await accepted(t),chat=new ConversationStore(f.db,{clock:f.clock});
 const sent=await chat.send('account-a',{grant_id:f.contact.id,kind:'NOTE',body:'Synthetic direct greeting',synthetic_only:true},'direct-message');assert.equal(sent.messages.length,1);assert.equal(sent.messages[0].body,'Synthetic direct greeting');assert.deepEqual(sent.reference_versions,[]);
 assert.equal((await chat.thread('account-b',f.contact.id)).messages.length,1);await assert.rejects(chat.thread('stranger',f.contact.id));
 const inbox=await chat.inbox('account-b');assert.equal(inbox.conversations.length,1);assert.equal(inbox.unread_total,1);assert.equal(inbox.conversations[0].grant_id,f.contact.id);
 for(const secret of ['account-a','account-b','snapshot_json','email'])assert.ok(!JSON.stringify(inbox).includes(secret),secret);
 await assert.rejects(chat.send('account-a',{grant_id:f.contact.id,kind:'NOTE',body:'Synthetic no reference',synthetic_only:true,evidence_sequence:0},'unauthorised-evidence'));
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_basic_grants').get().n,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_conversations WHERE grant_id IS NOT NULL').get().n,0);
});

test('direct contact messaging: pending request is not a conversation and blocking stops new sends while keeping history',async t=>{
 const {ConversationStore}=await import('../lib/conversation-store.js');const f=await pair(t),chat=new ConversationStore(f.db,{clock:f.clock});await f.store.request('account-a',{public_id:f.b.public_id,synthetic_only:true},'request');const request=(await f.store.requests('account-b')).incoming[0];
 await assert.rejects(chat.send('account-a',{grant_id:'dm_'+request.id,kind:'NOTE',body:'Too early',synthetic_only:true},'pending-send'));assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_conversation_messages').get().n,0);
 await f.store.respond('account-b',{request_id:request.id,decision:'ACCEPT'},'accept');const contact=(await f.store.requests('account-a')).contacts[0];await chat.send('account-a',{grant_id:contact.id,kind:'NOTE',body:'Existing history',synthetic_only:true},'first');
 await f.store.block('account-b',{contact_id:contact.id,blocked:true},'block');
 for(const actor of ['account-a','account-b'])await assert.rejects(chat.send(actor,{grant_id:contact.id,kind:'NOTE',body:'Blocked send',synthetic_only:true},'blocked-'+actor));
 assert.equal((await chat.thread('account-b',contact.id)).messages[0].body,'Existing history');assert.equal((await chat.inbox('account-b')).conversations.length,1);
});

test('direct contact messaging: concurrent block rolls back message and sequence increment',async t=>{
 const {ConversationStore}=await import('../lib/conversation-store.js');const f=await accepted(t),chat=new ConversationStore(f.db,{clock:f.clock});const data={grant_id:f.contact.id,kind:'NOTE',body:'Existing',synthetic_only:true};await chat.send('account-a',data,'first');
 f.db.beforeBatch=async()=>{await f.store.block('account-b',{contact_id:f.contact.id,blocked:true},'race-block');};
 await assert.rejects(chat.send('account-a',{...data,body:'Must roll back'},'racing-send'));
 const history=await chat.thread('account-b',f.contact.id);assert.equal(history.messages.length,1);assert.equal(history.last_sequence,1);assert.equal((await chat.inbox('account-b')).unread_total,1);
});

test('contact referral race: blocking before issuance commit rolls back token and idempotency operation',async t=>{
 const f=await accepted(t);const tokenCount=f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_referrals').get().n;
 f.db.beforeBatch=async()=>{await f.store.block('account-b',{contact_id:f.contact.id,blocked:true},'block-issuance');};
 await assert.rejects(f.store.referral('account-a',{public_id:f.b.public_id},'racing-referral'));
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_referrals').get().n,tokenCount);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM dossivo_contact_operations WHERE actor_id='account-a' AND key='racing-referral'").get().n,0);
});

test('referred request race: recommender block before commit rolls back pending request and operation',async t=>{
 const f=await accepted(t);await f.store.ensureProfile('account-c',registration('Synthetic Charlie'));const referral=await f.store.referral('account-a',{public_id:f.b.public_id},'valid-referral');
 const requestCount=f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_requests').get().n;
 f.db.beforeBatch=async()=>{await f.store.block('account-b',{contact_id:f.contact.id,blocked:true},'block-before-request');};
 await assert.rejects(f.store.request('account-c',{public_id:f.b.public_id,referral_token:referral.token,synthetic_only:true},'racing-referred-request'));
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_contact_requests').get().n,requestCount);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM dossivo_contact_operations WHERE actor_id='account-c' AND key='racing-referred-request'").get().n,0);
 assert.equal((await f.store.requests('account-c')).outgoing.length,0);
});

test('contact request race: both operation receipts resolve the one winning same-pair request',async t=>{
 const f=await pair(t),data={public_id:f.b.public_id,synthetic_only:true};
 f.db.beforeBatch=async()=>{await f.store.request('account-a',data,'winning-request');};
 await f.store.request('account-a',data,'losing-request');
 const incoming=(await f.store.requests('account-b')).incoming;assert.equal(incoming.length,1);
 const ops=f.sqlite.prepare("SELECT target_id FROM dossivo_contact_operations WHERE actor_id='account-a' AND key IN ('winning-request','losing-request')").all();
 assert.equal(ops.length,2);assert.ok(ops.every(op=>op.target_id===incoming[0].id));
 assert.equal((await f.store.request('account-a',data,'losing-request')).outgoing.length,1);
});
