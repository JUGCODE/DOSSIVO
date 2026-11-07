import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {PARTNER_TYPES,PARTNER_CATALOG} from '../lib/partner-catalog.js';
import {partnerContractResponse,partnerContractHtml,partnerContractMarkdown,PARTNER_DRAFT_VERSION,validPartnerDocument} from '../lib/partner-contracts.js';
import {approvedPartnerContract,approvedPartnerDocument} from '../lib/partner-contract-access.js';
// Neutral fixtures only. Real contracts and commercial proposals must never enter test source.
const fixture=type=>({type,version:PARTNER_DRAFT_VERSION,status:'DRAFT_NOT_EFFECTIVE',language:'zh',title:'合成测试合同',summary:'SYNTHETIC_CONFIDENTIAL',clauses:[['测试条款','待确认，仅用于权限测试。']]});
const approval=type=>({recipient_id:'recipient',contract_type:type,contract_version:PARTNER_DRAFT_VERSION,approved_by:'operator',approved_at:'2026-11-06',expires_at:'2099-01-01T00:00:00.000Z',revoked_at:null});
function setup(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());for(const file of ['0019_icy_wallflower.sql','0020_white_night_nurse.sql','0022_worthless_firestar.sql'])sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));sql.prepare("INSERT INTO dossivo_partner_applications VALUES(?,?,?,?,?,?,?,?)").run('recipient','promotion',1,'approved','{}','','2026-11-06','2026-11-06');const db={prepare(query){return {bind(...args){return {first:async()=>sql.prepare(query).get(...args)??null};}};}};return {sql,db};}
const clock=()=> '2026-11-06T12:00:00.000Z';
test('partner document schema accepts only matching type, version, language and draft shape',()=>{
 for(const type of PARTNER_TYPES){assert.ok(PARTNER_CATALOG[type].en.title);assert.ok(validPartnerDocument(fixture(type),type,'zh'));assert.match(partnerContractMarkdown(fixture(type)),/草案/);}
 for(const patch of [{version:'old'},{language:'en'},{status:'SIGNED'},{clauses:[['bad']]},{title:{}}])assert.equal(validPartnerDocument({...fixture('promotion'),...patch},'promotion','zh'),false);
});
test('partner contracts: anonymous denied and normal login never grants access',async()=>{
 const anon=partnerContractResponse(null,'https://test/api?type=promotion',null,fixture('promotion'));assert.equal(anon.status,401);
 for(const type of ['promotion','missing','__proto__']){const r=partnerContractResponse('recipient','https://test/api?type='+type,null,fixture('promotion'));assert.equal(r.status,403);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.doesNotMatch(await r.text(),/SYNTHETIC_CONFIDENTIAL/);}
});
test('partner contracts: only approved, released versions produce no-store attachments',async()=>{
 for(const type of PARTNER_TYPES)for(const format of ['html','md']){const r=partnerContractResponse('recipient','https://test/api?type='+type+'&format='+format,approval(type),fixture(type));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.match(r.headers.get('content-security-policy'),/sandbox/);assert.match(await r.text(),/SYNTHETIC_CONFIDENTIAL/);}
 const base='https://test/api?type=promotion';assert.equal(partnerContractResponse('recipient',base,approval('promotion'),null).status,404);assert.equal(partnerContractResponse('recipient',base+'&lang=en',approval('promotion'),fixture('promotion')).status,404);
});
test('partner contract HTML escapes document data without scripts or external resources',()=>{
 const html=partnerContractHtml({...fixture('promotion'),title:'<img src=x onerror=alert(1)>',clauses:[['<script>x</script>','a & b']]});assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script|<img|<iframe/);assert.match(html,/a &amp; b/);const en=partnerContractHtml({...fixture('promotion'),language:'en',title:'Test agreement',clauses:[]});assert.doesNotMatch(en,/[\u3400-\u9fff]/);
});
test('partner contracts: foreign, mismatched, revoked, invalid and expired approval responses fail closed',async()=>{
 const base=approval('promotion');for(const a of [null,{...base,recipient_id:'other'},{...base,contract_type:'delivery'},{...base,contract_version:'old'},{...base,approved_by:''},{...base,expires_at:'invalid'},{...base,expires_at:'2020-01-01'},{...base,revoked_at:'2026-11-06'}]){const r=partnerContractResponse('recipient','https://test/api?type=promotion',a,fixture('promotion'));assert.equal(r.status,403);assert.doesNotMatch(await r.text(),/SYNTHETIC_CONFIDENTIAL/);}
});
test('partner database approvals are scoped and reject malformed or future approvals',async t=>{
 const {sql,db}=setup(t);assert.equal(await approvedPartnerContract(db,'recipient','promotion',clock),null);sql.prepare('INSERT INTO dossivo_partner_contract_access VALUES(?,?,?,?,?,?,?)').run(...Object.values(approval('promotion')));assert.ok(await approvedPartnerContract(db,'recipient','promotion',clock));assert.equal(await approvedPartnerContract(db,'other','promotion',clock),null);assert.equal(await approvedPartnerContract(db,'recipient','delivery',clock),null);
 for(const [column,value]of [['expires_at','invalid'],['approved_by',' '],['approved_at','invalid'],['approved_at','2099-01-01']]){sql.prepare('UPDATE dossivo_partner_contract_access SET '+column+'=?').run(value);assert.equal(await approvedPartnerContract(db,'recipient','promotion',clock),null);sql.prepare("UPDATE dossivo_partner_contract_access SET expires_at='2099-01-01T00:00:00.000Z',approved_by='operator',approved_at='2026-11-06'").run();}
 sql.prepare("UPDATE dossivo_partner_contract_access SET revoked_at='2026-11-06'").run();assert.equal(await approvedPartnerContract(db,'recipient','promotion',clock),null);
});
test('confidential documents live only in runtime data and require approval before retrieval',async t=>{
 const {sql,db}=setup(t);sql.prepare('INSERT INTO dossivo_partner_contract_documents VALUES(?,?,?,?)').run('promotion',PARTNER_DRAFT_VERSION,'zh',JSON.stringify(fixture('promotion')));
 assert.equal(await approvedPartnerDocument(db,'recipient','promotion','zh',clock),null);
 sql.prepare('INSERT INTO dossivo_partner_contract_access VALUES(?,?,?,?,?,?,?)').run(...Object.values(approval('promotion')));
 assert.equal((await approvedPartnerDocument(db,'recipient','promotion','zh',clock)).document.summary,'SYNTHETIC_CONFIDENTIAL');assert.equal((await approvedPartnerDocument(db,'recipient','promotion','en',clock)).document,null);
 sql.prepare("UPDATE dossivo_partner_contract_documents SET body_json='invalid'").run();assert.equal((await approvedPartnerDocument(db,'recipient','promotion','zh',clock)).document,null);
 sql.prepare("UPDATE dossivo_partner_contract_access SET revoked_at='2026-11-06'").run();assert.equal(await approvedPartnerDocument(db,'recipient','promotion','zh',clock),null);
});
