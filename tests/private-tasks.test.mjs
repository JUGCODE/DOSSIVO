import {createTaskCommand} from '../lib/private-task-command.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrivateTaskStore} from '../lib/private-task-store.js';
import {assessTask,transitionTask} from '../lib/private-task-core.js';
import {fingerprint} from '../lib/paci-bridge-core.js';
import {formalPublicationStatus} from '../lib/protocol-registry.js';
function facade(sqlite){const db={beforeBatch:null,failAt:-1,prepare(sql){const make=(values)=>({sql,values,bind:(...v)=>make(v),first:async()=>sqlite.prepare(sql).get(...values)??null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>sqlite.prepare(sql).run(...values)});return make([]);},async batch(statements){if(db.beforeBatch){const h=db.beforeBatch;db.beforeBatch=null;await h();}sqlite.exec('BEGIN');try{const res=statements.map((s,i)=>{if(db.failAt===i)throw Error('Injected failure');return sqlite.prepare(s.sql).run(...s.values);});sqlite.exec('COMMIT');return res;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};return db;}
function setup(t,file=':memory:'){const sqlite=new DatabaseSync(file);t.after(()=>sqlite.close());for(const n of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+n,import.meta.url),'utf8'));const db=facade(sqlite);return {db,sqlite,store:new PrivateTaskStore(db)};}
let key=0;const create=()=>({action:'create',idempotency_key:'create'+(++key),data:{synthetic_only:true,purpose:'合成中文问询',organization:'贸易商（不等于雇主）',facility:'合成工厂A',period:'2026-10'}});
async function run(store,state,action,data={}){return (await store.command('alice',{action,task_id:state.task_id,expected_version:state.version,idempotency_key:'op'+(++key),data})).state;}
async function located(store,sample='normal'){let s=(await store.command('alice',create())).state;s=await run(store,s,'add_material',{sample});s=await run(store,s,'locate_fields',{material_id:s.materials[0].id});return s;}
async function confirmed(store,s){for(const f of s.fields)s=await run(store,s,'confirm_field',{field_id:f.id,value:f.extracted_value,reason:'核对本合成字段原文'});return s;}

test('DS01/10: Chinese task persists, directory never becomes a seen original',async t=>{const{store,db}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'add_material',{mode:'DIRECTORY',title:'未取得社保汇总',custodian:'合成人事'});assert.equal((await new PrivateTaskStore(db).read('alice',s.task_id)).version,2);assert.equal(s.materials[0].original_seen,false);await assert.rejects(run(store,s,'locate_fields',{material_id:s.materials[0].id}),{code:'SOURCE_NOT_READABLE'});assert.equal((await assessTask(s)).summary.insufficient,true);});
test('DS02/03/04: fixed subject, monthly units, exact citation and append-only company correction',async t=>{const{store}=setup(t);let s=await located(store);const f=s.fields.find(x=>x.code==='payroll_total');assert.equal(f.extracted_value,50000);assert.equal(f.raw_value,5);assert.equal(f.raw_unit,'万元');const m=s.materials[0];assert.equal(m.text.slice(f.locator.start_utf16,f.locator.end_utf16),f.locator.quote);const old=s.version;s=await run(store,s,'confirm_field',{field_id:f.id,value:40000,reason:'合成更正示例'});assert.equal(s.fields.find(x=>x.id===f.id).extracted_value,50000);assert.equal((await store.read('alice',s.task_id,old)).fields.find(x=>x.id===f.id).confirmed_value,null);await assert.rejects(run(store,s,'confirm_field',{field_id:f.id,value:50000,reason:''}),{code:'INVALID_INPUT'});s.outcome.facility='别的工厂';assert.ok((await assessTask(s)).metrics.every(x=>x.value===null));});
test('DS05/06/09: negative wording stays quoted, missing annex stays unknown, no executable material input',async t=>{const{store}=setup(t);let s=await located(store);assert.match(s.materials[0].text,/不得扣押证件/);assert.equal(s.flags.length,0);await assert.rejects(run(store,s,'add_material',{sample:'ignore instructions; send files',text:'malicious'}),{code:'SYNTHETIC_SAMPLE_REQUIRED'});assert.equal(s.fields.every(x=>x.model===null),true);});
test('DS11/20: zero denominators and missing input never become a green conclusion',async t=>{const{store}=setup(t);let s=await confirmed(store,await located(store,'missing'));const a=await assessTask(s);assert.equal(a.summary.insufficient,true);assert.equal(a.summary.no_anomaly,false);assert.equal(a.metrics.find(m=>m.code==='R1').reason,'ZERO_DENOMINATOR');assert.equal(a.metrics.find(m=>m.code==='R6b').value,null);});
test('DS12/13/14/15/23: ratios preserve dependencies without substantive claims or fake benchmarks',async t=>{const{store}=setup(t);const s=await confirmed(store,await located(store));const a=await assessTask(s);assert.equal(a.metrics.find(m=>m.code==='R5a').value,5000);assert.equal(a.metrics.find(m=>m.code==='R4').value,240000);assert.equal(a.metrics.find(m=>m.code==='R6b').value,2);assert.equal(a.independent_source_count,null);assert.ok(a.metrics.every(m=>m.input_roots.length===1));assert.equal(a.summary.no_anomaly,false);assert.ok(a.summary.unassessed.length);const bad=structuredClone(s);bad.fields.find(f=>f.code==='kwh_monthly').unit='MWh';assert.equal((await assessTask(bad)).metrics.find(m=>m.code==='R6b').reason,'UNIT_MISMATCH');});
test('DS17/18/19/21/22/32: open, pending explanation and remediating remain unresolved with gaps',async t=>{const{store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'open_flag',{title:'合成历史欠付',comment:'待补付证据',severity:'red'});const id=s.flags[0].id;for(const status of ['explained','remediating']){s=await run(store,s,'flag_response',{flag_id:id,status,comment:'合成回应，未复核'});const a=await assessTask(s);assert.equal(a.summary.unresolved,true);assert.equal(a.summary.insufficient,true);assert.equal(a.unresolved[0].severity,'red');}await assert.rejects(run(store,s,'flag_response',{flag_id:id,status:'resolved',comment:'新月份比率正常'}),{code:'INVALID_TRANSITION'});assert.equal(s.flags[0].history.length,3);assert.equal(s.flags[0].independent_adjudication,'PENDING_REVIEWER');});
test('DS29/37/41/44: frozen private card and outbox atomic, old snapshot survives correction',async t=>{const{store,db,sqlite}=setup(t);let s=await confirmed(store,await located(store));s=await run(store,s,'assess');db.failAt=3;await assert.rejects(run(store,s,'freeze_card'));assert.equal((await store.read('alice',s.task_id)).version,s.version);assert.equal((await store.outbox('alice',s.task_id)).length,0);db.failAt=-1;s=await run(store,s,'freeze_card');const c=s.cards[0];assert.equal(c.body.formal_card,false);assert.equal((await store.outbox('alice',s.task_id))[0].card_hash,c.sha256);s=await run(store,s,'confirm_field',{field_id:s.fields[0].id,value:11,reason:'新版本'});assert.deepEqual((await store.exportCard('alice',s.task_id,c.id)).body,c.body);assert.equal(await fingerprint(c.body),c.sha256);sqlite.exec('DROP TRIGGER task_versions_no_update');/* Deliberate privileged corruption fixture: verify read guard after write guard bypass. */sqlite.prepare('UPDATE dossivo_task_versions SET body_hash=? WHERE task_id=? AND version=?').run('tampered',s.task_id,s.version);await assert.rejects(store.read('alice',s.task_id),{code:'INTEGRITY_FAILED'});});
test('DS36/37/55: same-key replay, conflicting key, concurrent CAS and tenant isolation',async t=>{const{store,db,sqlite}=setup(t);const command=create();let s=(await store.command('alice',command)).state;assert.equal((await store.command('alice',command)).replayed,true);await assert.rejects(store.command('alice',{...command,data:{...command.data,purpose:'other'}}),{code:'IDEMPOTENCY_CONFLICT'});await assert.rejects(store.read('bob',s.task_id),{code:'TASK_NOT_FOUND'});assert.deepEqual(await store.list('bob'),[]);const contender={action:'add_material',idempotency_key:'race',task_id:s.task_id,expected_version:s.version,data:{sample:'missing'}};db.beforeBatch=async()=>{await run(store,s,'add_material',{sample:'normal'});};await assert.rejects(store.command('alice',contender),{code:'VERSION_CONFLICT'});s=await store.read('alice',s.task_id);assert.equal(s.materials.length,1);assert.equal(sqlite.prepare('SELECT count(*) n FROM dossivo_task_operations').get().n,2);});
test('DS40/42/43/56: address or booleans cannot enable formal publication or create proofs',async t=>{const{store}=setup(t);const s=(await store.command('alice',create())).state;await assert.rejects(run(store,s,'publish_formal',{anchored:true,contract_address:'0x123',proof:true}),{code:'PROTOCOL_NOT_VERIFIED'});assert.equal(formalPublicationStatus({anchored:true}).enabled,false);await assert.rejects(store.command('alice',{...create(),data:{...create().data,synthetic_only:false}}),{code:'REAL_DATA_DISABLED'});});
test('DS55: actual SQLite file reopens with immutable state and tenant permissions',async t=>{const dir=mkdtempSync(join(tmpdir(),'dossivo-task-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const{store}=setup(t,join(dir,'d1.sqlite'));const s=await confirmed(store,await located(store));const reopened=new DatabaseSync(join(dir,'d1.sqlite'));t.after(()=>reopened.close());const again=new PrivateTaskStore(facade(reopened));assert.deepEqual(await again.read('alice',s.task_id),s);await assert.rejects(again.read('bob',s.task_id),{code:'TASK_NOT_FOUND'});});

test('D3 text correspondence: web and Markdown share the same application specification source',async()=>{
 const {protocolMarkdown}=await import('../scripts/export-protocol.mjs');
 assert.equal(readFileSync(new URL('../docs/DOSSIVO_PROTOCOL.md',import.meta.url),'utf8'),protocolMarkdown());
 assert.match(readFileSync(new URL('../app/protocol/page.tsx',import.meta.url),'utf8'),/PROTOCOL_SECTIONS\.map/);
});
const imported=(patch={})=>({synthetic_only:true,title:'Synthetic source',text:'用电量：2000kWh',facility:'合成工厂A',period:'2026-10',categories:['electricity'],...patch});
test('DS07: identical text in the same task and scope shares one root without overwriting source versions',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'import_text',imported());const first=s.materials[0],version=s.version;
 s=await run(store,s,'import_text',imported({title:'Second filename',root_id:'forged'}));assert.equal(s.materials.length,2);assert.equal(s.materials[1].root_id,first.root_id);assert.equal(s.materials[1].lineage.method,'EXACT_TEXT_SCOPE_MATCH');assert.equal(s.materials[1].lineage.parent_material_id,first.id);assert.deepEqual((await store.read('alice',s.task_id,version)).materials,[first]);
 const a=await assessTask(s);assert.equal(a.source_lineage.source_group_count,1);assert.equal(a.source_lineage.readable_material_count,2);assert.equal(a.independent_source_count,null);assert.equal(a.summary.no_anomaly,false);
});
test('DS07: translation and summary chains retain the original root with declared basis and actor',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'import_text',imported());const first=s.materials[0];
 s=await run(store,s,'import_text',imported({text:'Electricity: 2000 kWh',source_material_id:first.id,source_relation:'translation',source_reason:'Synthetic translation'}));const translated=s.materials[1];
 s=await run(store,s,'import_text',imported({text:'Monthly consumption summary',source_material_id:translated.id,source_relation:'summary',source_reason:'Synthetic summary'}));
 for(const m of s.materials){assert.equal(m.root_id,first.root_id);assert.equal(m.lineage.provenance_status,'NOT_INDEPENDENTLY_VERIFIED');assert.equal(m.original_seen,false);}
 assert.equal(s.materials[2].lineage.parent_material_id,translated.id);assert.equal(s.materials[2].lineage.recorded_by,'alice');assert.equal(s.materials[2].lineage.basis,'Synthetic summary');
});
test('DS02/07: scope differences never auto-merge and cannot be disguised as related copies',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'import_text',imported());const first=s.materials[0];
 for(const patch of [{facility:'相似名称工厂'},{period:'2026-11'}]){s=await run(store,s,'import_text',imported(patch));assert.notEqual(s.materials.at(-1).root_id,first.root_id);await assert.rejects(run(store,s,'import_text',imported({...patch,source_material_id:first.id,source_relation:'summary',source_reason:'Cannot bridge scope'})),{code:'SOURCE_SCOPE_MISMATCH'});}
});
test('DS07/10: directory entries, other tasks and forged relationships are rejected without saving',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'add_material',{mode:'DIRECTORY',title:'Synthetic unavailable source',custodian:'Synthetic custodian'});const directory=s.materials[0];let other=(await store.command('alice',create())).state;other=await run(store,other,'import_text',imported());
 for(const source_material_id of [directory.id,other.materials[0].id,'foreign-material'])await assert.rejects(run(store,s,'import_text',imported({source_material_id,source_relation:'translation',source_reason:'Synthetic'})),{code:'SOURCE_RELATION_INVALID'});
 assert.equal((await store.read('alice',s.task_id)).version,s.version);
});
test('DS07: exact-copy assertions require identical text, recognised relation and a nonempty basis',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'import_text',imported());const id=s.materials[0].id;
 for(const patch of [{source_material_id:id,source_relation:'copy',text:'changed',source_reason:'Synthetic'},{source_material_id:id,source_relation:'translation',source_reason:''},{source_material_id:id,source_relation:'independent',source_reason:'Synthetic'},{source_relation:'summary',source_reason:'Synthetic'}])await assert.rejects(run(store,s,'import_text',imported(patch)),{code:'SOURCE_RELATION_INVALID'});
 s=await run(store,s,'import_text',imported({text:'  用电量：2000kWh\n'}));assert.equal(s.materials[1].text,'  用电量：2000kWh\n');assert.notEqual(s.materials[0].root_id,s.materials[1].root_id);
});
test('DS07/15: duplicate samples share roots but ambiguous confirmed fields do not become extra corroboration',async t=>{
 const {store}=setup(t);let s=await located(store);s=await run(store,s,'add_material',{sample:'normal'});s=await run(store,s,'locate_fields',{material_id:s.materials[1].id});s=await confirmed(store,s);
 assert.equal(new Set(s.fields.map(f=>f.root_id)).size,1);const a=await assessTask(s);assert.ok(a.metrics.every(m=>m.value===null));assert.ok(a.missing.every(m=>m.reason==='AMBIGUOUS_INPUT'));assert.equal(a.source_lineage.source_group_count,1);assert.equal(a.independent_source_count,null);
 s=await run(store,s,'assess');s=await run(store,s,'freeze_card');assert.equal(s.cards.at(-1).body.assessment.source_lineage.source_group_count,1);assert.equal(s.cards.at(-1).body.formal_card,false);
});


test('DS15: repeated metric occurrences retain every source locator and cannot be selectively confirmed',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;
 const text='合成😀\n名册人数：10人\n参保人数：10人\n参保人数：7人';
 s=await run(store,s,'import_text',imported({text}));s=await run(store,s,'locate_fields',{material_id:s.materials[0].id});
 const fields=s.fields.filter(f=>f.code==='si_headcount');assert.equal(fields.length,2);assert.deepEqual(fields.map(f=>f.raw_value),[10,7]);assert.deepEqual(fields.map(f=>f.locator.line),[3,4]);
 for(const f of s.fields)assert.equal(text.slice(f.locator.start_utf16,f.locator.end_utf16),f.locator.quote);
 for(const f of [s.fields.find(f=>f.code==='roster_headcount'),fields[0]])s=await run(store,s,'confirm_field',{field_id:f.id,value:f.extracted_value,reason:'Synthetic review'});
 let a=await assessTask(s);assert.equal(a.metrics.find(m=>m.code==='R1').value,null);assert.equal(a.missing.find(m=>m.code==='si_headcount').reason,'AMBIGUOUS_INPUT');
 s=await run(store,s,'confirm_field',{field_id:fields[1].id,value:7,reason:'Second occurrence'});a=await assessTask(s);assert.equal(a.metrics.find(m=>m.code==='R1').value,null);assert.equal(a.summary.no_anomaly,false);
});
test('DS07/15: identical repeated values remain separate candidates, not independent corroboration',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'import_text',imported({text:'用电量：20kWh\n用电量：20kWh'}));s=await run(store,s,'locate_fields',{material_id:s.materials[0].id});assert.equal(s.fields.length,2);assert.equal(s.fields[0].root_id,s.fields[1].root_id);assert.notEqual(s.fields[0].locator.start_utf16,s.fields[1].locator.start_utf16);assert.equal((await assessTask(s)).independent_source_count,null);
});
test('DS15: candidate overflow is atomic and leaves the original task intact',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'import_text',imported({text:'用电量：1kWh\n'.repeat(501)}));const previous=structuredClone(s);await assert.rejects(run(store,s,'locate_fields',{material_id:s.materials[0].id}),{code:'TASK_LIMIT'});assert.deepEqual(await store.read('alice',s.task_id),previous);
});

test('DS15: assessment retains conflict sources and gives affected ratios an explicit ambiguity reason',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;
 s=await run(store,s,'import_text',imported({title:'PRIVATE_CONFLICT_TITLE',text:'名册人数：10人\n参保人数：10人\n参保人数：7人'}));s=await run(store,s,'locate_fields',{material_id:s.materials[0].id});s=await confirmed(store,s);
 s=await run(store,s,'assess');const a=s.assessments.at(-1);assert.equal(a.metrics.find(m=>m.code==='R1').reason,'AMBIGUOUS_INPUT');assert.equal(a.candidate_conflicts.length,1);assert.equal(a.candidate_conflicts[0].candidates.length,2);assert.deepEqual(a.candidate_conflicts[0].candidates.map(f=>f.confirmed_value),[10,7]);assert.ok(a.candidate_conflicts[0].candidates.every(f=>f.material_title==='PRIVATE_CONFLICT_TITLE'));
 s=await run(store,s,'freeze_card');const card=s.cards.at(-1);assert.deepEqual(card.body.assessment.candidate_conflicts,a.candidate_conflicts);
 const {basicProjection}=await import('../lib/basic-evidence-card.js');const shared=JSON.stringify(basicProjection(card,{fields:[],categories:[]}));for(const secret of ['PRIVATE_CONFLICT_TITLE','candidate_conflicts','start_utf16',s.fields[0].id])assert.ok(!shared.includes(secret));
 const old=structuredClone(card);s=await run(store,s,'confirm_field',{field_id:s.fields[1].id,value:8,reason:'Later synthetic correction'});assert.deepEqual(s.cards.at(-1),old);assert.equal(a.candidate_conflicts[0].candidates[0].confirmed_value,10);
});
test('candidate groups preserve cross-scope entries without merging or mutating the task',async()=>{
 const {fieldCandidateGroups}=await import('../lib/field-candidates.js');const state={materials:[],fields:[{id:'a',material_id:'missing',code:'kwh_monthly',confirmed_value:null,scope:{facility:'A',period:'2026-10'}},{id:'b',code:'kwh_monthly',confirmed_value:0,scope:{facility:'B',period:'2026-09'}},{id:'c',code:'revenue',confirmed_value:null}]};const before=structuredClone(state);const g=fieldCandidateGroups(state);assert.equal(g.length,1);assert.equal(g[0].candidates[0].material_title,null);assert.equal(g[0].candidates[1].confirmed_value,0);assert.deepEqual(g[0].candidates.map(f=>f.scope.facility),['A','B']);assert.deepEqual(state,before);assert.deepEqual(fieldCandidateGroups({}),[]);
});

test('material gaps persist actor and scope without counting as submitted or readable evidence',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;const before=s.version;
 s=await run(store,s,'record_material_gap',{category:'electricity',title:'Synthetic bill gap',custodian:'Synthetic HR',reason:'PRIVATE_GAP_REASON',facility:'forged',period:'1900-01',recorded_by:'forged'});const m=s.materials[0];assert.equal(m.mode,'DIRECTORY');assert.equal(m.original_seen,false);assert.equal(m.gap.recorded_by,'alice');assert.equal(m.scope.facility,s.outcome.facility);assert.equal(m.scope.period,s.outcome.period);assert.equal((await store.read('alice',s.task_id,before)).materials.length,0);
 const {preparationOverview}=await import('../lib/preparation-overview.js');const o=preparationOverview(s);assert.equal(o.percent,0);assert.equal(o.gaps[0].reason,'PRIVATE_GAP_REASON');await assert.rejects(run(store,s,'locate_fields',{material_id:m.id}),{code:'SOURCE_NOT_READABLE'});await assert.rejects(run(store,s,'confirm_material',{material_id:m.id,reason:'test'}),{code:'SOURCE_NOT_READABLE'});await assert.rejects(store.read('bob',s.task_id),{code:'TASK_NOT_FOUND'});
 s=await run(store,s,'assess');s=await run(store,s,'freeze_card');const {basicProjection}=await import('../lib/basic-evidence-card.js');assert.ok(!JSON.stringify(basicProjection(s.cards.at(-1),{fields:[],categories:['electricity']})).includes('PRIVATE_GAP_REASON'));
});
test('material gap input validation is atomic and retry does not duplicate records',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;const data={category:'payroll',title:'Synthetic',custodian:'Synthetic HR',reason:'Pending'};
 for(const patch of [{category:'unknown'},{reason:''},{reason:'x'.repeat(1001)},{custodian:''},{title:''}])await assert.rejects(run(store,s,'record_material_gap',{...data,...patch}));assert.equal((await store.read('alice',s.task_id)).materials.length,0);
 const cmd={action:'record_material_gap',task_id:s.task_id,expected_version:s.version,idempotency_key:'gap-repeat',data};await store.command('alice',cmd);assert.equal((await store.command('alice',cmd)).state.materials.length,1);
});
test('supplementing a gap preserves the original record without blocking coverage',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;s=await run(store,s,'record_material_gap',{category:'electricity',title:'Synthetic missing bill',custodian:'Synthetic HR',reason:'Pending source'});const gap=structuredClone(s.materials[0]);s=await run(store,s,'import_text',imported());const {preparationOverview}=await import('../lib/preparation-overview.js');const o=preparationOverview(s);assert.equal(o.gaps.length,1);assert.ok(o.submitted.some(i=>i.code==='electricity'));assert.ok(!o.missing.some(i=>i.code==='electricity'));assert.deepEqual(s.materials[0],gap);assert.equal((await assessTask(s)).summary.no_anomaly,false);
});

async function gapAndSource(store){let s=await located(store);s=await confirmed(store,s);s=await run(store,s,'confirm_material',{material_id:s.materials[0].id,reason:'Synthetic company review'});s=await run(store,s,'record_material_gap',{category:'electricity',title:'Missing synthetic bill',custodian:'Synthetic HR',reason:'Originally unavailable'});return s;}
test('gap receipt links reviewed material, preserves history, and reopening restores incompleteness',async t=>{const {store}=setup(t);let s=await gapAndSource(store);const source=s.materials[0],gap=s.materials[1],old=structuredClone(gap);assert.equal((await assessTask(s)).incomplete,true);s=await run(store,s,'confirm_gap_receipt',{gap_id:gap.id,material_id:source.id,reason:'PRIVATE_RECEIPT_BASIS',confirmed:true});assert.equal(s.materials[1].gap.resolution.actor,'alice');assert.equal(s.materials[1].gap.reason,old.gap.reason);assert.equal(s.materials[1].original_seen,false);assert.equal((await assessTask(s)).incomplete,false);assert.equal((await assessTask(s)).summary.no_anomaly,false);s=await run(store,s,'assess');s=await run(store,s,'freeze_card');const frozen=structuredClone(s.cards.at(-1));s=await run(store,s,'reopen_material_gap',{gap_id:gap.id,reason:'Further material needed'});assert.equal((await assessTask(s)).incomplete,true);assert.equal(s.materials[1].gap.history.length,2);assert.equal(s.materials[1].gap.resolution,null);assert.deepEqual(s.cards.at(-1),frozen);const {basicProjection}=await import('../lib/basic-evidence-card.js');assert.ok(!JSON.stringify(basicProjection(frozen,{fields:[],categories:[]})).includes('PRIVATE_RECEIPT_BASIS'));});
test('gap receipt requires explicit confirmation, valid source, scope, category and review',async t=>{const {store}=setup(t);let s=await gapAndSource(store);const gap=s.materials[1],data={gap_id:gap.id,material_id:s.materials[0].id,reason:'Synthetic basis',confirmed:true};for(const patch of [{confirmed:false},{material_id:gap.id},{material_id:'other-task'},{gap_id:s.materials[0].id},{reason:''}])await assert.rejects(run(store,s,'confirm_gap_receipt',{...data,...patch}));for(const patch of [{facility:'B'},{period:'2026-09'},{categories:['payroll']}]){s=await run(store,s,'import_text',imported(patch));const m=s.materials.at(-1);s=await run(store,s,'confirm_material',{material_id:m.id,reason:'Synthetic review'});await assert.rejects(run(store,s,'confirm_gap_receipt',{...data,material_id:m.id}),{code:'GAP_SOURCE_REQUIRED'});}s=await run(store,s,'import_text',imported());await assert.rejects(run(store,s,'confirm_gap_receipt',{...data,material_id:s.materials.at(-1).id}),{code:'GAP_SOURCE_REQUIRED'});assert.equal(s.materials.find(m=>m.id===gap.id).gap.status,'NOT_OBTAINED');});
test('gap receipt retry is idempotent; changing a confirmed link requires reopening',async t=>{const {store}=setup(t);let s=await gapAndSource(store);const cmd={action:'confirm_gap_receipt',task_id:s.task_id,expected_version:s.version,idempotency_key:'receipt-retry',data:{gap_id:s.materials[1].id,material_id:s.materials[0].id,reason:'Synthetic review',confirmed:true}};s=(await store.command('alice',cmd)).state;assert.equal((await store.command('alice',cmd)).state.materials[1].gap.history.length,1);await assert.rejects(run(store,s,'confirm_gap_receipt',cmd.data),{code:'GAP_ALREADY_CONFIRMED'});await assert.rejects(store.command('bob',{...cmd,idempotency_key:'other'}),{code:'TASK_NOT_FOUND'});});
test('gap receipt cannot remove unresolved fields or legacy directory limits',async t=>{const {store}=setup(t);let s=await gapAndSource(store);s=await run(store,s,'import_text',imported());s=await run(store,s,'locate_fields',{material_id:s.materials.at(-1).id});s=await run(store,s,'confirm_gap_receipt',{gap_id:s.materials[1].id,material_id:s.materials[0].id,reason:'Receipt only',confirmed:true});assert.equal((await assessTask(s)).incomplete,true);const {gapReceiptConfirmed}=await import('../lib/material-gap-resolution.js');assert.equal(gapReceiptConfirmed(s,{mode:'DIRECTORY'}),false);const forged=structuredClone(s.materials[1]);forged.gap.resolution.material_version=99;assert.equal(gapReceiptConfirmed(s,forged),false);});

test('field confirmation rejects missing numeric payloads atomically and preserves zero correction history',async t=>{const {store}=setup(t);let s=await located(store);const f=s.fields[0];for(const value of [null,'',false])await assert.rejects(run(store,s,'confirm_field',{field_id:f.id,value,reason:'Synthetic review'}),{code:'INVALID_VALUE'});await assert.rejects(run(store,s,'confirm_field',{field_id:f.id,reason:'Missing value'}),{code:'INVALID_VALUE'});assert.equal((await store.read('alice',s.task_id)).fields[0].confirmations.length,0);s=await run(store,s,'confirm_field',{field_id:f.id,value:0,reason:'Explicit zero'});const v=s.version;s=await run(store,s,'confirm_field',{field_id:f.id,value:10,reason:'Corrected against synthetic source'});assert.equal(s.fields[0].confirmations[1].previous_value,0);assert.equal((await store.read('alice',s.task_id,v)).fields[0].confirmed_value,0);});

test('task recovery: lost creation acknowledgement replays against real SQLite without a second task',async t=>{
 const {store,sqlite}=setup(t),queue=createTaskCommand();
 const original=create(),attempt=queue.prepare({action:original.action,data:{payload:original.data}});
 const toCommand=a=>({action:a.body.action,idempotency_key:a.key,data:a.body.data.payload});
 const saved=await store.command('alice',toCommand(attempt));
 queue.failed(Error('response lost after commit'));
 const retried=await store.command('alice',toCommand(queue.retry()));
 assert.equal(retried.state.task_id,saved.state.task_id);assert.equal(retried.replayed,true);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM dossivo_task_heads').get().n,1);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM dossivo_task_operations').get().n,1);
 queue.clear();assert.equal(queue.isUncertain(),false);
});
test('review summary follows actual append-only stored corrections without changing task or evidence state',async t=>{
 const {fieldReviewSummary}=await import('../lib/field-review-summary.js');const {store}=setup(t);let s=await located(store);
 const f=s.fields.find(x=>x.code==='payroll_total');s=await run(store,s,'confirm_field',{field_id:f.id,value:f.extracted_value+1,reason:'Synthetic correction'});
 s=await run(store,s,'confirm_field',{field_id:f.id,value:f.extracted_value,reason:'Synthetic restoration'});
 const before=await store.read('alice',s.task_id),report=fieldReviewSummary(before),after=await store.read('alice',s.task_id);
 assert.equal(report.counts.ever_changed,1);assert.equal(report.counts.change_events,2);assert.equal(report.counts.unchanged,1);assert.equal(report.counts.source_unlinked,0);assert.deepEqual(after,before);
 await assert.rejects(store.read('other-actor',s.task_id),{code:'TASK_NOT_FOUND'});
});
test('review summary API authenticates and authorizes before returning a private no-store projection',async t=>{
 const ts=(await import('typescript')).default,{createRequire}=await import('node:module'),require=createRequire(import.meta.url);
 const {db,store}=setup(t),s=await located(store);let actor=null;
 const output=ts.transpileModule(readFileSync(new URL('../app/api/private-tasks/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',output)(name=>{
  if(name==='cloudflare:workers')return {env:{DB:db}};
  if(name==='@/app/auth')return {getCurrentUser:async()=>actor?{userId:actor}:null};
  if(name.startsWith('@/lib/'))return require('../lib/'+name.slice(6)+'.js');
  return require(name);
 },module,module.exports);
 const get=()=>module.exports.GET(new Request('https://test.example/api/private-tasks?task='+encodeURIComponent(s.task_id)+'&review=1'));
 assert.equal((await get()).status,401);actor='other';assert.equal((await get()).status,404);actor='alice';
 const response=await get(),body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(body.task_id,s.task_id);assert.equal(body.counts.pending,s.fields.length);assert.equal(body.training_use,false);assert.equal(body.materials,undefined);
});
test('multilingual synthetic text persists source-linked unconfirmed candidates and never resolves duplicates automatically',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;
 s=await run(store,s,'import_text',{title:'Synthetic multilingual',text:'Monthly electricity: 2000 kWh\nElettricità mensile: 2000 kWh\nAddetti assicurati: 10 persone',facility:s.outcome.facility,period:s.outcome.period,categories:['electricity','social_insurance'],synthetic_only:true});
 s=await run(store,s,'locate_fields',{material_id:s.materials[0].id});assert.equal(s.fields.length,3);assert.ok(s.fields.every(f=>f.confirmed_value===null&&f.model===null));
 s=await confirmed(store,s);const assessed=await assessTask(s);assert.ok(assessed.candidate_conflicts.some(g=>g.code==='kwh_monthly'&&g.candidates.length===2));
 const saved=await store.read('alice',s.task_id);for(const f of saved.fields)assert.equal(saved.materials[0].text.slice(f.locator.start_utf16,f.locator.end_utf16),f.locator.quote);
});
test('zero-result location reports persist once without fabricated fields or overwriting original text',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;
 const text='Monthly electricity: 2,000 kWh\nRicavi: 10 EUR';
 s=await run(store,s,'import_text',{title:'Synthetic invalid formats',text,facility:s.outcome.facility,period:s.outcome.period,categories:['electricity','revenue'],synthetic_only:true});
 const materialId=s.materials[0].id,before=s.version;s=await run(store,s,'locate_fields',{material_id:materialId});
 assert.equal(s.fields.length,0);assert.equal(s.materials[0].location_report.issue_count,2);assert.equal(s.materials[0].text,text);
 assert.equal((await store.read('alice',s.task_id,before)).materials[0].location_report,undefined);
 assert.equal((await store.read('alice',s.task_id)).materials[0].location_report.issue_count,2);
 await assert.rejects(run(store,s,'locate_fields',{material_id:materialId}),{code:'ALREADY_LOCATED'});
});
test('bad alternate source blocks affected ratios and frozen card remains insufficient even with confirmed readable values',async t=>{
 const {basicProjection}=await import('../lib/basic-evidence-card.js');const {store}=setup(t);let s=await confirmed(store,await located(store));
 const goodAssessment=await assessTask(s);assert.equal(goodAssessment.metrics.find(m=>m.code==='R6a').status,'CALCULATED');
 s=await run(store,s,'import_text',{title:'Synthetic unresolved alternate',text:'Monthly electricity: 2,000 kWh',facility:s.outcome.facility,period:s.outcome.period,categories:['electricity'],synthetic_only:true});
 const versionBefore=s.version;s=await run(store,s,'assess');const a=s.assessments.at(-1);
 for(const code of ['R6a','R6b']){const metric=a.metrics.find(m=>m.code===code);assert.equal(metric.value,null);assert.equal(metric.reason,'SOURCE_PARSE_ISSUE');}
 assert.equal(a.metrics.find(m=>m.code==='R1').status,'CALCULATED');assert.equal(a.summary.insufficient,true);assert.equal(a.source_diagnostics.issue_count,1);
 assert.equal(s.materials.at(-1).location_report,undefined); // Fresh checks do not rewrite the material report.
 s=await run(store,s,'freeze_card');assert.equal(s.cards.at(-1).body.assessment.summary.insufficient,true);
 const publicView=basicProjection(s.cards.at(-1),{fields:[],categories:[]});assert.equal(publicView.assessment.insufficient,true);assert.doesNotMatch(JSON.stringify(publicView),/2,000|Synthetic unresolved alternate/);
 assert.equal((await store.read('alice',s.task_id,versionBefore)).assessments.length,0);
});
test('saved task pagination reaches beyond 50 with deterministic ties and isolates accounts',async t=>{
 const {store,sqlite}=setup(t);for(let i=0;i<105;i++)await store.command('alice',create());await store.command('bob',create());
 sqlite.prepare('UPDATE dossivo_task_heads SET updated_at=?').run('2026-11-07T00:00:00.000Z');
 const first=await store.listPage('alice'),second=await store.listPage('alice',first.next_before),third=await store.listPage('alice',second.next_before);
 assert.deepEqual([first.tasks.length,second.tasks.length,third.tasks.length],[50,50,5]);assert.equal(third.next_before,null);
 const ids=[...first.tasks,...second.tasks,...third.tasks].map(x=>x.id);assert.equal(new Set(ids).size,105);assert.deepEqual(ids,[...ids].sort().reverse());
 const bob=await store.listPage('bob');assert.equal(bob.tasks.length,1);assert.equal(ids.includes(bob.tasks[0].id),false);assert.equal((await store.list('alice')).length,50);
 const borrowed=await store.listPage('bob',first.next_before);assert.ok(borrowed.tasks.every(x=>x.id===bob.tasks[0].id));
 await assert.rejects(store.listPage('alice','bad!'),{code:'INVALID_CURSOR'});
});
test('task list refresh reveals new tasks without shifting older-page cursor results',async t=>{
 const {store,sqlite}=setup(t);for(let i=0;i<51;i++)await store.command('alice',create());
 sqlite.prepare('UPDATE dossivo_task_heads SET updated_at=?').run('2026-01-01T00:00:00.000Z');
 const first=await store.listPage('alice'),created=(await store.command('alice',create())).state;
 const older=await store.listPage('alice',first.next_before);assert.equal(older.tasks.length,1);assert.equal(older.tasks[0].id===created.task_id,false);assert.equal(first.tasks.some(x=>x.id===older.tasks[0].id),false);
 assert.equal((await store.listPage('alice')).tasks[0].id,created.task_id);
});
test('task search covers all pages and remains owner scoped',async t=>{
 const {store}=setup(t);
 for(let i=0;i<55;i++){const cmd=create();cmd.data.purpose='Electricity 合成 '+i;await store.command('alice',cmd);}
 await store.command('alice',create());const foreign=create();foreign.data.purpose='Electricity foreign';await store.command('bob',foreign);
 const first=await store.listPage('alice','',' electricity '),last=await store.listPage('alice',first.next_before,'electricity');
 assert.equal(first.tasks.length,50);assert.equal(last.tasks.length,5);assert.equal(last.next_before,null);
 assert.equal(new Set([...first.tasks,...last.tasks].map(t=>t.id)).size,55);assert.ok([...first.tasks,...last.tasks].every(t=>!t.title.includes('foreign')));
 assert.equal((await store.listPage('alice','','不存在')).tasks.length,0);
 assert.equal((await store.listPage('alice','','合成')).tasks.length,50);
});
test('task search treats SQL and wildcard characters literally and bounds input',async t=>{
 const {store}=setup(t);const cmd=create();cmd.data.purpose="100%_ 'quote' 合成";await store.command('alice',cmd);await store.command('alice',create());
 for(const q of ['%','_',"'quote'"])assert.equal((await store.listPage('alice','',q)).tasks.length,1);
 assert.equal((await store.listPage('alice','',"' OR 1=1 --")).tasks.length,0);
 assert.equal((await store.listPage('alice','','  ')).tasks.length,2);
 for(const q of [null,{},'x'.repeat(101)])await assert.rejects(store.listPage('alice','',q),{code:'INVALID_INPUT'});
});
test('task history pages immutable saved counts and excludes other accounts',async t=>{
 const {store}=setup(t);let s=(await store.command('alice',create())).state;
 for(let i=0;i<23;i++)s=await run(store,s,'add_material',{mode:'DIRECTORY',title:'Synthetic '+i,custodian:'Test'});
 const first=await store.history('alice',s.task_id),last=await store.history('alice',s.task_id,first.next_before);
 assert.deepEqual(first.versions.map(r=>r.version),Array.from({length:20},(_,i)=>24-i));assert.deepEqual(last.versions.map(r=>r.version),[4,3,2,1]);assert.equal(last.next_before,null);
 assert.equal(first.versions[0].materials,23);assert.equal(last.versions.at(-1).materials,0);assert.equal(first.current_version,24);
 assert.equal(first.versions[0].body_json,undefined);assert.equal(first.versions[0].confirmed,0);
 assert.deepEqual(await store.read('alice',s.task_id),s);
 await assert.rejects(store.history('bob',s.task_id),{code:'TASK_NOT_FOUND'});
 for(const cursor of ['0','-1','1.5','NaN','1 OR 1=1','9'.repeat(11)])await assert.rejects(store.history('alice',s.task_id,cursor),{code:'INVALID_INPUT'});
});
test('history API requires login and preserves private no-store response',async t=>{
 const ts=(await import('typescript')).default,{createRequire}=await import('node:module'),require=createRequire(import.meta.url);
 const {db,store}=setup(t),s=(await store.command('alice',create())).state;let actor=null;
 const output=ts.transpileModule(readFileSync(new URL('../app/api/private-tasks/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',output)(name=>{
  if(name==='cloudflare:workers')return {env:{DB:db}};
  if(name==='@/app/auth')return {getCurrentUser:async()=>actor?{userId:actor}:null};
  if(name.startsWith('@/lib/'))return require('../lib/'+name.slice(6)+'.js');return require(name);
 },module,module.exports);
 const get=()=>module.exports.GET(new Request('https://test.example/api/private-tasks?task='+encodeURIComponent(s.task_id)+'&history=1'));
 assert.equal((await get()).status,401);actor='bob';assert.equal((await get()).status,404);actor='alice';const r=await get();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal((await r.json()).versions[0].version,1);
});
test('history refuses a corrupted saved version instead of displaying its summary',async t=>{
 const {store,sqlite}=setup(t);const s=(await store.command('alice',create())).state;
 sqlite.exec('DROP TRIGGER task_versions_no_update');/* Deliberate privileged corruption fixture: verify read guard after write guard bypass. */sqlite.prepare('UPDATE dossivo_task_versions SET body_hash=? WHERE task_id=? AND version=?').run('tampered',s.task_id,1);
 await assert.rejects(store.history('alice',s.task_id),{code:'INTEGRITY_FAILED'});
});
test('adjacent field comparison reads real saved versions with owner and integrity enforcement',async t=>{
 const {store,sqlite}=setup(t);let s=await located(store);const before=s.version,field=s.fields[0];s=await run(store,s,'confirm_field',{field_id:field.id,value:0,reason:'Synthetic zero confirmation'});
 const r=await store.fieldChanges('alice',s.task_id,String(s.version));assert.equal(r.from_version,before);assert.equal(r.to_version,s.version);assert.equal(r.total,1);assert.equal(r.changes[0].after.confirmed_value,0);assert.equal(r.changes[0].before.confirmed_value,null);assert.deepEqual(await store.read('alice',s.task_id),s);
 await assert.rejects(store.fieldChanges('bob',s.task_id,String(s.version)),{code:'TASK_NOT_FOUND'});
 for(const v of ['1','-1','2.5','2x','99999999999'])await assert.rejects(store.fieldChanges('alice',s.task_id,v),{code:'INVALID_INPUT'});
 await assert.rejects(store.fieldChanges('alice',s.task_id,'999'),{code:'VERSION_NOT_FOUND'});
 sqlite.exec('DROP TRIGGER task_versions_no_update');/* Deliberate privileged corruption fixture: verify read guard after write guard bypass. */sqlite.prepare('UPDATE dossivo_task_versions SET body_hash=? WHERE task_id=? AND version=?').run('bad',s.task_id,before);
 await assert.rejects(store.fieldChanges('alice',s.task_id,String(s.version)),{code:'INTEGRITY_FAILED'});
});
test('shared readiness tracks assess freeze update and reassess while preserving old cards',async t=>{
 const {assessmentReadiness}=await import('../lib/assessment-readiness.js');const {store}=setup(t);let s=await located(store);
 assert.equal(assessmentReadiness(s).status,'missing');await assert.rejects(run(store,s,'freeze_card'),{code:'ASSESSMENT_STALE'});
 s=await run(store,s,'assess');assert.equal(assessmentReadiness(s).status,'ready');s=await run(store,s,'freeze_card');const old=structuredClone(s.cards[0]);assert.equal(assessmentReadiness(s).status,'frozen');
 await assert.rejects(run(store,s,'freeze_card'),{code:'ASSESSMENT_STALE'});
 s=await run(store,s,'confirm_field',{field_id:s.fields[0].id,value:0,reason:'Synthetic update'});assert.equal(assessmentReadiness(s).status,'needs_check');await assert.rejects(run(store,s,'freeze_card'),{code:'ASSESSMENT_STALE'});
 s=await run(store,s,'assess');assert.equal(assessmentReadiness(s).status,'ready');s=await run(store,s,'freeze_card');assert.equal(s.cards.length,2);assert.deepEqual(s.cards[0],old);assert.equal(assessmentReadiness(s).status,'frozen');
});
test('owner HTML download header identifies stored snapshot and retains access protection',async t=>{
 const ts=(await import('typescript')).default,{createRequire}=await import('node:module'),require=createRequire(import.meta.url);
 const {db,store}=setup(t);let s=await located(store);s=await run(store,s,'assess');s=await run(store,s,'freeze_card');const card=s.cards[0];let actor='alice';
 const output=ts.transpileModule(readFileSync(new URL('../app/api/private-tasks/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',output)(name=>{if(name==='cloudflare:workers')return {env:{DB:db}};if(name==='@/app/auth')return {getCurrentUser:async()=>actor?{userId:actor}:null};if(name.startsWith('@/lib/'))return require('../lib/'+name.slice(6)+'.js');return require(name);},module,module.exports);
 const get=()=>module.exports.GET(new Request('https://test.example/api/private-tasks?'+new URLSearchParams({task:s.task_id,card:card.id,format:'html',lang:'it'})));
 const r=await get();assert.equal(r.status,200);assert.equal(r.headers.get('content-disposition'),`attachment; filename="DOSSIVO_basic_${card.id}_v${card.body.task_version}_it.html"`);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.match(r.headers.get('content-security-policy'),/sandbox/);assert.match(await r.text(),/lang="it"/);
 actor='bob';assert.equal((await get()).status,404);actor=null;assert.equal((await get()).status,401);
});
test('database history rejects update delete replace and upsert while normal appending and replay work',async t=>{
 const {store,sqlite}=setup(t),cmd=create();let s=(await store.command('alice',cmd)).state;
 const original=sqlite.prepare('SELECT * FROM dossivo_task_versions WHERE task_id=?').get(s.task_id);
 for(const recursive of [0,1]){
  sqlite.exec('PRAGMA recursive_triggers='+recursive);
  for(const sql of ["UPDATE dossivo_task_versions SET body_json='{}' WHERE task_id=?","DELETE FROM dossivo_task_versions WHERE task_id=?","INSERT OR REPLACE INTO dossivo_task_versions SELECT task_id,tenant_id,version,'{}',body_hash,created_at FROM dossivo_task_versions WHERE task_id=?","INSERT INTO dossivo_task_versions SELECT * FROM dossivo_task_versions WHERE task_id=? ON CONFLICT(task_id,version) DO UPDATE SET body_json='{}'"]){assert.throws(()=>sqlite.prepare(sql).run(s.task_id),/TASK_HISTORY_APPEND_ONLY/);assert.deepEqual(sqlite.prepare('SELECT * FROM dossivo_task_versions WHERE task_id=?').get(s.task_id),original);}
 }
 assert.equal((await store.command('alice',cmd)).state.task_id,s.task_id);
 s=await run(store,s,'add_material',{mode:'DIRECTORY',title:'Synthetic missing evidence',custodian:'Test'});assert.equal(s.version,2);assert.equal((await store.read('alice',s.task_id,1)).materials.length,0);
});
test('append-only migration preserves preexisting history rows and protects them immediately',t=>{
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 for(const n of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')&&!x.startsWith('0025_')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+n,import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO dossivo_task_versions VALUES(?,?,?,?,?,?)').run('legacy','alice',1,'{}','old-digest','2026-01-01');
 const before=sqlite.prepare('SELECT * FROM dossivo_task_versions').all();sqlite.exec(readFileSync(new URL('../drizzle/0025_task_history_append_only.sql',import.meta.url),'utf8'));assert.deepEqual(sqlite.prepare('SELECT * FROM dossivo_task_versions').all(),before);
 assert.throws(()=>sqlite.exec('DELETE FROM dossivo_task_versions'),/TASK_HISTORY_APPEND_ONLY/);
 sqlite.prepare('INSERT INTO dossivo_task_versions VALUES(?,?,?,?,?,?)').run('legacy','alice',2,'{}','new-digest','2026-01-02');assert.equal(sqlite.prepare('SELECT count(*) n FROM dossivo_task_versions').get().n,2);
});
