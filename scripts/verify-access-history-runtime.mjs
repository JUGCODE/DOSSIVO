import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=wranglerRequire('miniflare');
const root=path.resolve(import.meta.dirname,'..'),temporary=mkdtempSync(path.join(tmpdir(),'dossivo-access-history-'));
const options={modules:true,script:'export default {fetch(){return new Response("local fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],d1Persist:path.join(temporary,'d1')};
let mf=new Miniflare(options),checks=0;
const check=label=>{checks++;console.log('PASS '+label);};
try{
 let db=await mf.getD1Database('DB');
 const apply=async file=>{for(const sql of readFileSync(path.join(root,'drizzle',file),'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();};
 for(const file of readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')&&!f.startsWith('0027_')).sort())await apply(file);
 await db.prepare('INSERT INTO dossivo_access_events(id,grant_id,actor_id,kind,created_at,card_id) VALUES(?,?,?,?,?,?)').bind('event1','synthetic-grant','synthetic-buyer','VIEWED','2026-11-07','synthetic-card').run();
 const original=await db.prepare('SELECT * FROM dossivo_access_events').first();await apply('0027_access_events_append_only.sql');assert.deepEqual(await db.prepare('SELECT * FROM dossivo_access_events').first(),original);check('migration preserves preexisting access event');
 for(const sql of ["UPDATE dossivo_access_events SET kind='DOWNLOADED'","DELETE FROM dossivo_access_events","INSERT OR REPLACE INTO dossivo_access_events SELECT * FROM dossivo_access_events"]){await assert.rejects(db.prepare(sql).run(),/ACCESS_HISTORY_APPEND_ONLY/);check('D1 blocks '+sql.split(' ')[0]);}
 await db.prepare('INSERT INTO dossivo_access_events(id,grant_id,actor_id,kind,created_at,card_id) VALUES(?,?,?,?,?,?)').bind('event2','synthetic-grant','synthetic-buyer','DOWNLOADED','2026-11-08','synthetic-card').run();assert.equal((await db.prepare('SELECT count(*) n FROM dossivo_access_events').first()).n,2);check('new access event still appends');
 await mf.dispose();mf=new Miniflare(options);db=await mf.getD1Database('DB');assert.equal((await db.prepare('SELECT count(*) n FROM dossivo_access_events').first()).n,2);await assert.rejects(db.prepare('DELETE FROM dossivo_access_events').run(),/ACCESS_HISTORY_APPEND_ONLY/);check('restart retains events and guard');
 console.log(JSON.stringify({checks,result:'PASS',runtime:'local Miniflare/workerd D1',production:false,customer_data:false}));
}finally{await mf.dispose();rmSync(temporary,{recursive:true,force:true});}
