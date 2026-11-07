import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {COMMUNICATION_DECLARATION_VERSION} from '../lib/communication-policy.js';
import {PrivateTaskStore} from '../lib/private-task-store.js';
import {BuyerAccessStore} from '../lib/buyer-access-store.js';
import {ConversationStore} from '../lib/conversation-store.js';

function dbFor(sqlite){const db={beforeBatch:null,beforeRun:null,prepare(sql){const make=values=>({sql,values,bind:(...v)=>make(v),first:async()=>sqlite.prepare(sql).get(...values)??null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>{if(db.beforeRun){const hook=db.beforeRun;db.beforeRun=null;await hook();}return sqlite.prepare(sql).run(...values);}});return make([]);},async batch(statements){if(db.beforeBatch){const hook=db.beforeBatch;db.beforeBatch=null;await hook();}sqlite.exec('BEGIN');try{const r=statements.map(s=>sqlite.prepare(s.sql).run(...s.values));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};return db;}
function setup(t){const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));// Positive baseline: these synthetic actors explicitly chose the international test service.
for(const actor of ['buyer-a', 'buyer-b', 'supplier'])sqlite.prepare('INSERT INTO dossivo_communication_regions(actor_id,service_region,declaration_version,confirmed_at) VALUES(?,?,?,?)').run(actor,'INTERNATIONAL',COMMUNICATION_DECLARATION_VERSION,'2026-11-05T12:00:00.000Z');let now='2026-11-05T12:00:00.000Z';const clock=()=>now,db=dbFor(sqlite);return {sqlite,db,clock,setNow:v=>now=v,task:new PrivateTaskStore(db,{clock}),access:new BuyerAccessStore(db,{clock}),chat:new ConversationStore(db,{clock})};}
let nonce=0;
async function cmd(f,s,action,data={}){return (await f.task.command('supplier',{task_id:s.task_id,expected_version:s.version,idempotency_key:'task-'+(++nonce),action,data})).state;}
async function fixture(t,{mode='CONTINUOUS_SUMMARY',buyer='buyer-a',follow=false}={}){const f=setup(t);let s=(await f.task.command('supplier',{action:'create',idempotency_key:'create-'+(++nonce),data:{synthetic_only:true,purpose:'SECRET_ORDER_PURPOSE',organization:'Synthetic supplier',facility:'Synthetic facility',period:'2026-10'}})).state;s=await cmd(f,s,'add_material',{sample:'normal'});s=await cmd(f,s,'assess');s=await cmd(f,s,'freeze_card');const data={task_id:s.task_id,card_id:s.cards.at(-1).id,hours:48,fields:[],categories:['electricity'],access_mode:mode,version_policy:follow?'FOLLOW_PUBLISHED':'FIXED'};const g=await f.access.createGrant('supplier',data,'grant-'+(++nonce));await f.access.redeem(buyer,g.code,'redeem-'+(++nonce));return {...f,s,g,buyer,data};}
async function send(f,actor,body,extra={},key='message-'+(++nonce)){return f.chat.send(actor,{grant_id:f.g.grant.id,kind:'NOTE',body,synthetic_only:true,...extra},key);}
const rows=inbox=>inbox.conversations;

test('inbox: only own bilateral conversations, own messages excluded from unread, material revoke/expiry do not erase history',async t=>{
 const f=await fixture(t,{mode:'TEMPORARY'});await send(f,'supplier','FIRST_PRIVATE_BODY');
 const second=await f.access.createGrant('supplier',f.data,'second-grant');await f.access.redeem('buyer-b',second.code,'second-redeem');await f.chat.send('supplier',{grant_id:second.grant.id,kind:'NOTE',body:'OTHER_BUYER_PRIVATE_BODY',synthetic_only:true},'second-message');
 let a=await f.chat.inbox('buyer-a');assert.equal(rows(a).length,1);assert.equal(rows(a)[0].grant_id,f.g.grant.id);assert.equal(rows(a)[0].unread_count,1);assert.equal(a.unread_total,1);
 assert.equal((await f.chat.inbox('supplier')).unread_total,0);assert.deepEqual(rows(await f.chat.inbox('stranger')),[]);
 for(const secret of ['FIRST_PRIVATE_BODY','OTHER_BUYER_PRIVATE_BODY','SECRET_ORDER_PURPOSE','buyer-b','code_hash','snapshot_json'])assert.ok(!JSON.stringify(a).includes(secret),secret);
 f.setNow('2026-11-10T12:00:00.000Z');assert.equal(rows(await f.chat.inbox('buyer-a')).length,1);await f.access.revoke('supplier',f.g.grant.id,'revoked');assert.equal(rows(await f.chat.inbox('buyer-a')).length,1);assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,1);
 await assert.rejects(f.access.buyerRead('buyer-a',f.g.grant.id),{code:'ACCESS_UNAVAILABLE'});
});

test('unread: stable sequence for equal timestamps and monotonically advancing read cursor',async t=>{
 const f=await fixture(t);await send(f,'supplier','one');await send(f,'supplier','two');await send(f,'buyer-a','own message');
 const thread=await f.chat.thread('buyer-a',f.g.grant.id);assert.deepEqual(thread.messages.map(m=>m.body),['one','two','own message']);assert.equal(thread.messages[0].created_at,thread.messages[1].created_at);assert.ok(thread.messages[0].sequence<thread.messages[1].sequence);assert.equal(thread.last_sequence,thread.messages.at(-1).sequence);
 assert.equal((await f.chat.inbox('buyer-a')).unread_total,2);
 let mark=await f.chat.markRead('buyer-a',{grant_id:f.g.grant.id,through_message_id:thread.messages[1].id});assert.equal(mark.read_through_sequence,thread.messages[1].sequence);assert.equal((await f.chat.inbox('buyer-a')).unread_total,0);
 mark=await f.chat.markRead('buyer-a',{grant_id:f.g.grant.id,through_message_id:thread.messages[0].id});assert.equal(mark.read_through_sequence,thread.messages[1].sequence);
 assert.equal((await f.chat.inbox('supplier')).unread_total,1);
 await assert.rejects(f.chat.markRead('buyer-b',{grant_id:f.g.grant.id,through_message_id:thread.messages[0].id}),{code:'CONVERSATION_UNAVAILABLE'});
 await assert.rejects(f.chat.markRead('buyer-a',{grant_id:f.g.grant.id,through_message_id:'foreign-message'}));
});

test('unread: message arriving during mark-read remains unread rather than being consumed by a timestamp watermark',async t=>{
 const f=await fixture(t);const initial=await send(f,'supplier','seen');const seen=initial.messages.at(-1);
 f.db.beforeBatch=async()=>{await send(f,'supplier','arrived while marking read');};
 await f.chat.markRead('buyer-a',{grant_id:f.g.grant.id,through_message_id:seen.id});assert.equal((await f.chat.inbox('buyer-a')).unread_total,1);
 const thread=await f.chat.thread('buyer-a',f.g.grant.id);assert.equal(thread.messages.at(-1).body,'arrived while marking read');
});

test('thread pagination: newest page and older page have no duplication even with identical timestamps',async t=>{
 const f=await fixture(t);for(let i=0;i<103;i++)await send(f,'supplier','message '+i);
 const latest=await f.chat.thread('buyer-a',f.g.grant.id);assert.equal(latest.messages.length,100);assert.equal(latest.messages[0].body,'message 3');assert.equal(latest.messages.at(-1).body,'message 102');assert.equal(latest.has_earlier,true);
 const older=await f.chat.thread('buyer-a',f.g.grant.id,latest.messages[0].sequence);assert.deepEqual(older.messages.map(m=>m.body),['message 0','message 1','message 2']);assert.equal(older.has_earlier,false);
 assert.equal(new Set([...older.messages,...latest.messages].map(m=>m.id)).size,103);
});

test('card reference: stored as fixed identity only, opening rechecks grant and never treats owner preview as buyer evidence usage',async t=>{
 const f=await fixture(t,{follow:true});const eventsBefore=f.sqlite.prepare("SELECT COUNT(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n;
 const sent=await send(f,'supplier','Reference to initial fixed card',{evidence_sequence:0});const m=sent.messages.at(-1);assert.deepEqual(m.reference,{sequence:0,card_id:f.s.cards.at(-1).id});
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n,eventsBefore);
 const thread=await f.chat.thread('buyer-a',f.g.grant.id);assert.ok(!JSON.stringify(thread).includes('snapshot'));assert.ok(!JSON.stringify(thread).includes('SECRET_ORDER_PURPOSE'));
 const owner=await f.chat.reference('supplier',f.g.grant.id,m.id);assert.equal(owner.snapshot.source_card_id,f.s.cards.at(-1).id);assert.deepEqual(owner.snapshot.parameters,[]);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n,eventsBefore);
 const buyer=await f.chat.reference('buyer-a',f.g.grant.id,m.id);assert.equal(buyer.snapshot.source_card_id,f.s.cards.at(-1).id);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n,eventsBefore+1);
 await assert.rejects(f.chat.reference('buyer-b',f.g.grant.id,m.id),{code:'CONVERSATION_UNAVAILABLE'});
 await f.access.revoke('supplier',f.g.grant.id,'revoke-reference');assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,1);
 for(const actor of ['supplier','buyer-a'])await assert.rejects(f.chat.reference(actor,f.g.grant.id,m.id));
 await assert.rejects(send(f,'supplier','Cannot add revoked reference',{evidence_sequence:0}));
});

test('card reference: unpublished and foreign sequences fail; later publications never change the original reference',async t=>{
 const f=await fixture(t,{follow:true});const originalCard=f.s.cards.at(-1).id;const sent=await send(f,'supplier','Fixed reference',{evidence_sequence:0});const m=sent.messages.at(-1);
 let s=await cmd(f,f.s,'assess');s=await cmd(f,s,'freeze_card');await assert.rejects(send(f,'supplier','Unpublished sequence',{evidence_sequence:1}));
 const preview=await f.access.previewPublication('supplier',{grant_id:f.g.grant.id,card_id:s.cards.at(-1).id});await f.access.publishSummary('supplier',preview,'publish-reference-test');
 assert.equal((await f.chat.reference('buyer-a',f.g.grant.id,m.id)).snapshot.source_card_id,originalCard);
 const latest=await send(f,'supplier','Published later card',{evidence_sequence:1});assert.equal(latest.messages.at(-1).reference.card_id,s.cards.at(-1).id);
 await assert.rejects(f.chat.reference('buyer-a',f.g.grant.id,'foreign-message'));
 for(const sequence of [-1,1.5,99])await assert.rejects(send(f,'supplier','Invalid reference',{evidence_sequence:sequence}));
});

test('card reference: revoke between validation and message commit rolls back the new reference and unread change',async t=>{
 const f=await fixture(t);await send(f,'supplier','Existing text');const before=(await f.chat.thread('buyer-a',f.g.grant.id)).messages.length;
 f.db.beforeBatch=async()=>{await f.access.revoke('supplier',f.g.grant.id,'reference-race');};
 await assert.rejects(send(f,'supplier','Racing reference',{evidence_sequence:0}));assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,before);assert.equal((await f.chat.inbox('buyer-a')).unread_total,1);
});

test('reference idempotency: same key cannot change fixed version and concurrent conflicting messages return a conflict',async t=>{
 const f=await fixture(t,{follow:true});const data={grant_id:f.g.grant.id,kind:'NOTE',body:'Same text',synthetic_only:true,evidence_sequence:0};
 const first=await f.chat.send('supplier',data,'reference-key');await f.chat.send('supplier',data,'reference-key');assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,1);
 await assert.rejects(f.chat.send('supplier',{...data,evidence_sequence:1},'reference-key'),{code:'IDEMPOTENCY_CONFLICT'});
 f.db.beforeBatch=async()=>{await f.chat.send('supplier',{...data,body:'Winning concurrent message'},'race-key');};
 await assert.rejects(f.chat.send('supplier',{...data,body:'Losing concurrent message'},'race-key'),{code:'IDEMPOTENCY_CONFLICT'});
 const all=await f.chat.thread('buyer-a',f.g.grant.id);assert.equal(all.messages.length,2);assert.equal(all.messages[0].id,first.messages[0].id);assert.equal(all.messages.at(-1).body,'Winning concurrent message');
});

test('upgrade: existing same-time messages retain their order and continue with a unique monotonic sequence',t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort();
 for(const file of files.filter(x=>x<'0010'))sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 sqlite.prepare("INSERT INTO dossivo_conversations(id,grant_id,owner_id,buyer_id,status,created_at) VALUES('legacy','grant','owner','buyer','ACTIVE','2026-11-05')").run();
 for(const id of ['c','a','b'])sqlite.prepare("INSERT INTO dossivo_conversation_messages(id,conversation_id,actor_id,kind,body,created_at,idempotency_key,command_hash) VALUES(?,'legacy','owner','NOTE',?,'2026-11-05',?,?)").run(id,'body-'+id,id,id);
 sqlite.exec(readFileSync(new URL('../drizzle/0010_right_puck.sql',import.meta.url),'utf8'));
 assert.deepEqual(sqlite.prepare('SELECT id,sequence FROM dossivo_conversation_messages ORDER BY sequence').all().map(r=>[r.id,r.sequence]),[['a',1],['b',2],['c',3]]);
 assert.equal(sqlite.prepare("SELECT last_sequence FROM dossivo_conversations WHERE id='legacy'").get().last_sequence,3);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM dossivo_conversation_reads').get().n,0);
 assert.throws(()=>sqlite.prepare("UPDATE dossivo_conversation_messages SET sequence=1 WHERE id='c'").run(),/UNIQUE/);
});
test('reference integrity: corrupted fixed card identity rejected for both parties and task changes warn supplier',async t=>{
 const f=await fixture(t,{follow:true});const sent=await send(f,'supplier','Fixed card',{evidence_sequence:0}),message=sent.messages.at(-1);
 await cmd(f,f.s,'add_material',{sample:'normal'});
 assert.equal((await f.chat.reference('supplier',f.g.grant.id,message.id)).current_status.review_status,'UPDATE_REVIEW_REQUIRED');
 f.sqlite.prepare("UPDATE dossivo_conversation_messages SET evidence_card_id='corrupt' WHERE id=?").run(message.id);
 for(const actor of ['supplier','buyer-a'])await assert.rejects(f.chat.reference(actor,f.g.grant.id,message.id),{code:'INTEGRITY_FAILED'});
});

const structuredSend=(f,actor,structured,extra={},key='structured-'+(++nonce))=>f.chat.send(actor,{grant_id:f.g.grant.id,structured,synthetic_only:true,...extra},key);
test('structured request persists fixed fields and server text; response and authorised card retain audit identity',async t=>{
 const f=await fixture(t);const request=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'social_insurance',period:'2026-10'})).messages.at(-1);
 assert.deepEqual(request.structured,{type:'REQUEST',topic:'social_insurance',period:'2026-10'});assert.match(request.body,/社保/);
 const prep=(await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:request.id})).messages.at(-1);assert.equal(prep.reply_to,request.id);
 const card=(await structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:request.id,evidence_sequence:0})).messages.at(-1);assert.equal(card.reference.card_id,f.s.cards.at(-1).id);
 const before=f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n;
 await f.chat.thread('buyer-a',f.g.grant.id);assert.equal(f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n,before);
 await f.chat.reference('buyer-a',f.g.grant.id,card.id);assert.equal(f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n,before+1);
});
test('structured requests reject arbitrary fields, invalid periods, forged body and unsupported decisions',async t=>{
 const f=await fixture(t);
 for(const value of [{type:'REQUEST',topic:'electricity',period:'2026-13'},{type:'REQUEST',topic:'salary_exact',period:'2026-10'},{type:'REQUEST',topic:'electricity',period:'2026-10',amount:99},{type:'RESPONSE',status:'COMPLIANT'}])await assert.rejects(structuredSend(f,'buyer-a',value),{code:'INVALID_INPUT'});
 await assert.rejects(structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'},{body:'forged'}),{code:'INVALID_INPUT'});
 assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,0);
});
test('structured responses reject self, foreign participant and ordinary text targets',async t=>{
 const f=await fixture(t);const request=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 await assert.rejects(structuredSend(f,'buyer-a',{type:'RESPONSE',status:'PREPARING'},{reply_to:request.id}),{code:'INVALID_INPUT'});
 await assert.rejects(structuredSend(f,'buyer-b',{type:'RESPONSE',status:'PREPARING'},{reply_to:request.id}),{code:'CONVERSATION_UNAVAILABLE'});
 const plain=(await send(f,'buyer-a','ordinary')).messages.at(-1);
 await assert.rejects(structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:plain.id}),{code:'INVALID_INPUT'});
 await assert.rejects(structuredSend(f,'supplier',{type:'REQUEST',topic:'audit',period:'2026-10'}),{code:'INVALID_ACTION'});
});
test('structured send replay is idempotent; changed decision conflicts',async t=>{
 const f=await fixture(t);const req={type:'REQUEST',topic:'electricity',period:'2026-10'};
 await structuredSend(f,'buyer-a',req,{},'fixed-key');await structuredSend(f,'buyer-a',req,{},'fixed-key');assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,1);
 await assert.rejects(structuredSend(f,'buyer-a',{...req,period:'2026-09'},{},'fixed-key'),{code:'IDEMPOTENCY_CONFLICT'});
});
test('structured card response requires valid grant and rechecks revoke at transaction; history survives',async t=>{
 const f=await fixture(t);const request=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'evidence_card',period:'2026-10'})).messages.at(-1);
 await assert.rejects(structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:request.id}),{code:'INVALID_INPUT'});
 f.db.beforeBatch=async()=>{await f.access.revoke('supplier',f.g.grant.id,'structured-revoke-race');};
 await assert.rejects(structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:request.id,evidence_sequence:0}));
 assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,1);
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'UNAVAILABLE'},{reply_to:request.id});assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,2);
});
test('structured requests still require synthetic confirmation',async t=>{
 const f=await fixture(t);await assert.rejects(structuredSend(f,'buyer-a',{type:'REQUEST',topic:'workforce',period:'2026-10'},{synthetic_only:false}),{code:'REAL_DATA_DISABLED'});
});
test('structured direct contacts can request and respond without gaining card access; block stops sends',async t=>{
 const f=setup(t);f.g={grant:{id:'dm_structured'}};
 f.sqlite.prepare('INSERT INTO dossivo_contacts(id,pair_key,owner_id,peer_id,created_at) VALUES(?,?,?,?,?)').run('dm_structured','pair','supplier','buyer-a',f.clock());
 const request=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'})).messages.at(-1);
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:request.id});
 await assert.rejects(structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:request.id,evidence_sequence:0}),{code:'CONVERSATION_READ_ONLY'});
 assert.equal((await f.chat.thread('supplier','dm_structured')).reference_versions.length,0);
 f.sqlite.prepare('UPDATE dossivo_contacts SET owner_blocked=1 WHERE id=?').run('dm_structured');
 await assert.rejects(structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'}),{code:'CONVERSATION_READ_ONLY'});
 assert.equal((await f.chat.thread('supplier','dm_structured')).messages.length,2);
});
test('request tracker derives latest structured response by sequence and ignores plain text',async t=>{
 const f=await fixture(t);const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'})).messages.at(-1);
 assert.equal((await f.chat.requests('buyer-a',f.g.grant.id)).requests[0].status,'AWAITING_RESPONSE');
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:q.id});
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'UNAVAILABLE'},{reply_to:q.id});
 await send(f,'supplier','ordinary reply',{kind:'REPLY',reply_to:q.id});
 const result=await f.chat.requests('buyer-a',f.g.grant.id);assert.equal(result.requests[0].status,'UNAVAILABLE');assert.equal(result.requests[0].mine,true);assert.equal(result.requests[0].response.sequence,3);
 assert.equal((await f.chat.requests('supplier',f.g.grant.id)).requests[0].mine,false);
});
test('request tracker authorises members, preserves revoked history, and never reads evidence implicitly',async t=>{
 const f=await fixture(t);const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:q.id,evidence_sequence:0});
 const before=f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n;
 const page=await f.chat.requests('buyer-a',f.g.grant.id);assert.equal(page.requests[0].response.reference.card_id,f.s.cards.at(-1).id);
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n,before);
 assert.ok(!JSON.stringify(page).includes('snapshot'));assert.ok(!JSON.stringify(page).includes('supplier'));
 await assert.rejects(f.chat.requests('buyer-b',f.g.grant.id),{code:'CONVERSATION_UNAVAILABLE'});
 await f.access.revoke('supplier',f.g.grant.id,'tracker-revoke');assert.equal((await f.chat.requests('buyer-a',f.g.grant.id)).requests[0].status,'CARD_SHARED');
 await assert.rejects(f.chat.reference('buyer-a',f.g.grant.id,page.requests[0].response.id));
});
test('request tracker paginates independently of newest 100 messages without omission',async t=>{
 const f=await fixture(t);for(let i=0;i<52;i++)await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'});
 for(let i=0;i<101;i++)await send(f,'supplier','later conversation');
 assert.ok((await f.chat.thread('buyer-a',f.g.grant.id)).messages.every(m=>!m.structured));
 const a=await f.chat.requests('buyer-a',f.g.grant.id),b=await f.chat.requests('buyer-a',f.g.grant.id,a.next_before);
 assert.equal(a.requests.length,50);assert.equal(b.requests.length,2);assert.equal(b.next_before,null);assert.equal(new Set([...a.requests,...b.requests].map(q=>q.id)).size,52);
 await assert.rejects(f.chat.requests('buyer-a',f.g.grant.id,-1));
});
function linkPair(f){f.sqlite.prepare('INSERT INTO dossivo_contacts(id,pair_key,owner_id,peer_id,created_at) VALUES(?,?,?,?,?)').run('dm_linked','linked-pair','supplier','buyer-a',f.clock());}
test('related grants expose only redeemed pair scopes, not unredeemed or another buyer grants',async t=>{
 const f=await fixture(t);linkPair(f);await f.access.createGrant('supplier',f.data,'unredeemed-linked');
 const other=await f.access.createGrant('supplier',f.data,'other-linked');await f.access.redeem('buyer-b',other.code,'other-linked-redeem');
 const a=await f.chat.relatedGrants('buyer-a','dm_linked');assert.equal(a.grants.length,1);assert.equal(a.grants[0].grant_id,f.g.grant.id);assert.equal(a.grants[0].buyer,true);assert.equal(a.grants[0].evidence_active,true);
 const owner=await f.chat.relatedGrants('supplier','dm_linked');assert.equal(owner.grants[0].buyer,false);
 for(const secret of ['snapshot_json','parameters','code_hash','SECRET_ORDER_PURPOSE','buyer-b'])assert.ok(!JSON.stringify(a).includes(secret));
 await assert.rejects(f.chat.relatedGrants('buyer-b','dm_linked'),{code:'CONVERSATION_UNAVAILABLE'});
 await assert.rejects(f.chat.relatedGrants('buyer-a',f.g.grant.id),{code:'CONVERSATION_UNAVAILABLE'});
});
test('related grants do not create conversations, mark read or record evidence views, and expose revoked state',async t=>{
 const f=await fixture(t);linkPair(f);const events=f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n;
 await f.chat.relatedGrants('buyer-a','dm_linked');assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_conversations').get().n,0);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_conversation_reads').get().n,0);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n,events);
 await f.access.revoke('supplier',f.g.grant.id,'linked-revoke');assert.equal((await f.chat.relatedGrants('buyer-a','dm_linked')).grants[0].evidence_active,false);
 await assert.rejects(f.access.buyerRead('buyer-a',f.g.grant.id));
});
test('related grants pagination covers all redeemed pair grants without duplicate entries',async t=>{
 const f=await fixture(t);linkPair(f);for(let i=0;i<50;i++){f.setNow(new Date(Date.UTC(2026,10,5,12,(i+1)*16)).toISOString());const g=await f.access.createGrant('supplier',f.data,'linked-page-'+i);await f.access.redeem('buyer-a',g.code,'linked-red-'+i);}
 const a=await f.chat.relatedGrants('buyer-a','dm_linked'),b=await f.chat.relatedGrants('buyer-a','dm_linked',a.next_before);assert.equal(a.grants.length,50);assert.equal(b.grants.length,1);assert.equal(b.next_before,null);assert.equal(new Set([...a.grants,...b.grants].map(g=>g.grant_id)).size,51);
});

import {WorkbenchRequests} from '../lib/workbench-requests.js';
test('workbench incoming requests automatically map grant-owned task and reflect latest response without completing findings',async t=>{
 const f=await fixture(t),work=new WorkbenchRequests(f.db,{clock:f.clock});const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'})).messages.at(-1);
 let page=await work.queue('supplier');assert.equal(page.requests[0].task_id,f.s.task_id);assert.equal(page.requests[0].status,'AWAITING_RESPONSE');assert.equal((await work.queue('buyer-a')).requests.length,0);assert.equal((await work.queue('stranger')).requests.length,0);
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:q.id});page=await work.queue('supplier');assert.equal(page.requests[0].status,'PREPARING');assert.equal((await f.task.read('supplier',f.s.task_id)).version,f.s.version);
});
test('workbench contact request binding is private, durable, idempotent and does not grant evidence',async t=>{
 const f=await fixture(t);linkPair(f);const work=new WorkbenchRequests(f.db,{clock:f.clock});const q=(await f.chat.send('buyer-a',{grant_id:'dm_linked',structured:{type:'REQUEST',topic:'electricity',period:'2026-10'},synthetic_only:true},'queue-contact')).messages.at(-1);
 assert.equal((await work.queue('supplier')).requests[0].task_id,null);
 await work.bind('supplier',{request_id:q.id,task_id:f.s.task_id});await work.bind('supplier',{request_id:q.id,task_id:f.s.task_id});assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_request_tasks').get().n,1);
 assert.equal((await work.queue('supplier')).requests[0].task_id,f.s.task_id);assert.equal((await work.queue('buyer-a')).requests.length,0);assert.equal((await f.chat.thread('buyer-a','dm_linked')).reference_versions.length,0);
 await assert.rejects(work.bind('buyer-a',{request_id:q.id,task_id:f.s.task_id}),{code:'REQUEST_UNAVAILABLE'});await assert.rejects(work.bind('stranger',{request_id:q.id,task_id:f.s.task_id}),{code:'REQUEST_UNAVAILABLE'});
});
test('workbench binding rejects scope mismatch and changing an existing association',async t=>{
 const f=await fixture(t);linkPair(f);const work=new WorkbenchRequests(f.db,{clock:f.clock});const q=(await f.chat.send('buyer-a',{grant_id:'dm_linked',structured:{type:'REQUEST',topic:'audit',period:'2026-10'},synthetic_only:true},'queue-scope')).messages.at(-1);
 const make=async(period,key)=>(await f.task.command('supplier',{action:'create',idempotency_key:key,data:{synthetic_only:true,purpose:'Synthetic request',organization:'Synthetic',facility:'Synthetic',period}})).state;
 const mismatch=await make('2026-09','queue-mismatch');await assert.rejects(work.bind('supplier',{request_id:q.id,task_id:mismatch.task_id}),{code:'SCOPE_MISMATCH'});
 await work.bind('supplier',{request_id:q.id,task_id:f.s.task_id});const other=await make('2026-10','queue-other');await assert.rejects(work.bind('supplier',{request_id:q.id,task_id:other.task_id}),{code:'REQUEST_ALREADY_LINKED'});
});
test('workbench incoming queue paginates all requests and excludes ordinary messages',async t=>{
 const f=await fixture(t),work=new WorkbenchRequests(f.db,{clock:f.clock});for(let i=0;i<52;i++)await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'});await send(f,'buyer-a','plain');
 const a=await work.queue('supplier'),b=await work.queue('supplier',a.next_before);assert.equal(a.requests.length,50);assert.equal(b.requests.length,2);assert.equal(b.next_before,null);assert.equal(new Set([...a.requests,...b.requests].map(q=>q.id)).size,52);
});
test('workbench status filter uses latest response before pagination and rejects unknown states',async t=>{
 const f=await fixture(t),work=new WorkbenchRequests(f.db,{clock:f.clock});
 const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'});
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:q.id});
 assert.equal((await work.queue('supplier',null,'AWAITING_RESPONSE')).requests.length,1);
 assert.equal((await work.queue('supplier',null,'PREPARING')).requests[0].id,q.id);
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'UNAVAILABLE'},{reply_to:q.id});
 assert.equal((await work.queue('supplier',null,'PREPARING')).requests.length,0);
 assert.equal((await work.queue('supplier',null,'UNAVAILABLE')).requests[0].id,q.id);
 await assert.rejects(work.queue('supplier',null,'COMPLIANT'),{code:'INVALID_INPUT'});
});
test('workbench counts cover all pages and filters, stay tenant isolated, and count latest response once',async t=>{
 const f=await fixture(t),work=new WorkbenchRequests(f.db,{clock:f.clock});let first;
 for(let i=0;i<51;i++){const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);if(!first)first=q;}
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:first.id});await structuredSend(f,'supplier',{type:'RESPONSE',status:'UNAVAILABLE'},{reply_to:first.id});
 const a=await work.queue('supplier',null,'UNAVAILABLE');assert.equal(a.requests.length,1);assert.deepEqual(a.counts,{ALL:51,AWAITING_RESPONSE:50,PREPARING:0,UNAVAILABLE:1,CARD_SHARED:0});
 const full=await work.queue('supplier'),second=await work.queue('supplier',full.next_before);assert.deepEqual(second.counts,a.counts);assert.equal((await work.queue('stranger')).counts.ALL,0);assert.equal((await work.queue('buyer-a')).counts.ALL,0);
});
test('workbench evidence topics compose with latest status, paginate independently and preserve private totals',async t=>{
 const f=await fixture(t),work=new WorkbenchRequests(f.db,{clock:f.clock});
 for(let i=0;i<51;i++)await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'});
 const audit=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:audit.id});
 const a=await work.queue('supplier',null,'AWAITING_RESPONSE','electricity');
 const b=await work.queue('supplier',a.next_before,'AWAITING_RESPONSE','electricity');
 assert.equal(a.requests.length,50);assert.equal(b.requests.length,1);assert.equal(b.next_before,null);
 assert.equal(new Set([...a.requests,...b.requests].map(q=>q.id)).size,51);
 assert.ok([...a.requests,...b.requests].every(q=>q.request.topic==='electricity'));
 assert.equal(a.counts.ALL,52);assert.deepEqual(a.counts,b.counts);
 assert.equal((await work.queue('supplier',null,'PREPARING','audit')).requests[0].id,audit.id);
 assert.equal((await work.queue('supplier',null,'PREPARING','electricity')).requests.length,0);
 assert.equal((await work.queue('stranger',null,'ALL','audit')).counts.ALL,0);
 assert.equal((await work.queue('buyer-a',null,'ALL','audit')).requests.length,0);
 for(const topic of ['unknown','toString',"audit' OR 1=1--",''])await assert.rejects(work.queue('supplier',null,'ALL',topic),{code:'INVALID_INPUT'});
});
test('workbench month filter composes with topic/status and rejects malformed months',async t=>{
 const f=await fixture(t),work=new WorkbenchRequests(f.db,{clock:f.clock});
 for(const period of ['2026-09','2026-10'])await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period});
 const page=await work.queue('supplier',null,'AWAITING_RESPONSE','audit','2026-09');
 assert.equal(page.requests.length,1);assert.equal(page.requests[0].request.period,'2026-09');assert.equal(page.counts.ALL,2);
 assert.equal((await work.queue('supplier',null,'PREPARING','audit','2026-09')).requests.length,0);
 assert.equal((await work.queue('stranger',null,'ALL','ALL','2026-09')).requests.length,0);
 for(const period of ['2026-13','2026-00','2026-1',"2026-09'",''])await assert.rejects(work.queue('supplier',null,'ALL','ALL',period),{code:'INVALID_INPUT'});
});
test('private task listing exposes verified month only to its owner for request matching',async t=>{
 const f=await fixture(t);
 const rows=await f.task.list('supplier');
 assert.equal(rows.find(r=>r.id===f.s.task_id).period,'2026-10');
 assert.equal((await f.task.list('buyer-a')).length,0);
 assert.ok(!JSON.stringify(rows).includes('materials'));
 f.sqlite.prepare("UPDATE dossivo_task_versions SET body_hash='tampered' WHERE task_id=?").run(f.s.task_id);
 await assert.rejects(f.task.list('supplier'),{code:'INTEGRITY_FAILED'});
});
test('matching tasks filters before pagination and isolates owners',async t=>{
 const f=await fixture(t);
 for(let i=0;i<51;i++)await f.task.command('supplier',{action:'create',idempotency_key:'match-'+i,data:{synthetic_only:true,purpose:'Synthetic',organization:'Synthetic',facility:'Synthetic',period:'2026-09'}});
 const a=await f.task.matching('supplier','2026-09'),b=await f.task.matching('supplier','2026-09',a.next_before);
 assert.equal(a.tasks.length,50);assert.equal(b.tasks.length,1);assert.equal(new Set([...a.tasks,...b.tasks].map(x=>x.id)).size,51);
 assert.equal((await f.task.matching('supplier','2026-10')).tasks[0].id,f.s.task_id);
 assert.equal((await f.task.matching('buyer-a','2026-09')).tasks.length,0);
 await assert.rejects(f.task.matching('supplier','2026-13'),{code:'INVALID_INPUT'});
});
test('collaboration boundary: revoked grant preserves request workflow but cannot send or reopen cards',async t=>{
 const f=await fixture(t),work=new WorkbenchRequests(f.db,{clock:f.clock});
 const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'electricity',period:'2026-10'})).messages.at(-1);
 const card=(await structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:q.id,evidence_sequence:0})).messages.at(-1);
 await f.access.revoke('supplier',f.g.grant.id,'boundary-revoke');
 const unread=(await f.chat.inbox('buyer-a')).unread_total;
 const page=await work.queue('supplier');assert.equal(page.requests[0].task_id,f.s.task_id);assert.equal(page.requests[0].status,'CARD_SHARED');
 assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).reference_versions.length,0);
 assert.equal((await f.chat.inbox('buyer-a')).unread_total,unread);
 await assert.rejects(f.chat.reference('buyer-a',f.g.grant.id,card.id));
 await assert.rejects(structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:q.id,evidence_sequence:0}));
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'UNAVAILABLE'},{reply_to:q.id});
 assert.equal((await work.queue('supplier')).requests[0].status,'UNAVAILABLE');
 assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.find(m=>m.id===card.id).reference.sequence,0);
});
test('collaboration boundary: blocked contact cannot bypass block through an existing grant',async t=>{
 const f=await fixture(t);linkPair(f);
 const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 f.sqlite.prepare('UPDATE dossivo_contacts SET owner_blocked=1 WHERE id=?').run('dm_linked');
 assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).send_allowed,false);
 await assert.rejects(structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:q.id}),{code:'CONVERSATION_READ_ONLY'});
 await assert.rejects(send(f,'buyer-a','blocked'),{code:'CONVERSATION_READ_ONLY'});
 assert.equal((await f.chat.thread('buyer-a',f.g.grant.id)).messages.length,1);
});
test('collaboration boundary: internal task association creates no grant, evidence view, or peer task access',async t=>{
 const f=await fixture(t);linkPair(f);const work=new WorkbenchRequests(f.db,{clock:f.clock});
 const q=(await f.chat.send('buyer-a',{grant_id:'dm_linked',structured:{type:'REQUEST',topic:'audit',period:'2026-10'},synthetic_only:true},'boundary-contact')).messages.at(-1);
 const grants=f.sqlite.prepare('SELECT count(*) n FROM dossivo_basic_grants').get().n;
 const views=f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n;
 await work.bind('supplier',{request_id:q.id,task_id:f.s.task_id});
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_basic_grants').get().n,grants);
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n,views);
 await assert.rejects(f.task.read('buyer-a',f.s.task_id),{code:'TASK_NOT_FOUND'});
 assert.equal((await f.chat.thread('buyer-a','dm_linked')).reference_versions.length,0);
});
test('complete contact request workflow: prepare, match, bind, respond, retry and mark read without disclosing task',async t=>{
 const f=await fixture(t);linkPair(f);const work=new WorkbenchRequests(f.db,{clock:f.clock});
 for(const actor of ['supplier','buyer-a'])f.sqlite.prepare('INSERT INTO dossivo_contact_profiles VALUES(?,?,?,?,?,?)').run(actor,'synthetic-'+actor,'Synthetic '+actor,1,f.clock(),f.clock());
 const request=(await f.chat.send('buyer-a',{grant_id:'dm_linked',structured:{type:'REQUEST',topic:'social_insurance',period:'2026-09'},synthetic_only:true},'flow-request')).messages.at(-1);
 const queue=await work.queue('supplier',null,'AWAITING_RESPONSE','social_insurance','2026-09');
 assert.equal(queue.requests[0].id,request.id);assert.equal(queue.requests[0].task_id,null);
 const state=(await f.task.command('supplier',{action:'create',idempotency_key:'flow-create',data:{synthetic_only:true,purpose:'Synthetic social insurance request',organization:'Synthetic',facility:'Synthetic',period:'2026-09'}})).state;
 const matches=await f.task.matching('supplier','2026-09');assert.equal(matches.tasks[0].id,state.task_id);
 await work.bind('supplier',{request_id:request.id,task_id:state.task_id});
 const payload={grant_id:'dm_linked',structured:{type:'RESPONSE',status:'PREPARING'},reply_to:request.id,synthetic_only:true};
 const first=await f.chat.send('supplier',payload,'flow-response');await f.chat.send('supplier',payload,'flow-response');
 const latest=await work.queue('supplier',null,'PREPARING','social_insurance','2026-09');
 assert.equal(latest.requests[0].task_id,state.task_id);
 const thread=await f.chat.thread('buyer-a','dm_linked');assert.equal(thread.messages.length,2);assert.equal(thread.messages[1].id,first.messages.at(-1).id);
 assert.equal((await f.chat.inbox('buyer-a')).unread_total,1);
 await f.chat.markRead('buyer-a',{grant_id:'dm_linked',through_message_id:thread.messages.at(-1).id});
 assert.equal((await f.chat.inbox('buyer-a')).unread_total,0);
 await assert.rejects(f.task.read('buyer-a',state.task_id),{code:'TASK_NOT_FOUND'});
 assert.equal(thread.reference_versions.length,0);assert.ok(!JSON.stringify(thread).includes(state.task_id));
});

async function crossRequest(f,period='2026-10'){linkPair(f);return (await f.chat.send('buyer-a',{grant_id:'dm_linked',structured:{type:'REQUEST',topic:'electricity',period},synthetic_only:true},'cross-request')).messages.at(-1);}
function crossResponse(f,q){return {grant_id:'dm_linked',reply_to:q.id,structured:{type:'RESPONSE',status:'CARD_SHARED'},evidence_grant_id:f.g.grant.id,evidence_sequence:0,synthetic_only:true};}
test('cross-card response: explicit redeemed grant connects original request, fixed reference and queue without new grants',async t=>{
 const f=await fixture(t),q=await crossRequest(f),data=crossResponse(f,q);const before=f.sqlite.prepare('SELECT count(*) n FROM dossivo_basic_grants').get().n;
 const sent=await f.chat.send('supplier',data,'cross-send'),m=sent.messages.at(-1);assert.equal(m.reply_to,q.id);assert.equal(m.reference.grant_id,f.g.grant.id);assert.equal(m.reference.sequence,0);
 assert.equal((await f.chat.send('supplier',data,'cross-send')).messages.length,2);
 const received=await f.chat.reference('buyer-a','dm_linked',m.id);assert.equal(received.grant_id,f.g.grant.id);assert.equal(received.snapshot.source_card_id,f.s.cards.at(-1).id);
 assert.equal((await f.chat.reference('supplier','dm_linked',m.id)).snapshot.source_card_id,f.s.cards.at(-1).id);
 const tracker=await f.chat.requests('buyer-a','dm_linked');assert.equal(tracker.requests[0].status,'CARD_SHARED');assert.equal(tracker.requests[0].response.reference.grant_id,f.g.grant.id);
 assert.equal((await new WorkbenchRequests(f.db,{clock:f.clock}).queue('supplier')).requests[0].status,'CARD_SHARED');
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_basic_grants').get().n,before);
 await assert.rejects(f.chat.reference('buyer-b','dm_linked',m.id),{code:'CONVERSATION_UNAVAILABLE'});
});
test('cross-card response: wrong month, wrong buyer, unredeemed grant and arbitrary note cannot attach evidence',async t=>{
 const f=await fixture(t),q=await crossRequest(f,'2026-09'),data=crossResponse(f,q);
 await assert.rejects(f.chat.send('supplier',data,'cross-month'),{code:'PERIOD_MISMATCH'});
 const other=await f.access.createGrant('supplier',f.data,'cross-other');await f.access.redeem('buyer-b',other.code,'cross-other-redeem');
 await assert.rejects(f.chat.send('supplier',{...data,evidence_grant_id:other.grant.id},'cross-other-send'),{code:'ACCESS_UNAVAILABLE'});
 const pending=await f.access.createGrant('supplier',f.data,'cross-pending');await assert.rejects(f.chat.send('supplier',{...data,evidence_grant_id:pending.grant.id},'cross-pending-send'),{code:'CONVERSATION_UNAVAILABLE'});
 await assert.rejects(f.chat.send('supplier',{grant_id:'dm_linked',kind:'NOTE',body:'synthetic',evidence_grant_id:f.g.grant.id,evidence_sequence:0,synthetic_only:true},'cross-note'),{code:'INVALID_INPUT'});
 assert.equal((await f.chat.thread('supplier','dm_linked')).messages.length,1);
});
test('cross-card response: revoke preserves reference history but blocks new reads, downloads and sends',async t=>{
 const f=await fixture(t),q=await crossRequest(f),data=crossResponse(f,q),m=(await f.chat.send('supplier',data,'cross-before-revoke')).messages.at(-1);
 await f.access.revoke('supplier',f.g.grant.id,'cross-revoke');
 for(const actor of ['supplier','buyer-a'])for(const kind of ['VIEWED','DOWNLOADED'])await assert.rejects(f.chat.reference(actor,'dm_linked',m.id,kind),{code:'ACCESS_UNAVAILABLE'});
 await assert.rejects(f.chat.send('supplier',data,'cross-after-revoke'),{code:'ACCESS_UNAVAILABLE'});
 assert.equal((await f.chat.thread('buyer-a','dm_linked')).messages.at(-1).reference.card_id,m.reference.card_id);
});
test('cross-card response: revoke during send rolls back message and sequence',async t=>{
 const f=await fixture(t),q=await crossRequest(f);f.db.beforeBatch=async()=>{await f.access.revoke('supplier',f.g.grant.id,'cross-race-revoke');};
 await assert.rejects(f.chat.send('supplier',crossResponse(f,q),'cross-race-send'),{code:'CONVERSATION_UNAVAILABLE'});
 const thread=await f.chat.thread('supplier','dm_linked');assert.equal(thread.last_sequence,1);assert.equal(thread.messages.length,1);
});
test('cross-card response: blocked contact and expired temporary grants cannot be bypassed',async t=>{
 const f=await fixture(t,{mode:'TEMPORARY'}),q=await crossRequest(f),data=crossResponse(f,q);
 f.sqlite.prepare('UPDATE dossivo_contacts SET owner_blocked=1 WHERE id=?').run('dm_linked');await assert.rejects(f.chat.send('supplier',data,'cross-block'),{code:'CONVERSATION_READ_ONLY'});
 f.sqlite.prepare('UPDATE dossivo_contacts SET owner_blocked=0 WHERE id=?').run('dm_linked');f.setNow(f.g.grant.expires_at);await assert.rejects(f.chat.send('supplier',data,'cross-expire'),{code:'ACCESS_UNAVAILABLE'});
});

test('request export: complete ordered structured history, no free text/evidence and no read side effects',async t=>{
 const f=await fixture(t);const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:q.id});
 await send(f,'supplier','PRIVATE_CHAT_NOT_FOR_REPORT',{reply_to:q.id});
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'CARD_SHARED'},{reply_to:q.id,evidence_sequence:0});
 const unread=(await f.chat.inbox('buyer-a')).unread_total,events=f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n;
 const record=await f.chat.requestRecord('buyer-a',f.g.grant.id,q.id);
 assert.equal(record.complete,true);assert.equal(record.request.mine,true);assert.equal(record.latest_status,'CARD_SHARED');
 assert.deepEqual(record.responses.map(r=>r.status),['PREPARING','CARD_SHARED']);assert.ok(record.responses[0].sequence<record.responses[1].sequence);
 assert.equal(record.responses[1].reference.card_id,f.s.cards.at(-1).id);assert.equal(record.responses[1].reference.access_status,'ACTIVE');
 for(const secret of ['PRIVATE_CHAT_NOT_FOR_REPORT','SECRET_ORDER_PURPOSE','snapshot','code_hash','supplier','buyer-a'])assert.ok(!JSON.stringify(record).includes(secret),secret);
 assert.equal((await f.chat.inbox('buyer-a')).unread_total,unread);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n,events);
 assert.equal((await f.chat.requestRecord('supplier',f.g.grant.id,q.id)).request.mine,false);
});

test('request export: outsider, foreign conversation, note and missing request rejected',async t=>{
 const f=await fixture(t);const q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 const note=(await send(f,'supplier','note')).messages.at(-1);linkPair(f);
 for(const [actor,grant,id] of [['buyer-b',f.g.grant.id,q.id],['buyer-a','dm_linked',q.id],['buyer-a',f.g.grant.id,note.id],['buyer-a',f.g.grant.id,'missing']])await assert.rejects(f.chat.requestRecord(actor,grant,id),{code:'CONVERSATION_UNAVAILABLE'});
});

test('request export: cross-contact revoked/expired references retain history without evidence access',async t=>{
 const f=await fixture(t,{mode:'TEMPORARY'}),q=await crossRequest(f);
 await f.chat.send('supplier',crossResponse(f,q),'export-card');
 f.setNow('2026-11-10T12:00:00.000Z');
 let record=await f.chat.requestRecord('buyer-a','dm_linked',q.id);assert.equal(record.responses[0].reference.access_status,'EXPIRED');
 await f.access.revoke('supplier',f.g.grant.id,'export-revoke');
 record=await f.chat.requestRecord('buyer-a','dm_linked',q.id);assert.equal(record.responses[0].reference.access_status,'REVOKED');assert.equal(record.responses[0].reference.grant_id,f.g.grant.id);
 await assert.rejects(f.chat.reference('buyer-a','dm_linked',record.responses[0].id));
});

test('request export: awaiting response and explicit overflow instead of partial report',async t=>{
 const f=await fixture(t),q=(await structuredSend(f,'buyer-a',{type:'REQUEST',topic:'audit',period:'2026-10'})).messages.at(-1);
 assert.equal((await f.chat.requestRecord('buyer-a',f.g.grant.id,q.id)).latest_status,'AWAITING_RESPONSE');
 await structuredSend(f,'supplier',{type:'RESPONSE',status:'PREPARING'},{reply_to:q.id});
 const r=f.sqlite.prepare('SELECT * FROM dossivo_conversation_messages WHERE reply_to=?').get(q.id);
 const insert=f.sqlite.prepare('INSERT INTO dossivo_conversation_messages(id,conversation_id,actor_id,kind,body,reply_to,created_at,sequence,structured_json,idempotency_key,command_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
 for(let i=0;i<500;i++)insert.run('bulk-'+i,r.conversation_id,r.actor_id,r.kind,r.body,q.id,r.created_at,i+3,r.structured_json,'bulk-key-'+i,'synthetic');
 await assert.rejects(f.chat.requestRecord('buyer-a',f.g.grant.id,q.id),{code:'EXPORT_TOO_LARGE'});
});

test('request export HTML: escapes injected values and contains no active or external resources',async()=>{
 const {requestRecordHtml}=await import('../lib/request-record-export.js');
 const report={schema:'dossivo/request-record/1',generated_at:'now',request:{topic:'<script>alert(1)</script>',period:'2026-10',id:'" onerror="attack',sequence:1,created_at:'now'},latest_status:'PREPARING',responses:[]};
 for(const lang of ['zh','en','it','bad']){const html=requestRecordHtml(report,lang);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!/<script|<iframe|<img|href=|src=/i.test(html));assert.ok(html.includes('&quot; onerror=&quot;'));}
});

test('collaboration acceptance: cross-contact request, two fixed publications, download, export, revoke and history',async t=>{
 const f=await fixture(t,{follow:true}),q=await crossRequest(f),original=f.s.cards.at(-1).id;
 await f.chat.send('supplier',{grant_id:'dm_linked',reply_to:q.id,structured:{type:'RESPONSE',status:'PREPARING'},synthetic_only:true},'accept-preparing');
 const first=(await f.chat.send('supplier',crossResponse(f,q),'accept-first')).messages.at(-1);
 const snapshot=await f.chat.reference('buyer-a','dm_linked',first.id,'DOWNLOADED');assert.equal(snapshot.snapshot.source_card_id,original);
 let state=await cmd(f,f.s,'assess');state=await cmd(f,state,'freeze_card');
 const preview=await f.access.previewPublication('supplier',{grant_id:f.g.grant.id,card_id:state.cards.at(-1).id});await f.access.publishSummary('supplier',preview,'accept-publish');
 await f.chat.send('supplier',{...crossResponse(f,q),evidence_sequence:1},'accept-second');
 const before=await f.chat.requestRecord('buyer-a','dm_linked',q.id);
 assert.deepEqual(before.responses.map(r=>r.status),['PREPARING','CARD_SHARED','CARD_SHARED']);assert.equal(before.responses[1].reference.card_id,original);assert.equal(before.responses[2].reference.card_id,state.cards.at(-1).id);
 assert.equal((await f.chat.reference('buyer-a','dm_linked',first.id)).snapshot.source_card_id,original);
 await f.access.revoke('supplier',f.g.grant.id,'accept-revoke');
 const after=await f.chat.requestRecord('buyer-a','dm_linked',q.id);
 assert.equal(after.responses.length,3);assert.deepEqual(after.responses.filter(r=>r.reference).map(r=>r.reference.access_status),['REVOKED','REVOKED']);
 for(const r of after.responses.filter(r=>r.reference))await assert.rejects(f.chat.reference('buyer-a','dm_linked',r.id,'DOWNLOADED'),{code:'ACCESS_UNAVAILABLE'});
 assert.equal(before.responses[1].reference.access_status,'ACTIVE');assert.equal(snapshot.snapshot.source_card_id,original);
 await assert.rejects(f.chat.requestRecord('buyer-b','dm_linked',q.id),{code:'CONVERSATION_UNAVAILABLE'});
});

test('collaboration acceptance: real contact consent APIs, private request, separate grant redemption, block and revoke',async t=>{
 const {ContactStore}=await import('../lib/contact-store.js');
 const f=setup(t),contacts=new ContactStore(f.db,{clock:f.clock});
 await contacts.ensureProfile('buyer-a',{display_name:'Synthetic buyer',discoverable:true,synthetic_only:true});
 const supplier=await contacts.ensureProfile('supplier',{display_name:'Synthetic supplier',discoverable:true,synthetic_only:true});
 await contacts.request('buyer-a',{public_id:supplier.public_id,synthetic_only:true},'flow-contact-request');
 assert.equal((await contacts.requests('buyer-a')).contacts.length,0);
 const incoming=(await contacts.requests('supplier')).incoming[0];
 await assert.rejects(contacts.respond('buyer-b',{request_id:incoming.id,decision:'ACCEPT'},'flow-outsider'));
 await contacts.respond('supplier',{request_id:incoming.id,decision:'ACCEPT'},'flow-accept');
 const contact=(await contacts.requests('buyer-a')).contacts[0];
 assert.equal((await f.chat.inbox('buyer-a')).conversations.length,0,'accepted contact without messages is not an inbox thread');
 assert.equal((await f.chat.thread('buyer-a',contact.id)).status,'NOT_STARTED');
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_basic_grants').get().n,0);
 const request=(await f.chat.send('buyer-a',{grant_id:contact.id,structured:{type:'REQUEST',topic:'electricity',period:'2026-10'},synthetic_only:true},'flow-material-request')).messages.at(-1);
 assert.equal((await f.chat.inbox('supplier')).unread_total,1);
 let state=(await f.task.command('supplier',{action:'create',idempotency_key:'flow-task',data:{synthetic_only:true,purpose:'PRIVATE_FLOW_PURPOSE',organization:'Synthetic company',facility:'Synthetic site',period:'2026-10'}})).state;
 state=await cmd(f,state,'add_material',{sample:'normal'});state=await cmd(f,state,'assess');state=await cmd(f,state,'freeze_card');
 await assert.rejects(f.task.read('buyer-a',state.task_id),{code:'TASK_NOT_FOUND'});
 const grant=await f.access.createGrant('supplier',{task_id:state.task_id,card_id:state.cards.at(-1).id,hours:48,fields:[],categories:['electricity'],access_mode:'CONTINUOUS_SUMMARY',version_policy:'FIXED'},'flow-grant');
 const response={grant_id:contact.id,reply_to:request.id,structured:{type:'RESPONSE',status:'CARD_SHARED'},evidence_grant_id:grant.grant.id,evidence_sequence:0,synthetic_only:true};
 await assert.rejects(f.chat.send('supplier',response,'flow-unredeemed'),{code:'CONVERSATION_UNAVAILABLE'});
 await f.access.redeem('buyer-a',grant.code,'flow-redeem');
 const card=(await f.chat.send('supplier',response,'flow-card')).messages.at(-1);
 assert.equal((await f.chat.reference('buyer-a',contact.id,card.id)).snapshot.source_card_id,state.cards.at(-1).id);
 await contacts.block('supplier',{contact_id:contact.id,blocked:true},'flow-block');
 await assert.rejects(f.chat.send('buyer-a',{grant_id:contact.id,kind:'NOTE',body:'blocked',synthetic_only:true},'flow-blocked-send'),{code:'CONVERSATION_READ_ONLY'});
 const record=await f.chat.requestRecord('buyer-a',contact.id,request.id);
 assert.equal(record.responses[0].reference.access_status,'ACTIVE','blocking communication does not silently revoke evidence');
 await f.access.revoke('supplier',grant.grant.id,'flow-revoke');
 assert.equal((await f.chat.requestRecord('buyer-a',contact.id,request.id)).responses[0].reference.access_status,'REVOKED');
 await assert.rejects(f.chat.reference('buyer-a',contact.id,card.id,'DOWNLOADED'),{code:'ACCESS_UNAVAILABLE'});
 assert.equal((await f.chat.thread('buyer-a',contact.id)).messages.length,2);
 assert.ok(!JSON.stringify(record).includes('PRIVATE_FLOW_PURPOSE'));
});
