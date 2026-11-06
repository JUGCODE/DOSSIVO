import {COMMUNICATION_DECLARATION_VERSION} from '../lib/communication-policy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrivateTaskStore} from '../lib/private-task-store.js';
import {BuyerAccessStore} from '../lib/buyer-access-store.js';
import {coverageFor} from '../lib/evidence-coverage.js';
import {cardHtml} from '../lib/basic-evidence-card.js';
function dbFor(sqlite){const db={beforeBatch:null,failAt:-1,prepare(sql){const make=v=>({sql,values:v,bind:(...n)=>make(n),first:async()=>sqlite.prepare(sql).get(...v)??null,all:async()=>({results:sqlite.prepare(sql).all(...v)}),run:async()=>sqlite.prepare(sql).run(...v)});return make([]);},async batch(statements){if(db.beforeBatch){const h=db.beforeBatch;db.beforeBatch=null;await h();}sqlite.exec('BEGIN');try{const r=statements.map((s,i)=>{if(i===db.failAt)throw Error('Injected failure');return sqlite.prepare(s.sql).run(...s.values);});sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};return db;}
function setup(t,file=':memory:'){const sqlite=new DatabaseSync(file);t.after(()=>sqlite.close());for(const n of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+n,import.meta.url),'utf8'));// Positive baseline: these synthetic actors explicitly chose the international test service.
for(const actor of ['buyer-a', 'buyer-b', 'exporter'])sqlite.prepare('INSERT INTO dossivo_communication_regions(actor_id,service_region,declaration_version,confirmed_at) VALUES(?,?,?,?)').run(actor,'INTERNATIONAL',COMMUNICATION_DECLARATION_VERSION,'2026-11-05T12:00:00.000Z');const db=dbFor(sqlite);let now='2026-11-05T12:00:00.000Z';const clock=()=>now;return{db,sqlite,store:new PrivateTaskStore(db,{clock}),access:new BuyerAccessStore(db,{clock}),setNow:x=>{now=x;},clock};}
let n=0;
async function command(store,state,action,data={}){return (await store.command('exporter',{action,idempotency_key:'task-'+(++n),task_id:state.task_id,expected_version:state.version,data})).state;}
async function card(f){let s=(await f.store.command('exporter',{action:'create',idempotency_key:'new-'+(++n),data:{synthetic_only:true,purpose:'Private order PRICE_123',organization:'Synthetic Exporter',facility:'合成工厂A',period:'2026-10'}})).state;s=await command(f.store,s,'add_material',{sample:'normal'});s=await command(f.store,s,'locate_fields',{material_id:s.materials[0].id});for(const field of s.fields)s=await command(f.store,s,'confirm_field',{field_id:field.id,value:field.extracted_value,reason:'private review NOTE_123'});s=await command(f.store,s,'open_flag',{title:'Worker identity SECRET_123',severity:'red',comment:'PRIVATE_COMPLAINT'});s=await command(f.store,s,'assess');s=await command(f.store,s,'freeze_card');return s;}
function grantData(s,hours=48){return {task_id:s.task_id,card_id:s.cards.at(-1).id,hours,fields:['kwh_monthly','si_headcount'],categories:['electricity','social_insurance']};}

test('coverage: categories are optional, directory does not count as submitted, repeated materials never inflate denominator',async t=>{const f=setup(t);let s=await card(f);let c=coverageFor(s);assert.equal(c.total_catalog,11);assert.equal(c.submitted,6);assert.equal(c.checked,0);assert.equal(c.company_confirmed,6);s=await command(f.store,s,'add_material',{sample:'normal'});assert.equal(coverageFor(s).submitted,6);s=await command(f.store,s,'add_material',{mode:'DIRECTORY',title:'合同索引',custodian:'synthetic',categories:['contract_sample']});assert.equal(coverageFor(s).submitted,6);s=await command(f.store,s,'choose_materials',{categories:['electricity']});c=coverageFor(s);assert.equal(c.selected_total,1);assert.equal(c.total_catalog,11);assert.equal(c.percent,55);assert.equal(c.independent_verification,false);});
test('material: explicit synthetic text, category, source scope, raw citation and confirmation are persisted',async t=>{const f=setup(t);let s=await card(f);await assert.rejects(command(f.store,s,'import_text',{synthetic_only:false}),{code:'REAL_DATA_DISABLED'});s=await command(f.store,s,'import_text',{synthetic_only:true,title:'用电样本',text:'用电量：900kWh',categories:['electricity'],facility:'另一工厂',period:'2026-09'});const m=s.materials.at(-1);s=await command(f.store,s,'locate_fields',{material_id:m.id});const field=s.fields.at(-1);assert.equal(field.scope.facility,'另一工厂');assert.equal(field.scope.period,'2026-09');assert.equal(m.text.slice(field.locator.start_utf16,field.locator.end_utf16),field.locator.quote);s=await command(f.store,s,'confirm_material',{material_id:m.id,reason:'self declared'});assert.equal(s.materials.at(-1).review.status,'COMPANY_CONFIRMED');assert.equal(coverageFor(s).checked,0);});
test('grant creation: 48/72-hour fixed deadline, hashed code only, no plaintext in persisted data or replay',async t=>{const f=setup(t),s=await card(f),d=grantData(s);const g=await f.access.createGrant('exporter',d,'create-code');assert.equal(g.grant.expires_at,'2026-11-07T12:00:00.000Z');assert.match(g.code,/^[A-F0-9-]{39}$/);const stored=f.sqlite.prepare('SELECT * FROM dossivo_basic_grants').get();assert.ok(!JSON.stringify(stored).includes(g.code));assert.ok(!JSON.stringify(stored).includes(g.code.replaceAll('-','')));const replay=await f.access.createGrant('exporter',d,'create-code');assert.equal(replay.grant.id,g.grant.id);assert.equal(replay.code,null);await assert.rejects(f.access.createGrant('exporter',{...d,hours:72},'create-code'),{code:'IDEMPOTENCY_CONFLICT'});const second=await f.access.createGrant('exporter',grantData(s,72),'second-code');assert.equal(second.grant.expires_at,'2026-11-08T12:00:00.000Z');await assert.rejects(f.access.createGrant('exporter',grantData(s,24),'bad-hours'),{code:'INVALID_EXPIRY'});});
test('grant projection: only explicitly chosen basic values, no source text, complaints, prices or raw metadata',async t=>{const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'grant');const r=await f.access.redeem('buyer-a',g.code,'redeem');const x=r.access.snapshot,serialized=JSON.stringify(r);assert.deepEqual(x.parameters.map(x=>x.code).sort(),['kwh_monthly','si_headcount']);assert.equal(x.materials.length,2);for(const secret of ['PRICE_123','NOTE_123','SECRET_123','PRIVATE_COMPLAINT','不得扣押证件','text_sha256','custodian','locator','raw_value'])assert.ok(!serialized.includes(secret),secret);assert.equal(x.issues.red_count,1);assert.equal(x.coverage.checked,0);assert.equal(x.formal_card,false);assert.equal(x.assessment.benchmark_status,'NOT_ASSESSED_NO_COMPARABLE_DATA');});
test('once redeemed: same account may re-read; code cannot bind a second account or be reused with a new operation',async t=>{const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'grant');const a=await f.access.redeem('buyer-a',g.code,'r');assert.equal((await f.access.buyerRead('buyer-a',g.grant.id)).grant_id,g.grant.id);assert.equal((await f.access.redeem('buyer-a',g.code,'r')).replayed,true);await assert.rejects(f.access.redeem('buyer-b',g.code,'rb'),{code:'ACCESS_UNAVAILABLE'});await assert.rejects(f.access.redeem('buyer-a',g.code,'r-new'),{code:'ACCESS_UNAVAILABLE'});await assert.rejects(f.access.buyerRead('buyer-b',a.access.grant_id),{code:'ACCESS_UNAVAILABLE'});assert.deepEqual(await f.access.buyerList('buyer-b'),[]);});
test('revoke: all future read/download and same-key redemption retry recheck current grant, history retained',async t=>{const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'g');await f.access.redeem('buyer-a',g.code,'r');await f.access.revoke('exporter',g.grant.id,'revoke');for(const kind of ['VIEWED','DOWNLOADED'])await assert.rejects(f.access.buyerRead('buyer-a',g.grant.id,kind),{code:'ACCESS_UNAVAILABLE'});await assert.rejects(f.access.redeem('buyer-a',g.code,'r'),{code:'ACCESS_UNAVAILABLE'});assert.deepEqual(await f.access.buyerList('buyer-a'),[]);assert.ok(f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_events WHERE kind='REVOKED'").get().n);await assert.rejects(f.access.revoke('other',g.grant.id,'other'),{code:'ACCESS_UNAVAILABLE'});});
test('expiry: deadline is exclusive and not extended by first redemption, repeated reads or download',async t=>{const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'g');f.setNow('2026-11-07T11:59:59.999Z');await f.access.redeem('buyer-a',g.code,'r');f.setNow('2026-11-07T12:00:00.000Z');await assert.rejects(f.access.buyerRead('buyer-a',g.grant.id),{code:'ACCESS_UNAVAILABLE'});assert.deepEqual(await f.access.buyerList('buyer-a'),[]);});
test('concurrent redemption: CAS permits one account, transaction rollback leaves no second assignment or operation',async t=>{const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'g');f.db.beforeBatch=async()=>{await f.access.redeem('buyer-b',g.code,'rb');};await assert.rejects(f.access.redeem('buyer-a',g.code,'ra'),{code:'ACCESS_UNAVAILABLE'});assert.equal((await f.access.buyerRead('buyer-b',g.grant.id)).grant_id,g.grant.id);assert.equal(f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_operations WHERE actor_id='buyer-a'").get().n,0);});
test('grant commit failure rolls back code and operation; redemption commit failure leaves code redeemable',async t=>{const f=setup(t),s=await card(f);f.db.failAt=1;await assert.rejects(f.access.createGrant('exporter',grantData(s),'g'));assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_basic_grants').get().n,0);f.db.failAt=-1;const g=await f.access.createGrant('exporter',grantData(s),'g');f.db.failAt=2;await assert.rejects(f.access.redeem('buyer-a',g.code,'r'));assert.equal(f.sqlite.prepare('SELECT redeemed_by FROM dossivo_basic_grants').get().redeemed_by,null);f.db.failAt=-1;assert.equal((await f.access.redeem('buyer-a',g.code,'r')).access.grant_id,g.grant.id);});
test('fixed version: new enterprise data does not replace granted numeric fields, but minimal issue counts remain current',async t=>{const f=setup(t);let s=await card(f);const g=await f.access.createGrant('exporter',grantData(s),'g');await f.access.redeem('buyer-a',g.code,'r');s=await command(f.store,s,'confirm_field',{field_id:s.fields.find(x=>x.code==='kwh_monthly').id,value:4000,reason:'new month correction'});s=await command(f.store,s,'open_flag',{title:'NEW_PRIVATE_SECRET',comment:'private',severity:'red'});const v=await f.access.buyerRead('buyer-a',g.grant.id);assert.equal(v.snapshot.parameters.find(x=>x.code==='kwh_monthly').value,2000);assert.equal(v.current_status.unresolved_count,2);assert.equal(v.current_status.newer_version_exists,true);assert.ok(!JSON.stringify(v).includes('NEW_PRIVATE_SECRET'));});
test('revocation between read and access-log commit blocks output without appending VIEWED',async t=>{const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'g');await f.access.redeem('buyer-a',g.code,'r');const before=f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n;f.db.beforeBatch=async()=>{await f.access.revoke('exporter',g.grant.id,'rev-race');};await assert.rejects(f.access.buyerRead('buyer-a',g.grant.id),{code:'ACCESS_UNAVAILABLE'});assert.equal(f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_events WHERE kind='VIEWED'").get().n,before);});
test('invalid-code attempts are throttled persistently per account, code contents are not logged',async t=>{const f=setup(t);for(let i=0;i<10;i++)await assert.rejects(f.access.redeem('buyer','invalid-code','r'+i),{code:'ACCESS_UNAVAILABLE'});await assert.rejects(new BuyerAccessStore(f.db,{clock:f.clock}).redeem('buyer','invalid-code','r11'),{code:'RATE_LIMITED'});assert.equal(f.sqlite.prepare('SELECT attempts FROM dossivo_access_attempts').get().attempts,11);assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n,0);});
test('HTML download is readable, escapes script-like company names, excludes private originals, logs current download',async t=>{const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'g');await f.access.redeem('buyer-a',g.code,'r');const view=await f.access.buyerRead('buyer-a',g.grant.id,'DOWNLOADED');view.snapshot.scope.organization='<script>alert(1)</script>';const html=cardHtml(view);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('Material coverage'));assert.ok(!html.includes('PRIVATE_COMPLAINT'));assert.equal(f.sqlite.prepare("SELECT count(*) n FROM dossivo_access_events WHERE kind='DOWNLOADED'").get().n,1);});
test('SQLite restart retains bound buyer, fixed fields and expiry',async t=>{const dir=mkdtempSync(join(tmpdir(),'dossivo-basic-access-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'db.sqlite'),f=setup(t,path),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'g');await f.access.redeem('buyer-a',g.code,'r');const sqlite=new DatabaseSync(path);t.after(()=>sqlite.close());const a=new BuyerAccessStore(dbFor(sqlite),{clock:f.clock});assert.equal((await a.buyerRead('buyer-a',g.grant.id)).snapshot.parameters.length,2);await assert.rejects(a.buyerRead('buyer-b',g.grant.id),{code:'ACCESS_UNAVAILABLE'});});


test('downloaded historical HTML remains usable after online expiry, with an explicit separate access deadline',async t=>{
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'g');await f.access.redeem('buyer-a',g.code,'r');
 const view=await f.access.buyerRead('buyer-a',g.grant.id,'DOWNLOADED'),html=cardHtml(view);
 f.setNow('2026-11-09T12:00:00.000Z');await assert.rejects(f.access.buyerRead('buyer-a',g.grant.id,'DOWNLOADED'),{code:'ACCESS_UNAVAILABLE'});
 assert.equal(cardHtml(view),html);assert.ok(html.includes('This deadline does not invalidate'));assert.ok(html.includes('2026-11-07T12:00:00.000Z'));assert.ok(!html.includes('<script'));assert.ok(!html.includes('<iframe'));
});

test('reuse usage: fixed versions count distinct authorised readers across codes without treating refreshes as new readers',async t=>{
 const f=setup(t);let s=await card(f);const firstId=s.cards.at(-1).id;
 const g1=await f.access.createGrant('exporter',grantData(s),'usage-g1');await f.access.redeem('buyer-a',g1.code,'usage-r1');
 await f.access.buyerRead('buyer-a',g1.grant.id);await f.access.buyerRead('buyer-a',g1.grant.id,'DOWNLOADED');
 const g2=await f.access.createGrant('exporter',grantData(s),'usage-g2');await f.access.redeem('buyer-a',g2.code,'usage-r2');
 const g3=await f.access.createGrant('exporter',grantData(s),'usage-g3');await f.access.redeem('buyer-b',g3.code,'usage-r3');
 s=await command(f.store,s,'assess');s=await command(f.store,s,'freeze_card');
 f.setNow('2026-11-05T13:00:00.000Z');
 const g4=await f.access.createGrant('exporter',grantData(s),'usage-g4');await f.access.redeem('buyer-a',g4.code,'usage-r4');
 const eventCount=f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_access_events').get().n;
 const u=await f.access.ownerUsage('exporter',s.task_id);
 assert.equal(u.format,'dossivo-evidence-reuse/0.1');assert.equal(u.synthetic_only,true);assert.equal(u.measured_at,f.clock());
 assert.deepEqual(u.totals,{grants_created:4,grants_redeemed:4,active_grants:4,revoked_grants:0,unique_reader_accounts:2,read_requests:5,download_requests:1,last_access_at:f.clock(),reused_card_versions:1});
 assert.equal(u.cards.find(c=>c.card_id===firstId).unique_reader_accounts,2);assert.equal(u.cards.find(c=>c.card_id===firstId).read_requests,4);
 assert.equal(u.cards.at(-1).unique_reader_accounts,1);assert.equal(u.cards.at(-1).task_version,s.cards.at(-1).body.task_version);
 assert.deepEqual(u.unmeasured,{verified_buyer_companies:null,purchase_acceptances:null,real_commercial_usage:null,status:'NOT_MEASURED'});
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM dossivo_access_events').get().n,eventCount);
 for(const secret of ['buyer-a','buyer-b',g1.code,'snapshot_json','choice_json','PRICE_123','NOTE_123','PRIVATE_COMPLAINT','code_hash'])assert.ok(!JSON.stringify(u).includes(secret),secret);
});

test('reuse usage: owner and task isolation, zero-card history and unused fixed cards remain explicit',async t=>{
 const f=setup(t),s=await card(f),other=await card(f);
 const g=await f.access.createGrant('exporter',grantData(other),'other-grant');await f.access.redeem('buyer-a',g.code,'other-redeem');
 await assert.rejects(f.access.ownerUsage('buyer-a',s.task_id),{code:'TASK_NOT_FOUND'});
 await assert.rejects(f.access.ownerUsage('other-owner',s.task_id),{code:'TASK_NOT_FOUND'});
 const empty=await f.access.ownerUsage('exporter',s.task_id);
 assert.equal(empty.cards.length,1);assert.equal(empty.cards[0].card_id,s.cards[0].id);
 for(const key of ['grants_created','grants_redeemed','active_grants','revoked_grants','unique_reader_accounts','read_requests','download_requests','reused_card_versions'])assert.equal(empty.totals[key],0,key);
 assert.equal(empty.totals.last_access_at,null);
 const initial=(await f.store.command('exporter',{action:'create',idempotency_key:'empty-usage-task',data:{synthetic_only:true,purpose:'Empty',organization:'Synthetic',facility:'Synthetic',period:'2026-10'}})).state;
 assert.deepEqual((await f.access.ownerUsage('exporter',initial.task_id)).cards,[]);
});

test('reuse usage: cumulative successful requests survive revoke and expiry while failures and owner events do not count',async t=>{
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'usage-grant');
 await f.access.redeem('buyer-a',g.code,'usage-redeem');await f.access.buyerRead('buyer-a',g.grant.id,'DOWNLOADED');
 await assert.rejects(f.access.buyerRead('buyer-b',g.grant.id),{code:'ACCESS_UNAVAILABLE'});
 f.sqlite.prepare('INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at) VALUES (?,?,?,?,?)').run('owner-fixture',g.grant.id,'exporter','VIEWED',f.clock());
 f.sqlite.prepare('INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at) VALUES (?,?,?,?,?)').run('unbound-fixture',g.grant.id,'unbound-reader','DOWNLOADED',f.clock());
 const pending=await f.access.createGrant('exporter',grantData(s),'usage-pending');
 assert.equal((await f.access.ownerUsage('exporter',s.task_id)).totals.active_grants,2);
 await f.access.revoke('exporter',g.grant.id,'usage-revoke');
 await assert.rejects(f.access.buyerRead('buyer-a',g.grant.id),{code:'ACCESS_UNAVAILABLE'});
 f.setNow(pending.grant.expires_at);
 const u=await f.access.ownerUsage('exporter',s.task_id);
 assert.deepEqual(u.totals,{grants_created:2,grants_redeemed:1,active_grants:0,revoked_grants:1,unique_reader_accounts:1,read_requests:1,download_requests:1,last_access_at:'2026-11-05T12:00:00.000Z',reused_card_versions:0});
});

test('reuse usage: complete SQL history is independent of the 100-grant owner-list display limit',async t=>{
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'bulk-source');await f.access.redeem('buyer-first',g.code,'bulk-redeem');
 for(let i=0;i<105;i++){
  f.sqlite.prepare(`INSERT INTO dossivo_basic_grants (id,owner_id,task_id,card_id,code_hash,snapshot_json,snapshot_hash,choice_json,created_at,expires_at,redeemed_by,redeemed_at)
   SELECT ?,owner_id,task_id,card_id,?,snapshot_json,snapshot_hash,choice_json,created_at,expires_at,?,created_at FROM dossivo_basic_grants WHERE id=?`).run('bulk-'+i,'bulk-hash-'+i,'bulk-buyer-'+i,g.grant.id);
  f.sqlite.prepare('INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at) VALUES (?,?,?,?,?)').run('bulk-event-'+i,'bulk-'+i,'bulk-buyer-'+i,'VIEWED',f.clock());
 }
 assert.equal((await f.access.ownerList('exporter',s.task_id)).length,100);
 const u=await f.access.ownerUsage('exporter',s.task_id);
 assert.equal(u.totals.grants_created,106);assert.equal(u.totals.grants_redeemed,106);assert.equal(u.totals.active_grants,106);
 assert.equal(u.totals.unique_reader_accounts,106);assert.equal(u.totals.read_requests,106);assert.equal(u.cards[0].unique_reader_accounts,106);
});

test('shared fixed-card identity: separate grants identify one version while preserving each disclosure choice',async t=>{
 const f=setup(t),s=await card(f),base=grantData(s);
 const one=await f.access.createGrant('exporter',{...base,fields:['kwh_monthly'],categories:['electricity']},'identity-one');
 const two=await f.access.createGrant('exporter',{...base,fields:['si_headcount'],categories:['social_insurance']},'identity-two');
 const a=(await f.access.redeem('buyer-a',one.code,'identity-redeem-a')).access;
 const b=(await f.access.redeem('buyer-b',two.code,'identity-redeem-b')).access;
 assert.notEqual(a.grant_id,b.grant_id);assert.equal(a.snapshot.source_card_id,s.cards.at(-1).id);assert.equal(b.snapshot.source_card_id,a.snapshot.source_card_id);
 assert.equal(a.snapshot.task_version,b.snapshot.task_version);
 assert.deepEqual(a.snapshot.parameters.map(x=>x.code),['kwh_monthly']);assert.deepEqual(b.snapshot.parameters.map(x=>x.code),['si_headcount']);
 assert.deepEqual(a.snapshot.materials.map(x=>x.code),['electricity']);assert.deepEqual(b.snapshot.materials.map(x=>x.code),['social_insurance']);
 assert.ok(cardHtml(a).includes(a.snapshot.source_card_id));
});

function continuous(s){return {...grantData(s),fields:[],access_mode:'CONTINUOUS_SUMMARY',version_policy:'FIXED',purpose:'COMPLIANCE_REVIEW'};}
test('continuous summary: code deadline differs from access; persistent reads and downloads remain revocable',async t=>{
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',continuous(s),'continuous');
 assert.equal(g.grant.expires_at,null);assert.equal(g.grant.redemption_expires_at,'2026-11-07T12:00:00.000Z');
 await f.access.redeem('buyer-a',g.code,'r');f.setNow('2027-11-05T12:00:00.000Z');
 const a=new BuyerAccessStore(f.db,{clock:f.clock});
 const v=await a.buyerRead('buyer-a',g.grant.id,'DOWNLOADED');assert.equal(v.expires_at,null);assert.deepEqual(v.snapshot.parameters,[]);assert.ok(cardHtml(v).includes('Until revoked'));
 assert.equal((await a.buyerList('buyer-a')).length,1);assert.equal((await a.ownerUsage('exporter',s.task_id)).totals.active_grants,1);
 await assert.rejects(a.buyerRead('buyer-b',g.grant.id),{code:'ACCESS_UNAVAILABLE'});
 await a.revoke('exporter',g.grant.id,'revoke');
 for(const kind of ['VIEWED','DOWNLOADED'])await assert.rejects(a.buyerRead('buyer-a',g.grant.id,kind),{code:'ACCESS_UNAVAILABLE'});
 assert.equal((await a.buyerList('buyer-a')).length,0);assert.equal((await a.ownerUsage('exporter',s.task_id)).totals.active_grants,0);
});
test('continuous summary: unused code expires exactly at its deadline; no accidental active perpetual grant',async t=>{
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',continuous(s),'c');
 f.setNow(g.grant.redemption_expires_at);await assert.rejects(f.access.redeem('buyer-a',g.code,'r'),{code:'ACCESS_UNAVAILABLE'});
 assert.equal((await f.access.ownerUsage('exporter',s.task_id)).totals.active_grants,0);
});
test('continuous summary: numeric fields, future-version policies, unknown modes and purposes fail closed',async t=>{
 const f=setup(t),s=await card(f),base=continuous(s);
 for(const [data,code] of [[{...base,fields:['kwh_monthly']},'INVALID_DISCLOSURE'],[{...base,version_policy:'FOLLOW'},'UNSUPPORTED_VERSION_POLICY'],[{...base,access_mode:'PUBLIC'},'INVALID_ACCESS_MODE'],[{...base,purpose:'PRICING'},'INVALID_PURPOSE']])await assert.rejects(f.access.createGrant('exporter',data,crypto.randomUUID()),{code});
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_basic_grants').get().n,0);
});
test('continuous summary: legacy temporary grants do not extend and idempotency cannot change authorization mode',async t=>{
 const f=setup(t),s=await card(f),d={...grantData(s),fields:[]};
 const old=await f.access.createGrant('exporter',d,'old');await f.access.redeem('buyer-a',old.code,'r');
 await assert.rejects(f.access.createGrant('exporter',{...d,access_mode:'CONTINUOUS_SUMMARY'},'old'),{code:'IDEMPOTENCY_CONFLICT'});
 f.setNow(old.grant.expires_at);await assert.rejects(f.access.buyerRead('buyer-a',old.grant.id),{code:'ACCESS_UNAVAILABLE'});
 const replay=await f.access.createGrant('exporter',d,'old');assert.equal(replay.grant.access_mode,'TEMPORARY');assert.equal(replay.grant.expires_at,old.grant.expires_at);
});
test('continuous summary: draft changes require review, preserve historical red flags and disclose no private flag details or new counts',async t=>{
 const f=setup(t);let s=await card(f);const g=await f.access.createGrant('exporter',continuous(s),'c');const initial=(await f.access.redeem('buyer-a',g.code,'r')).access.snapshot;
 s=await command(f.store,s,'open_flag',{title:'UNPUBLISHED_COMPLAINT',severity:'red',comment:'PRIVATE'});
 const v=await f.access.buyerRead('buyer-a',g.grant.id);assert.deepEqual(v.snapshot,initial);assert.equal(v.current_status.red_count,1);assert.equal(v.current_status.review_status,'UPDATE_REVIEW_REQUIRED');assert.ok(!JSON.stringify(v).includes('UNPUBLISHED_COMPLAINT'));
});
test('continuous summary: concurrent revocation after code expiry still blocks access-log commit',async t=>{
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',continuous(s),'c');await f.access.redeem('buyer-a',g.code,'r');f.setNow('2027-11-05T12:00:00.000Z');
 const before=f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n;
 f.db.beforeBatch=async()=>{await f.access.revoke('exporter',g.grant.id,'race');};
 await assert.rejects(f.access.buyerRead('buyer-a',g.grant.id,'DOWNLOADED'),{code:'ACCESS_UNAVAILABLE'});
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n,before+1);
});

async function followFixture(t){const f=setup(t);const s=await card(f);const g=await f.access.createGrant('exporter',{...continuous(s),version_policy:'FOLLOW_PUBLISHED'},'follow');await f.access.redeem('buyer-a',g.code,'follow-r');return {...f,s,g};}
async function updatedCard(f,s){s=await command(f.store,s,'flag_response',{flag_id:s.flags[0].id,status:'remediating',comment:'PRIVATE_REMEDIATION'});s=await command(f.store,s,'assess');return command(f.store,s,'freeze_card');}
async function publication(f,s){return f.access.previewPublication('exporter',{grant_id:f.g.grant.id,card_id:s.cards.at(-1).id});}
test('published follow: fixed base survives drafts, explicit preview/publish exposes only scoped summary and retains issue history',async t=>{
 const f=await followFixture(t),before=await f.access.buyerRead('buyer-a',f.g.grant.id),s=await updatedCard(f,f.s);
 const unpublished=await f.access.buyerRead('buyer-a',f.g.grant.id);assert.deepEqual(unpublished.snapshot,before.snapshot);assert.equal(unpublished.current_status.review_status,'UPDATE_REVIEW_REQUIRED');
 const preview=await publication(f,s);assert.deepEqual(preview.snapshot.parameters,[]);assert.equal(preview.snapshot.materials.length,2);
 assert.equal((await f.access.buyerRead('buyer-a',f.g.grant.id)).publication_sequence,0);
 await f.access.publishSummary('exporter',preview,'publish');const v=await f.access.buyerRead('buyer-a',f.g.grant.id);
 assert.equal(v.publication_sequence,1);assert.equal(v.snapshot.source_card_id,s.cards.at(-1).id);assert.equal(v.publication_history.length,2);
 assert.equal(v.publication_history[0].issue_states[0].status,'open');assert.equal(v.publication_history[1].issue_states[0].status,'remediating');assert.equal(v.publication_history[0].issue_states[0].id,v.publication_history[1].issue_states[0].id);
 assert.equal(v.snapshot.issues.red_count,1);assert.deepEqual((await f.access.buyerRead('buyer-a',f.g.grant.id,'VIEWED',0)).snapshot,before.snapshot);
 for(const secret of ['PRIVATE_REMEDIATION','PRIVATE_COMPLAINT','SECRET_123','PRICE_123','NOTE_123',f.s.flags[0].id])assert.ok(!JSON.stringify(v).includes(secret));
 const html=cardHtml(await f.access.buyerRead('buyer-a',f.g.grant.id,'DOWNLOADED',0));assert.ok(html.includes('Selected publication: 0'));assert.ok(html.includes('remediating'));
});
test('published follow: explicit opt-in only, fixed/temporary/unredeemed/revoked grants cannot publish',async t=>{
 const f=await followFixture(t),s=await updatedCard(f,f.s);
 for(const data of [continuous(f.s),grantData(f.s),{...continuous(f.s),version_policy:'FOLLOW_PUBLISHED'}]){
  const g=await f.access.createGrant('exporter',data,crypto.randomUUID());
  if(data.version_policy!=='FOLLOW_PUBLISHED')await f.access.redeem('buyer-b',g.code,crypto.randomUUID());
  await assert.rejects(f.access.previewPublication('exporter',{grant_id:g.grant.id,card_id:s.cards.at(-1).id}),{code:'ACCESS_UNAVAILABLE'});
 }
 await assert.rejects(f.access.createGrant('exporter',{...grantData(f.s),version_policy:'FOLLOW_PUBLISHED'},'temporary-follow'),{code:'UNSUPPORTED_VERSION_POLICY'});
 const p=await publication(f,s);await f.access.revoke('exporter',f.g.grant.id,'rev');await assert.rejects(f.access.publishSummary('exporter',p,'p'),{code:'ACCESS_UNAVAILABLE'});
});
test('published follow: tenant isolation, stale/wrong preview, rollback and idempotency',async t=>{
 const f=await followFixture(t),s=await updatedCard(f,f.s),p=await publication(f,s);
 await assert.rejects(f.access.previewPublication('other',{grant_id:f.g.grant.id,card_id:p.card_id}),{code:'ACCESS_UNAVAILABLE'});
 await assert.rejects(f.access.publishSummary('exporter',{...p,projection_hash:'wrong'},'wrong'),{code:'VERSION_CONFLICT'});
 f.db.failAt=3;await assert.rejects(f.access.publishSummary('exporter',p,'retry'));f.db.failAt=-1;
 assert.equal((await f.access.buyerRead('buyer-a',f.g.grant.id)).publication_sequence,0);
 await f.access.publishSummary('exporter',p,'retry');assert.equal((await f.access.publishSummary('exporter',p,'retry')).replayed,true);
 await assert.rejects(f.access.publishSummary('exporter',{...p,projection_hash:'different'},'retry'),{code:'IDEMPOTENCY_CONFLICT'});
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_summary_publications').get().n,1);
});
test('published follow: concurrent publish/revoke cannot partially advance the publication head',async t=>{
 const f=await followFixture(t),s=await updatedCard(f,f.s),p=await publication(f,s);
 f.db.beforeBatch=async()=>{await f.access.publishSummary('exporter',p,'second');};
 await assert.rejects(f.access.publishSummary('exporter',p,'first'),{code:'VERSION_CONFLICT'});
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_summary_publications').get().n,1);
 const s2=await updatedCard(f,s),p2=await publication(f,s2);
 f.db.beforeBatch=async()=>{await f.access.revoke('exporter',f.g.grant.id,'revoke-race');};
 await assert.rejects(f.access.publishSummary('exporter',p2,'third'),{code:'VERSION_CONFLICT'});
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_summary_publications').get().n,1);
});
test('published follow: older/foreign cards and changed scope are rejected rather than broadening permissions',async t=>{
 const f=await followFixture(t),s=await updatedCard(f,f.s);await f.access.publishSummary('exporter',await publication(f,s),'p');
 await assert.rejects(publication(f,f.s),{code:'VERSION_CONFLICT'});
 const other=await card(f);await assert.rejects(publication(f,other),{code:'CARD_NOT_FOUND'});
 // Fault fixture: an otherwise valid exported future card with a changed period.
 const exported=await f.access.exportCard('exporter',s.task_id,s.cards.at(-1).id);
 f.access.exportCard=async()=>({...exported,body:{...exported.body,task_version:exported.body.task_version+1,outcome:{...exported.body.outcome,period:'2026-11'}}});
 await assert.rejects(publication(f,s),{code:'SCOPE_CHANGE'});
});
test('published follow: previously disclosed flag cannot disappear from a new summary',async t=>{
 const f=await followFixture(t),s=await updatedCard(f,f.s),exported=await f.access.exportCard('exporter',s.task_id,s.cards.at(-1).id);
 f.access.exportCard=async()=>({...exported,body:{...exported.body,flags:[]}});
 await assert.rejects(publication(f,s),{code:'HISTORY_LOSS'});
});
test('published follow: historical and new downloads recheck revocation; tampered history fails closed',async t=>{
 const f=await followFixture(t),s=await updatedCard(f,f.s);await f.access.publishSummary('exporter',await publication(f,s),'p');
 await assert.rejects(f.access.buyerRead('buyer-b',f.g.grant.id,'VIEWED',0),{code:'ACCESS_UNAVAILABLE'});
 for(const seq of [-1,9,0.5])await assert.rejects(f.access.buyerRead('buyer-a',f.g.grant.id,'VIEWED',seq),{code:'ACCESS_UNAVAILABLE'});
 f.sqlite.prepare("UPDATE dossivo_summary_publications SET previous_hash='tampered'").run();
 await assert.rejects(f.access.buyerRead('buyer-a',f.g.grant.id),{code:'INTEGRITY_FAILED'});
 await f.access.revoke('exporter',f.g.grant.id,'rev');
 for(const seq of [0,1])await assert.rejects(f.access.buyerRead('buyer-a',f.g.grant.id,'DOWNLOADED',seq),{code:'ACCESS_UNAVAILABLE'});
});
test('published follow: reuse records actual accessed fixed version, not original grant card',async t=>{
 const f=await followFixture(t),s=await updatedCard(f,f.s);await f.access.publishSummary('exporter',await publication(f,s),'p');
 await f.access.buyerRead('buyer-a',f.g.grant.id);await f.access.buyerRead('buyer-a',f.g.grant.id,'DOWNLOADED');
 const u=await f.access.ownerUsage('exporter',s.task_id),original=u.cards.find(c=>c.card_id===f.s.cards[0].id),latest=u.cards.find(c=>c.card_id===s.cards.at(-1).id);
 assert.equal(original.read_requests,1);assert.equal(original.download_requests,0);assert.equal(latest.read_requests,1);assert.equal(latest.download_requests,1);assert.equal(u.totals.grants_created,1);assert.equal(u.totals.unique_reader_accounts,1);
});

test('conversation: persistent bilateral requests/replies, idempotency and strict cross-buyer isolation',async t=>{
 const {ConversationStore}=await import('../lib/conversation-store.js');const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',continuous(s),'chat');await f.access.redeem('buyer-a',g.code,'r');const chat=new ConversationStore(f.db,{clock:f.clock});
 const data={grant_id:g.grant.id,kind:'REQUEST',body:'合成测试：请补充社保材料',synthetic_only:true};
 const first=await chat.send('buyer-a',data,'message');assert.equal(first.messages.length,1);assert.equal((await chat.send('buyer-a',data,'message')).messages.length,1);
 await assert.rejects(chat.send('buyer-a',{...data,body:'different'},'message'),{code:'IDEMPOTENCY_CONFLICT'});
 await assert.rejects(chat.thread('buyer-b',g.grant.id),{code:'CONVERSATION_UNAVAILABLE'});
 await assert.rejects(chat.send('buyer-b',data,'x'),{code:'CONVERSATION_UNAVAILABLE'});
 await assert.rejects(chat.send('buyer-a',{...data,synthetic_only:false},'real'),{code:'REAL_DATA_DISABLED'});
 const response=await chat.send('exporter',{...data,kind:'REPLY',reply_to:first.messages[0].id,body:'合成回复：正在准备'},'reply');assert.equal(response.messages.length,2);
 assert.ok(!JSON.stringify(response).includes('PRIVATE_COMPLAINT'));assert.ok(!JSON.stringify(response).includes('owner_id'));
 await f.access.revoke('exporter',g.grant.id,'revoke');assert.equal((await chat.thread('buyer-a',g.grant.id)).messages.length,2);await assert.rejects(f.access.buyerRead('buyer-a',g.grant.id),{code:'ACCESS_UNAVAILABLE'});
});
test('conversation: forged reply targets, unredeemed relations, invalid role actions and transaction rollback rejected',async t=>{
 const {ConversationStore}=await import('../lib/conversation-store.js');const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',continuous(s),'chat');const chat=new ConversationStore(f.db,{clock:f.clock});
 await assert.rejects(chat.thread('exporter',g.grant.id),{code:'CONVERSATION_UNAVAILABLE'});await f.access.redeem('buyer-a',g.code,'r');
 const d={grant_id:g.grant.id,kind:'REQUEST',body:'Synthetic request',synthetic_only:true};
 await assert.rejects(chat.send('exporter',d,'wrong'),{code:'INVALID_ACTION'});
 await assert.rejects(chat.send('buyer-a',{...d,kind:'REPLY',reply_to:'foreign'},'foreign'),{code:'CONVERSATION_UNAVAILABLE'});
 f.db.failAt=2;await assert.rejects(chat.send('buyer-a',d,'fail'));f.db.failAt=-1;assert.equal((await chat.thread('buyer-a',g.grant.id)).messages.length,0);await chat.send('buyer-a',d,'fail');
 f.sqlite.prepare("UPDATE dossivo_conversations SET status='CLOSED'").run();await assert.rejects(chat.send('buyer-a',d,'closed'),{code:'CONVERSATION_READ_ONLY'});
});

test('contact block also stops sending through an older material-grant conversation without revoking material access',async t=>{
 const {ContactStore}=await import('../lib/contact-store.js'),{ConversationStore}=await import('../lib/conversation-store.js');
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',continuous(s),'grant');await f.access.redeem('buyer-a',g.code,'redeem');
 const contacts=new ContactStore(f.db,{clock:f.clock}),chat=new ConversationStore(f.db,{clock:f.clock});
 await contacts.ensureProfile('exporter',{display_name:'Supplier test',discoverable:true,synthetic_only:true});const b=await contacts.ensureProfile('buyer-a',{display_name:'Buyer test',discoverable:true,synthetic_only:true});
 await contacts.request('exporter',{public_id:b.public_id,synthetic_only:true},'contact');const incoming=(await contacts.requests('buyer-a')).incoming[0];await contacts.respond('buyer-a',{request_id:incoming.id,decision:'ACCEPT'},'accept');const c=(await contacts.requests('buyer-a')).contacts[0];
 const data={grant_id:g.grant.id,kind:'NOTE',body:'Synthetic message',synthetic_only:true};await chat.send('exporter',data,'first');
 f.db.beforeBatch=async()=>{await contacts.block('buyer-a',{contact_id:c.id,blocked:true},'block');};
 await assert.rejects(chat.send('exporter',data,'race'));assert.equal((await chat.thread('exporter',g.grant.id)).messages.length,1);
 await assert.rejects(chat.send('exporter',data,'blocked'),{code:'CONVERSATION_READ_ONLY'});
 assert.equal((await f.access.buyerRead('buyer-a',g.grant.id)).grant_id,g.grant.id);
});

test('buyer overview: expiry boundary, continuous mode and revocation are distinct; inactive evidence is withheld',async t=>{
 const f=setup(t),s=await card(f),temp=await f.access.createGrant('exporter',grantData(s),'overview-temp'),continuous=await f.access.createGrant('exporter',{...grantData(s),fields:[],access_mode:'CONTINUOUS_SUMMARY'},'overview-continuous');
 await f.access.redeem('buyer-a',temp.code,'overview-redeem-temp');await f.access.redeem('buyer-a',continuous.code,'overview-redeem-continuous');
 const beforeEvents=f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n;
 assert.deepEqual((await f.access.buyerOverview('buyer-a','ALL')).counts,{ALL:2,ACTIVE:2,EXPIRED:0,REVOKED:0});
 f.setNow('2026-11-07T12:00:00.000Z');let overview=await f.access.buyerOverview('buyer-a','ALL');assert.deepEqual(overview.counts,{ALL:2,ACTIVE:1,EXPIRED:1,REVOKED:0});assert.equal(overview.grants.find(g=>g.id===temp.grant.id).organization,null);assert.equal(overview.grants.find(g=>g.id===continuous.grant.id).expires_at,null);
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM dossivo_access_events').get().n,beforeEvents);
 await f.access.revoke('exporter',temp.grant.id,'overview-revoke');overview=await f.access.buyerOverview('buyer-a','REVOKED');assert.equal(overview.counts.REVOKED,1);assert.equal(overview.counts.EXPIRED,0);assert.equal(overview.grants.length,1);assert.equal(overview.grants[0].organization,null);
 for(const secret of ['parameters','snapshot_json','code_hash','owner_id','task_id','PRICE_123','SECRET_123','PRIVATE_COMPLAINT','Synthetic Exporter'])assert.ok(!JSON.stringify(overview).includes(secret),secret);
 await assert.rejects(f.access.buyerRead('buyer-a',temp.grant.id),{code:'ACCESS_UNAVAILABLE'});
});
test('buyer overview: filter precedes pagination, totals span pages and ownership is enforced',async t=>{
 const f=setup(t),s=await card(f),g=await f.access.createGrant('exporter',grantData(s),'overview-many');
 const original=f.sqlite.prepare('SELECT * FROM dossivo_basic_grants WHERE id=?').get(g.grant.id),keys=Object.keys(original);
 const insert=f.sqlite.prepare('INSERT INTO dossivo_basic_grants ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')');
 for(let i=0;i<55;i++){const row={...original,id:'overview-'+String(i).padStart(3,'0'),code_hash:'synthetic-code-'+i,redeemed_by:'buyer-a',revoked_at:i>=52?f.clock():null};insert.run(...keys.map(k=>row[k]));}
 const a=await f.access.buyerOverview('buyer-a','ACTIVE');assert.equal(a.grants.length,50);assert.equal(a.counts.ALL,55);assert.equal(a.counts.ACTIVE,52);assert.ok(a.next_before);
 const b=await f.access.buyerOverview('buyer-a','ACTIVE',a.next_before);assert.equal(b.grants.length,2);assert.equal(b.next_before,null);assert.equal(b.counts.ALL,55);assert.equal(new Set([...a.grants,...b.grants].map(g=>g.id)).size,52);
 assert.equal((await f.access.buyerOverview('buyer-a','REVOKED')).grants.length,3);
 assert.deepEqual((await f.access.buyerOverview('buyer-b','ALL',a.next_before)).counts,{ALL:0,ACTIVE:0,EXPIRED:0,REVOKED:0});assert.equal((await f.access.buyerOverview('exporter','ALL')).grants.length,0);
});
test('buyer overview rejects invalid filters and cursors without widening scope',async t=>{const f=setup(t);for(const [status,cursor] of [['UNKNOWN',null],['ALL',''],['ALL','x'.repeat(129)],['ALL',42]])await assert.rejects(f.access.buyerOverview('buyer-a',status,cursor),{code:'INVALID_INPUT'});});
