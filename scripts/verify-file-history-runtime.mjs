import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=wranglerRequire('miniflare');
const root=path.resolve(import.meta.dirname,'..'),temporary=mkdtempSync(path.join(tmpdir(),'dossivo-file-history-'));
const options={modules:true,script:'export default {fetch(){return new Response("local fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],d1Persist:path.join(temporary,'d1')};
let mf=new Miniflare(options),checks=0;
const check=label=>{checks++;console.log('PASS '+label);};
try{
 let db=await mf.getD1Database('DB');
 const apply=async file=>{for(const sql of readFileSync(path.join(root,'drizzle',file),'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();};
 for(const file of readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')&&!f.startsWith('0029_')).sort())await apply(file);
 await db.prepare("INSERT INTO dossivo_private_file_events(file_id,owner_id,task_id,to_state,recorded_at) VALUES('synthetic','owner','task','UPLOADING','2026-11-07')").run();
 const before=(await db.prepare('SELECT * FROM dossivo_private_file_events').all()).results;
 await apply('0029_private_file_history_replace_guard.sql');
 assert.deepEqual((await db.prepare('SELECT * FROM dossivo_private_file_events').all()).results,before);check('migration preserves preexisting history');
 for(const recursive of ['OFF','ON']){
  await db.prepare('PRAGMA recursive_triggers='+recursive).run();
  for(const insert of ['INSERT OR REPLACE','REPLACE'])await assert.rejects(db.prepare(`${insert} INTO dossivo_private_file_events(sequence,file_id,owner_id,task_id,to_state,recorded_at) VALUES(1,'forged','other','task','DELETED','2099')`).run(),/FILE_HISTORY_APPEND_ONLY/);
  assert.deepEqual((await db.prepare('SELECT * FROM dossivo_private_file_events').all()).results,before);check('replacement rejected with recursive triggers '+recursive);
 }
 await db.prepare("INSERT INTO dossivo_private_file_events(file_id,owner_id,task_id,to_state,recorded_at) VALUES('synthetic','owner','task','STORED_UNREVIEWED','2026-11-07')").run();
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM dossivo_private_file_events').first()).n,2);check('new history remains appendable');
 await mf.dispose();mf=new Miniflare(options);db=await mf.getD1Database('DB');
 await assert.rejects(db.prepare('INSERT OR REPLACE INTO dossivo_private_file_events SELECT * FROM dossivo_private_file_events').run(),/FILE_HISTORY_APPEND_ONLY/);check('restart retains replacement guard');
 console.log(JSON.stringify({checks,result:'PASS',runtime:'local Miniflare/workerd D1',production:false,customer_data:false}));
}finally{await mf.dispose();rmSync(temporary,{recursive:true,force:true});}
