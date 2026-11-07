import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {privateFileRequest} from '../lib/private-file-request.js';
// Resolve the already-pinned Wrangler runtime; no install, account or cloud credentials.
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const root=path.resolve(import.meta.dirname,'..');
const temporary=mkdtempSync(path.join(tmpdir(),'dossivo-file-runtime-'));
const runtimeOptions={modules:true,script:'export default {fetch(){return new Response("local fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['BUCKET'],d1Persist:path.join(temporary,'d1'),r2Persist:path.join(temporary,'r2')};
let mf=new Miniflare(runtimeOptions);
let passed=0;
function check(label){passed++;console.log('PASS '+label);}
try{
 let db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('BUCKET');
 async function restart(){await mf.dispose();mf=new Miniflare(runtimeOptions);db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');}
 for(const file of readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  for(const statement of readFileSync(path.join(root,'drizzle',file),'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 check('all tracked migrations applied to local D1, including history triggers');
 for(const [id,owner] of [['task-A','synthetic-owner'],['task-B','synthetic-buyer']])await db.prepare('INSERT INTO dossivo_task_heads(id,tenant_id,title,version,last_operation_id,updated_at) VALUES(?,?,?,1,?,?)').bind(id,owner,'Synthetic runtime test','fixture','2026-11-07T00:00:00Z').run();
 const payload=new TextEncoder().encode('%PDF-1.4\nSynthetic runtime fixture, not a customer document\n%%EOF');
 const request=({method='GET',file='',history=false,actor='synthetic-owner',task='task-A',allowed='["synthetic-owner"]',origin='https://local.test'}={})=>privateFileRequest(new Request('https://local.test/api/private-files?task='+task+(file?'&file='+file:'')+(history?'&history=1':''),{method,headers:{origin,'content-type':'application/pdf','idempotency-key':'fixture-upload','x-file-name':'synthetic.pdf','x-dossivo-file-confirmation':'synthetic-test-only-v1'},...(method==='POST'?{body:payload}:{})}),actor,db,bucket,allowed);
 const upload=await request({method:'POST'});assert.equal(upload.status,201,await upload.clone().text());const saved=await upload.json();assert.equal(saved.state,'STORED_UNREVIEWED');check('real local R2 upload and D1 finalisation');
 const retry=await (await request({method:'POST'})).json();assert.equal(retry.id,saved.id);assert.equal((await bucket.list()).objects.length,1);check('retry creates no duplicate object');
 const download=await request({file:saved.id});assert.equal(download.status,200,await download.clone().text());assert.deepEqual(new Uint8Array(await download.arrayBuffer()),payload);check('R2 body stream passes byte bounds and digest validation');
 assert.equal((await request({actor:'synthetic-buyer',task:'task-B',file:saved.id})).status,404);assert.equal((await request({method:'DELETE',file:saved.id,origin:'https://other.test'})).status,403);check('cross-account and cross-origin denial');
 assert.equal((await request({method:'POST',allowed:'[]'})).status,503);assert.equal((await request({file:saved.id,allowed:'[]'})).status,200);check('upload gate closure preserves owner download');
 await restart();
 const reopened=await (await request()).json();assert.equal(reopened.files.length,1);assert.equal(reopened.files[0].id,saved.id);assert.deepEqual(new Uint8Array(await (await request({file:saved.id})).arrayBuffer()),payload);check('restart retains matching D1 metadata and R2 file bytes');
 assert.equal((await request({actor:'synthetic-buyer',task:'task-B',file:saved.id})).status,404);assert.equal((await request({method:'POST',allowed:'[]'})).status,503);check('restart preserves owner isolation and upload admission');
 const restartedRetry=await (await request({method:'POST'})).json();assert.equal(restartedRetry.id,saved.id);assert.equal((await bucket.list()).objects.length,1);assert.equal((await (await request({history:true})).json()).events.length,2);check('retry after restart retains idempotency without extra objects or history');
 const snapshotHistory=await (await request({history:true})).json();
 // A consistent test snapshot requires BOTH stores while writes are stopped.
 await mf.dispose();
 const backup=path.join(temporary,'backup');
 cpSync(runtimeOptions.d1Persist,path.join(backup,'d1'),{recursive:true});
 cpSync(runtimeOptions.r2Persist,path.join(backup,'r2'),{recursive:true});
 mf=new Miniflare(runtimeOptions);db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');
 const removed=await request({method:'DELETE',file:saved.id,allowed:'[]'});assert.equal(removed.status,200);assert.equal((await bucket.list()).objects.length,0);assert.equal((await request({file:saved.id})).status,409);check('deletion removes local R2 bytes and blocks further downloads');
 const history=await (await request({history:true,allowed:'[]'})).json();assert.deepEqual(history.events.map(e=>e.to_state),['DELETED','DELETING','STORED_UNREVIEWED','UPLOADING']);assert.doesNotMatch(JSON.stringify(history),/synthetic.pdf|private-staging/);check('D1 triggers retain minimal state history');
 await assert.rejects(db.prepare('DELETE FROM dossivo_private_file_events').run());check('runtime enforces append-only history');
 await restart();
 assert.equal((await bucket.list()).objects.length,0);assert.equal((await request({file:saved.id})).status,409);assert.deepEqual((await (await request()).json()).files,[]);assert.equal((await request({method:'POST'})).status,409);check('restart after delete does not resurrect bytes or permit old-key reupload');
 const retainedHistory=await (await request({history:true})).json();assert.deepEqual(retainedHistory.events,history.events);await assert.rejects(db.prepare("UPDATE dossivo_private_file_events SET to_state='UPLOADING'").run());check('restart preserves exact historical events and append-only triggers');
 const deletionManifest=(await db.prepare("SELECT id,task_id,owner_id FROM dossivo_private_files WHERE state='DELETED'").all()).results;
 await mf.dispose();
 const restore=path.join(temporary,'restore');cpSync(backup,restore,{recursive:true});
 mf=new Miniflare({...runtimeOptions,d1Persist:path.join(restore,'d1'),r2Persist:path.join(restore,'r2')});db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('BUCKET');
 assert.deepEqual(new Uint8Array(await (await request({file:saved.id})).arrayBuffer()),payload);assert.deepEqual((await (await request({history:true})).json()).events,snapshotHistory.events);check('isolated paired-store snapshot restores exact bytes and snapshot history');
 assert.equal((await request({actor:'synthetic-buyer',task:'task-B',file:saved.id})).status,404);assert.equal((await request({method:'POST',allowed:'[]'})).status,503);check('restore preserves owner isolation and does not grant upload admission');
 assert.equal((await request({file:saved.id})).status,200);assert.ok(deletionManifest.some(e=>e.id===saved.id));check('stale backup demonstrably contains a subsequently deleted file: reconciliation required');
 // Test-only reconciliation from current deletion metadata, before any restored service is exposed.
 for(const entry of deletionManifest){assert.equal((await request({method:'DELETE',file:entry.id,task:entry.task_id,actor:entry.owner_id,allowed:'[]'})).status,200);}
 assert.equal((await bucket.list()).objects.length,0);assert.equal((await request({file:saved.id})).status,409);check('replaying deletion manifest removes stale restored bytes before release');
 console.log(JSON.stringify({checks:passed,result:'PASS',runtime:'local Miniflare/workerd D1 and R2',production:false,customer_data:false}));
}finally{await mf.dispose();rmSync(temporary,{recursive:true,force:true});}
