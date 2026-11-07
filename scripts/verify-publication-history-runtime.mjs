import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=wranglerRequire('miniflare');
const root=path.resolve(import.meta.dirname,'..'),temporary=mkdtempSync(path.join(tmpdir(),'dossivo-publication-history-'));
const options={modules:true,script:'export default {fetch(){return new Response("local fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],d1Persist:path.join(temporary,'d1')};
let mf=new Miniflare(options),checks=0;
const check=label=>{checks++;console.log('PASS '+label);};
try{
 let db=await mf.getD1Database('DB');
 const apply=async file=>{for(const sql of readFileSync(path.join(root,'drizzle',file),'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();};
 for(const file of readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')&&!f.startsWith('0026_')).sort())await apply(file);
 await db.prepare('INSERT INTO dossivo_basic_grants(id,owner_id,task_id,card_id,code_hash,snapshot_json,snapshot_hash,choice_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('g','owner','task','card','synthetic-code-hash','{}','synthetic-digest','{}','2026-11-07','2026-11-09').run();
 await db.prepare('INSERT INTO dossivo_summary_publications VALUES(?,?,?,?,?,?,?,?)').bind('p1','g',1,'card','{}','synthetic-digest','previous','2026-11-07').run();
 const original=await db.prepare('SELECT * FROM dossivo_basic_grants').first(),publication=await db.prepare('SELECT * FROM dossivo_summary_publications').first();await apply('0026_publication_history_append_only.sql');assert.deepEqual(await db.prepare('SELECT * FROM dossivo_basic_grants').first(),original);assert.deepEqual(await db.prepare('SELECT * FROM dossivo_summary_publications').first(),publication);check('upgrade preserves original grant and published snapshot');
 for(const table of ['dossivo_basic_grants','dossivo_summary_publications'])for(const sql of [`UPDATE ${table} SET snapshot_json='changed'`,`DELETE FROM ${table}`,`INSERT OR REPLACE INTO ${table} SELECT * FROM ${table}`]){await assert.rejects(db.prepare(sql).run(),/IMMUTABLE|APPEND_ONLY/);check(table+' blocks '+sql.split(' ')[0]);}
 await db.prepare("UPDATE dossivo_basic_grants SET redeemed_by='buyer',redeemed_at='2026-11-07',publication_seq=2,revoked_at='2026-11-08' WHERE id='g'").run();await db.prepare('INSERT INTO dossivo_summary_publications VALUES(?,?,?,?,?,?,?,?)').bind('p2','g',2,'card2','{}','new-digest','synthetic-digest','2026-11-08').run();assert.equal((await db.prepare('SELECT count(*) n FROM dossivo_summary_publications').first()).n,2);check('lifecycle columns and appended publications remain writable');
 await mf.dispose();mf=new Miniflare(options);db=await mf.getD1Database('DB');assert.equal((await db.prepare('SELECT revoked_at FROM dossivo_basic_grants').first()).revoked_at,'2026-11-08');await assert.rejects(db.prepare('DELETE FROM dossivo_summary_publications').run(),/APPEND_ONLY/);check('restart preserves lifecycle state and publication guard');
 console.log(JSON.stringify({checks,result:'PASS',runtime:'local Miniflare/workerd D1',production:false,customer_data:false}));
}finally{await mf.dispose();rmSync(temporary,{recursive:true,force:true});}
