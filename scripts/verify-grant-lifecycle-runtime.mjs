import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=wranglerRequire('miniflare');
const root=path.resolve(import.meta.dirname,'..'),temporary=mkdtempSync(path.join(tmpdir(),'dossivo-grant-lifecycle-'));
const options={modules:true,script:'export default {fetch(){return new Response("local fixture")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],d1Persist:path.join(temporary,'d1')};
let mf=new Miniflare(options),checks=0;
const check=label=>{checks++;console.log('PASS '+label);};
try{
 let db=await mf.getD1Database('DB');
 const apply=async file=>{for(const sql of readFileSync(path.join(root,'drizzle',file),'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();};
 for(const file of readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')&&!f.startsWith('0028_')).sort())await apply(file);
 for(const id of ['active','revoked'])await db.prepare('INSERT INTO dossivo_basic_grants(id,owner_id,task_id,card_id,code_hash,snapshot_json,snapshot_hash,choice_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,'owner','task','card',id+'-synthetic-hash','{}','synthetic-digest','{}','2026-11-07','2026-11-09').run();
 await db.prepare("UPDATE dossivo_basic_grants SET revoked_at='2026-11-07' WHERE id='revoked'").run();const before=(await db.prepare('SELECT * FROM dossivo_basic_grants ORDER BY id').all()).results;await apply('0028_grant_lifecycle_guards.sql');assert.deepEqual((await db.prepare('SELECT * FROM dossivo_basic_grants ORDER BY id').all()).results,before);check('migration preserves active and already revoked grants');
 await assert.rejects(db.prepare("UPDATE dossivo_basic_grants SET redeemed_by='buyer' WHERE id='active'").run(),/GRANT_REDEMPTION_FIXED/);check('partial redemption rejected');
 await db.prepare("UPDATE dossivo_basic_grants SET redeemed_by='buyer',redeemed_at='2026-11-07' WHERE id='active'").run();check('first complete redemption allowed');
 await assert.rejects(db.prepare("UPDATE dossivo_basic_grants SET redeemed_by='other' WHERE id='active'").run(),/GRANT_REDEMPTION_FIXED/);check('buyer rebinding rejected');
 await assert.rejects(db.prepare("UPDATE dossivo_basic_grants SET revoked_at=NULL WHERE id='revoked'").run(),/GRANT_REVOCATION_FINAL/);await assert.rejects(db.prepare("UPDATE dossivo_basic_grants SET redeemed_by='buyer',redeemed_at='2026-11-07' WHERE id='revoked'").run(),/GRANT_REDEMPTION_FIXED/);check('revoked grant cannot reopen or redeem');
 await db.prepare("UPDATE dossivo_basic_grants SET revoked_at=COALESCE(revoked_at,'2026-11-08') WHERE id='active'").run();await db.prepare("UPDATE dossivo_basic_grants SET revoked_at=COALESCE(revoked_at,'2026-11-09') WHERE id='active'").run();assert.equal((await db.prepare("SELECT revoked_at FROM dossivo_basic_grants WHERE id='active'").first()).revoked_at,'2026-11-08');check('revocation and no-op retry remain allowed');
 await mf.dispose();mf=new Miniflare(options);db=await mf.getD1Database('DB');await assert.rejects(db.prepare("UPDATE dossivo_basic_grants SET revoked_at=NULL WHERE id='active'").run(),/GRANT_REVOCATION_FINAL/);check('restart retains final revocation guard');
 console.log(JSON.stringify({checks,result:'PASS',runtime:'local Miniflare/workerd D1',production:false,customer_data:false}));
}finally{await mf.dispose();rmSync(temporary,{recursive:true,force:true});}
