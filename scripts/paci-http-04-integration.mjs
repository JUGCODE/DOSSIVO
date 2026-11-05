// Run with the explicitly selected existing PACIscan core. No fork or replacement engine.
// Synthetic loopback HTTP acceptance only; no deployment or external service claimed.
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {TaskRegistrationStore} from '../lib/task-registration-store.js';
import {PrivateTaskStore} from '../lib/private-task-store.js';
import {PaciRegistrationClient,registrationEnvelope} from '../lib/paci-http-client.js';
const path=process.argv[2];if(!path)throw Error('Pass the exact existing paci-core directory');
const core=resolve(path),from=async p=>import(pathToFileURL(join(core,p)));
const {PaciEngine}=await from('src/engine.ts'),{createPaciServer,hashToken}=await from('src/server.ts'),{SqliteStore,FileKeyStore}=await from('src/store.ts');
const pkg=JSON.parse(readFileSync(join(core,'package.json'),'utf8'));assert.equal(pkg.version,'0.4.2-alpha.1','Re-review a changed core before asserting compatibility');
const dir=mkdtempSync(join(tmpdir(),'dossivo-paci-http-'));
let server,remoteStore,local;let count=0,posts=0;
const report=[];const passed=(id,result)=>{report.push({id,result});console.log(id+': '+result);};
const closeServer=async()=>{if(server){await new Promise((r,j)=>server.close(e=>e?j(e):r()));server=null;}};
try{
 local=new DatabaseSync(join(dir,'dossivo.sqlite'));for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())local.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const db={failAt:-1,prepare(sql){const q=values=>({sql,values,bind:(...v)=>q(v),first:async()=>local.prepare(sql).get(...values)??null,all:async()=>({results:local.prepare(sql).all(...values)}),run:async()=>local.prepare(sql).run(...values)});return q([]);},async batch(statements){local.exec('BEGIN');try{for(let i=0;i<statements.length;i++){if(db.failAt===i)throw Error('Injected local commit failure');const s=statements[i];local.prepare(s.sql).run(...s.values);}local.exec('COMMIT');return [];}catch(e){local.exec('ROLLBACK');throw e;}}};
 const token='synthetic-service-'+crypto.randomUUID(),binding={origin:'https://paci.test.invalid',tenant_id:'paci-alice',service_actor_id:'dossivo-service',token,api_version:'paci-http/0.4'};
 async function start(){remoteStore=new SqliteStore(join(dir,'paci.sqlite'));const engine=new PaciEngine({store:remoteStore,keys:new FileKeyStore(join(dir,'keys'))});if(!count)engine.registerTenant('ops',{tenant_id:binding.tenant_id,region:'test',members:[binding.service_actor_id]},'setup');count++;
  server=createPaciServer(engine,{tokens:[{token_sha256:hashToken(token),tenant_id:binding.tenant_id,actor_id:binding.service_actor_id,role:'member'}]});await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;}
 let base=await start(),dropPost=false;
 const actualFetch=async(url,options)=>{if(options.method==='POST')posts++;const r=await fetch(base+new URL(url).pathname,options);if(dropPost&&options.method==='POST'&&r.ok){dropPost=false;await r.text();throw Error('Simulated transport loss after actual upstream commit');}return r;};
 const store=new PrivateTaskStore(db);let s=(await store.command('alice',{action:'create',idempotency_key:'new',data:{purpose:'真实 HTTP 合成往返',organization:'合成供应商',facility:'合成工厂A',period:'2026-10',synthetic_only:true}})).state;
 const command=async(action,data={})=>{s=(await store.command('alice',{action,data,task_id:s.task_id,expected_version:s.version,idempotency_key:'task-'+s.version})).state;};
 await command('add_material',{sample:'normal'});await command('locate_fields',{material_id:s.materials[0].id});for(const f of s.fields)await command('confirm_field',{field_id:f.id,value:f.extracted_value,reason:'合成原文核对'});await command('assess');await command('freeze_card');
 const op=(await store.outbox('alice',s.task_id))[0].operation_id;const dispatcher=new TaskRegistrationStore(db);
 dropPost=true;await assert.rejects(dispatcher.sync('alice',s.task_id,op,binding,{fetch:actualFetch}),{code:'PACI_NETWORK_UNCONFIRMED'});assert.equal((await store.outbox('alice',s.task_id))[0].state,'PENDING');assert.equal(posts,1);passed('DS36-loss','actual remote commit + lost reply remains unconfirmed locally');
 await closeServer();remoteStore.close();base=await start();
 const result=await new TaskRegistrationStore(db).sync('alice',s.task_id,op,binding,{fetch:actualFetch});assert.equal(result.registration,'REGISTERED');assert.equal(result.verification,'UNVERIFIED');assert.equal(result.formal_card,false);assert.equal(posts,1);passed('DS36-restart','recovered same operation from real HTTP + restarted SQLite core, no second POST');
 const delivered=local.prepare('SELECT * FROM dossivo_task_deliveries WHERE operation_id=?').get(op);assert.ok(delivered.record_id);assert.equal(JSON.stringify(delivered).includes(token),false);
 await assert.rejects(dispatcher.sync('bob',s.task_id,op,binding,{fetch:actualFetch}),{code:'TASK_NOT_FOUND'});passed('DS38-scope','other actor cannot dispatch or read Alice task');
 await assert.rejects(dispatcher.sync('alice',s.task_id,op,{...binding,tenant_id:'wrong'},{fetch:actualFetch}),{code:'PACI_BINDING_OR_PAYLOAD_CHANGED'});passed('DS38-binding','changed tenant binding rejected before network');
 let changed=true;const badFetch=async(url,opts)=>{const r=await actualFetch(url,opts);const body=await r.json();if(changed&&body.result?.result?.content){changed=false;body.result.result.content.preparation.task_version=999;}return new Response(JSON.stringify(body),{status:r.status,headers:r.headers});};
 await assert.rejects(dispatcher.sync('alice',s.task_id,op,binding,{fetch:badFetch}),{code:'PACI_RECEIPT_MISMATCH'});assert.equal((await store.outbox('alice',s.task_id))[0].state,'PENDING');await dispatcher.sync('alice',s.task_id,op,binding,{fetch:actualFetch});passed('DS38-receipt','modified returned card/version rejected, valid original receipt recovered');
 // A second immutable card exercises successful upstream delivery followed by local commit failure.
 await command('assess');await command('freeze_card');const op2=(await store.outbox('alice',s.task_id)).find(x=>x.operation_id!==op).operation_id;db.failAt=0;
 await assert.rejects(dispatcher.sync('alice',s.task_id,op2,binding,{fetch:actualFetch}));db.failAt=-1;const beforePosts=posts;await dispatcher.sync('alice',s.task_id,op2,binding,{fetch:actualFetch});assert.equal(posts,beforePosts);passed('DS36-local-failure','local D1-facade transaction failure recovers original remote registration');
 const e=JSON.parse(delivered.envelope_json);const legacy={...e,protocol:'paci-http/0.3'};await assert.rejects(new PaciRegistrationClient({...binding,api_version:'paci-http/0.3'},{fetch:actualFetch}).registerOrRecover(legacy),{code:'PACI_HTTP_400'});passed('D0-version','real 0.4 server rejects old protocol; no silent endpoint-family fallback');
 assert.equal((await store.exportCard('alice',s.task_id,s.cards[0].id)).body.chain_status,'NOT_CONNECTED');passed('DS39/40/56','registration never becomes original authentication, independent review or chain proof');
 console.log(JSON.stringify({environment:'Node loopback HTTP + two SQLite databases + actual PACI core',core_version:pkg.version,passed:report.length,failed:0,post_count:posts,checks:report},null,2));
}finally{await closeServer();remoteStore?.close();local?.close();rmSync(dir,{recursive:true,force:true});}
