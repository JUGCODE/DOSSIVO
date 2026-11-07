import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {PARTNER_DRAFT_VERSION,validPartnerVersion,validPartnerDocument,partnerContractResponse} from '../lib/partner-contracts.js';
import {approvedPartnerDocument,approvedPartnerVersions} from '../lib/partner-contract-access.js';
import {partnerAdminRequest} from '../lib/partner-contract-admin.js';
import {partnerApplicationRequest} from '../lib/partner-applications.js';
const oldVersion=PARTNER_DRAFT_VERSION,newVersion='partners-draft/0.2-2026-11-07',clock=()=> '2026-11-07T10:00:00.000Z';
const fixture=(version,language='en')=>({type:'promotion',version,language,status:'DRAFT_NOT_EFFECTIVE',title:'Synthetic version',summary:'SYNTHETIC_ONLY_'+version,clauses:[['Test','Not a real agreement']]});
function setup(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());for(const f of ['0019_icy_wallflower.sql','0020_white_night_nurse.sql','0021_keen_steve_rogers.sql','0022_worthless_firestar.sql'])sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));sql.prepare('INSERT INTO dossivo_partner_applications VALUES(?,?,?,?,?,?,?,?)').run('recipient','promotion',1,'approved','{}','','2026-11-06','2026-11-06');
 const db={prepare(q){const make=args=>({bind:(...v)=>make(v),first:async()=>sql.prepare(q).get(...args)??null,all:async()=>({results:sql.prepare(q).all(...args)}),run:()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}})});return make([]);},async batch(statements){sql.exec('BEGIN');try{const out=statements.map(s=>s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};return {db,sql};}
const req=body=>new Request('https://test/api',{method:'POST',headers:{origin:'https://test','content-type':'application/json'},body:JSON.stringify(body)});
const act=(db,action,version,extra={})=>partnerAdminRequest(db,'admin','["admin"]',req({action,type:'promotion',version,operationId:crypto.randomUUID(),document:fixture(version),reviewed:true,recipientId:'recipient',qualified:true,expiresAt:'2099-01-01',...extra}),clock);
const get=(db,version,language='en',actor='recipient')=>approvedPartnerDocument(db,actor,'promotion',language,clock,version);
test('contract version identifiers are bounded and document content must match the requested exact version',()=>{
 for(const v of [oldVersion,newVersion,'partners-draft/1.2.3-2026-12-01'])assert.equal(validPartnerVersion(v),true);
 for(const v of ['',null,{},'old','latest','partners-draft/../../x',newVersion+'\r\nX: test',newVersion+'?secret=1','x'.repeat(1000)])assert.equal(validPartnerVersion(v),false);
 assert.equal(validPartnerDocument(fixture(newVersion),'promotion','en',newVersion),true);
 assert.equal(validPartnerDocument(fixture(oldVersion),'promotion','en',newVersion),false);
 assert.equal(validPartnerDocument(fixture(newVersion),'promotion','en'),false);
});
test('new versions are immutable and neither overwrite nor inherit old grants',async t=>{
 const {db,sql}=setup(t);assert.equal((await act(db,'upload',oldVersion)).status,200);await act(db,'grant',oldVersion);
 assert.equal((await act(db,'upload',newVersion)).status,200);assert.equal((await act(db,'upload',newVersion,{document:{...fixture(newVersion),summary:'changed'}})).status,409);
 assert.equal((await get(db,oldVersion)).document.version,oldVersion);assert.equal(await get(db,newVersion),null);
 assert.equal(sql.prepare('SELECT count(*) n FROM dossivo_partner_contract_documents').get().n,2);
 assert.deepEqual((await approvedPartnerVersions(db,'recipient','promotion','en',clock)).map(r=>r.version),[oldVersion]);
});
test('approval and revocation are version-specific; withdrawal revokes all versions',async t=>{
 const {db}=setup(t);for(const v of [oldVersion,newVersion]){await act(db,'upload',v);await act(db,'grant',v);}
 assert.equal((await act(db,'revoke',oldVersion)).status,200);assert.equal(await get(db,oldVersion),null);assert.equal((await get(db,newVersion)).document.version,newVersion);
 await act(db,'grant',oldVersion);
 assert.equal((await partnerApplicationRequest(db,'recipient','["admin"]',req({action:'withdraw',type:'promotion',revision:1,operationId:crypto.randomUUID()}),{clock})).status,200);
 for(const v of [oldVersion,newVersion])assert.equal(await get(db,v),null);
 assert.deepEqual(await approvedPartnerVersions(db,'recipient','promotion','en',clock),[]);
});
test('version listings disclose only active own grants with the requested released language',async t=>{
 const {db,sql}=setup(t);for(const v of [oldVersion,newVersion]){await act(db,'upload',v);await act(db,'grant',v);}
 assert.deepEqual(await approvedPartnerVersions(db,'other','promotion','en',clock),[]);assert.deepEqual(await approvedPartnerVersions(db,null,'promotion','en',clock),[]);
 assert.deepEqual(await approvedPartnerVersions(db,'recipient','delivery','en',clock),[]);assert.deepEqual(await approvedPartnerVersions(db,'recipient','promotion','zh',clock),[]);
 sql.prepare('UPDATE dossivo_partner_contract_access SET expires_at=? WHERE contract_version=?').run('2026-01-01',oldVersion);
 assert.deepEqual((await approvedPartnerVersions(db,'recipient','promotion','en',clock)).map(r=>r.version),[newVersion]);
 sql.prepare("UPDATE dossivo_partner_contract_access SET approved_by='' WHERE contract_version=?").run(newVersion);
 assert.deepEqual(await approvedPartnerVersions(db,'recipient','promotion','en',clock),[]);
});
test('downloads pin content and attachment names to the exact granted version; legacy URLs retain the original default',async t=>{
 const {db}=setup(t);for(const v of [oldVersion,newVersion]){await act(db,'upload',v);await act(db,'grant',v);}
 const old=await get(db,oldVersion),fresh=await get(db,newVersion),base='https://test/api?type=promotion&lang=en';
 assert.equal(partnerContractResponse('recipient',base,old.approval,old.document).status,200);
 assert.equal(partnerContractResponse('recipient',base,fresh.approval,fresh.document).status,403);
 const url=base+'&version='+encodeURIComponent(newVersion);
 assert.equal(partnerContractResponse('recipient',url,old.approval,old.document).status,403);
 assert.equal(partnerContractResponse('recipient',url,fresh.approval,old.document).status,404);
 const r=partnerContractResponse('recipient',url,fresh.approval,fresh.document);assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/0\.2-2026-11-07/);assert.match(await r.text(),/0\.2-2026-11-07/);
});
test('upload rejects mismatched envelope versions and missing-language access never falls back',async t=>{
 const {db}=setup(t);assert.equal((await act(db,'upload',newVersion,{document:fixture(oldVersion)})).status,400);
 assert.equal((await act(db,'grant',newVersion)).status,409);await act(db,'upload',newVersion);await act(db,'grant',newVersion);
 assert.equal((await get(db,newVersion,'zh')).document,null);
 const r=await partnerAdminRequest(db,'admin','["admin"]',new Request('https://test/api'),clock);const data=await r.json();assert.equal(data.documents[0].contract_version,newVersion);assert.equal(data.audit[0].contract_version,newVersion);
});
