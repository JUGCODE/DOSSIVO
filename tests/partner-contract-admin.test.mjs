import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {partnerAdminRequest,isPartnerAdmin} from '../lib/partner-contract-admin.js';
import {PARTNER_DRAFT_VERSION} from '../lib/partner-contracts.js';
import {approvedPartnerDocument} from '../lib/partner-contract-access.js';
const now=()=> '2026-11-07T10:00:00.000Z';
const document={type:'promotion',version:PARTNER_DRAFT_VERSION,language:'en',status:'DRAFT_NOT_EFFECTIVE',title:'Synthetic review',summary:'SYNTHETIC_SECRET',clauses:[['Test','Synthetic test only']]};
function setup(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());for(const f of ['0019_icy_wallflower.sql','0020_white_night_nurse.sql','0021_keen_steve_rogers.sql','0022_worthless_firestar.sql'])sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 sql.prepare("INSERT INTO dossivo_partner_applications VALUES(?,?,?,?,?,?,?,?)").run('recipient','promotion',1,'approved','{}','','2026-11-06','2026-11-06');const db={prepare(query){const make=args=>({bind:(...a)=>make(a),first:async()=>sql.prepare(query).get(...args)??null,all:async()=>({results:sql.prepare(query).all(...args)}),run:()=>sql.prepare(query).run(...args)});return make([]);},async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>s.run());sql.exec('COMMIT');return results.map(r=>({meta:{changes:Number(r.changes)}}));}catch(e){sql.exec('ROLLBACK');throw e;}}};return {db,sql};}
const input=(action,patch={})=>({action,type:'promotion',version:PARTNER_DRAFT_VERSION,operationId:crypto.randomUUID(),document,reviewed:true,recipientId:'recipient',qualified:true,expiresAt:'2027-01-01',...patch});
const request=(body,headers={})=>new Request('https://test/api/partner-contracts/admin',{method:'POST',headers:{origin:'https://test','content-type':'application/json',...headers},body:JSON.stringify(body)});
const call=(db,body)=>partnerAdminRequest(db,'admin','["admin"]',request(body),now);
test('contract admin configuration defaults closed and requires exact authenticated identity',async()=>{
 for(const config of [undefined,'','{}','["admin",null]','[" admin"]','invalid'])assert.equal(isPartnerAdmin('admin',config),false);
 assert.equal(isPartnerAdmin('admin','["admin"]'),true);assert.equal(isPartnerAdmin('ordinary','["admin"]'),false);
 const db={prepare(){throw Error('must not read');}};
 for(const actor of [null,'ordinary'])assert.equal((await partnerAdminRequest(db,actor,'["admin"]',request(input('upload',{role:'admin'})),now)).status,actor?403:401);
});
test('contract writes reject cross-origin, missing origin and non-JSON before storage',async()=>{
 for(const headers of [{origin:'https://evil'},{origin:''},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'}])assert.ok([403,415].includes((await partnerAdminRequest({},'admin','["admin"]',request(input('upload'),headers),now)).status));
});
test('upload validates review, document scope and bounded body; immutable versions never overwrite',async t=>{
 const {db,sql}=setup(t);
 for(const patch of [{reviewed:false},{document:{...document,language:'de'}},{document:{...document,clauses:[]}},{document:{...document,title:'x'.repeat(270000)}}])assert.equal((await call(db,input('upload',patch))).status,400);
 assert.equal((await call(db,input('upload'))).status,200);
 assert.equal((await call(db,input('upload',{document:{...document,summary:'replacement'}}))).status,409);
 assert.match(sql.prepare('SELECT body_json FROM dossivo_partner_contract_documents').get().body_json,/SYNTHETIC_SECRET/);
 assert.equal(sql.prepare('SELECT count(*) n FROM dossivo_partner_contract_audit').get().n,1);
});
test('approval requires an uploaded document, qualified recipient and future expiry',async t=>{
 const {db}=setup(t);assert.equal((await call(db,input('grant'))).status,409);await call(db,input('upload'));
 for(const patch of [{qualified:false},{recipientId:''},{recipientId:' recipient'},{expiresAt:'bad'},{expiresAt:'2026-01-01'}])assert.equal((await call(db,input('grant',patch))).status,400);
});
test('grant/revoke enforcement and duplicate-operation rollback prevent replay from restoring access',async t=>{
 const {db,sql}=setup(t);await call(db,input('upload'));const grant=input('grant');assert.equal((await call(db,grant)).status,200);
 assert.equal((await approvedPartnerDocument(db,'recipient','promotion','en',now)).document.summary,'SYNTHETIC_SECRET');
 assert.equal(await approvedPartnerDocument(db,'other','promotion','en',now),null);
 await call(db,input('revoke'));assert.equal(await approvedPartnerDocument(db,'recipient','promotion','en',now),null);
 assert.equal((await call(db,grant)).status,409);assert.equal(await approvedPartnerDocument(db,'recipient','promotion','en',now),null);
 assert.doesNotMatch(JSON.stringify(sql.prepare('SELECT * FROM dossivo_partner_contract_audit').all()),/SYNTHETIC_SECRET/);
});
test('admin listing returns metadata only and private noncacheable response',async t=>{
 const {db}=setup(t);await call(db,input('upload'));const r=await partnerAdminRequest(db,'admin','["admin"]',new Request('https://test/api/partner-contracts/admin'),now);
 assert.equal(r.headers.get('cache-control'),'private, no-store');const body=await r.text();assert.doesNotMatch(body,/SYNTHETIC_SECRET|body_json/);assert.match(body,/promotion/);
});
