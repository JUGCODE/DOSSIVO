import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PrivateTaskStore} from '../lib/private-task-store.js';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=wranglerRequire('miniflare');
const root=path.resolve(import.meta.dirname,'..'),temporary=mkdtempSync(path.join(tmpdir(),'dossivo-task-history-'));
const options={modules:true,script:'export default {fetch(){return new Response("local fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],d1Persist:path.join(temporary,'d1')};
let mf=new Miniflare(options),checks=0;
const check=label=>{checks++;console.log('PASS '+label);};
try{
 let db=await mf.getD1Database('DB');
 const apply=async file=>{for(const sql of readFileSync(path.join(root,'drizzle',file),'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();};
 for(const file of readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')&&!f.startsWith('0025_')).sort())await apply(file);
 let store=new PrivateTaskStore(db);const cmd={action:'create',idempotency_key:'runtime-create',data:{synthetic_only:true,purpose:'Synthetic migration test',organization:'Synthetic company',facility:'Synthetic facility',period:'2026-11'}};
 const original=(await store.command('owner',cmd)).state;await apply('0025_task_history_append_only.sql');assert.deepEqual(await store.read('owner',original.task_id),original);check('upgrade preserves preexisting snapshot');
 for(const sql of ["UPDATE dossivo_task_versions SET body_json='{}' WHERE task_id=?","DELETE FROM dossivo_task_versions WHERE task_id=?","INSERT OR REPLACE INTO dossivo_task_versions SELECT task_id,tenant_id,version,'{}',body_hash,created_at FROM dossivo_task_versions WHERE task_id=?"]){await assert.rejects(db.prepare(sql).bind(original.task_id).run(),/TASK_HISTORY_APPEND_ONLY/);check('D1 blocks '+sql.split(' ')[0]);}
 assert.deepEqual((await store.command('owner',cmd)).state,original);check('idempotent replay still works');
 const next=(await store.command('owner',{action:'add_material',task_id:original.task_id,expected_version:1,idempotency_key:'runtime-append',data:{mode:'DIRECTORY',title:'Synthetic directory',custodian:'Synthetic owner'}})).state;assert.equal(next.version,2);assert.deepEqual(await store.read('owner',original.task_id,1),original);check('new version appends without modifying old snapshot');
 await mf.dispose();mf=new Miniflare(options);db=await mf.getD1Database('DB');store=new PrivateTaskStore(db);assert.equal((await store.read('owner',original.task_id)).version,2);await assert.rejects(db.prepare('DELETE FROM dossivo_task_versions WHERE task_id=?').bind(original.task_id).run(),/TASK_HISTORY_APPEND_ONLY/);check('restart preserves history and guard');
 console.log(JSON.stringify({checks,result:'PASS',runtime:'local Miniflare/workerd D1',production:false,customer_data:false}));
}finally{await mf.dispose();rmSync(temporary,{recursive:true,force:true});}
