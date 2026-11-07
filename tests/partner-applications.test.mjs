import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {partnerApplicationRequest,validatePartnerProfile} from '../lib/partner-applications.js';
import {partnerAdminRequest} from '../lib/partner-contract-admin.js';
import {approvedPartnerDocument} from '../lib/partner-contract-access.js';
import {PARTNER_DRAFT_VERSION} from '../lib/partner-contracts.js';
const config='["reviewer"]',clock=()=> '2026-11-07T12:00:00.000Z';
const profile={organization:'Synthetic applicant',contact:'Synthetic contact',email:'test@example.invalid',country:'Test region',services:'SYNTHETIC_PRIVATE_PROFILE',qualification:'Synthetic experience'};
const doc={type:'promotion',version:PARTNER_DRAFT_VERSION,language:'en',status:'DRAFT_NOT_EFFECTIVE',title:'Synthetic draft',summary:'SYNTHETIC_PRIVATE_CONTRACT',clauses:[['Test','Synthetic only']]};
function setup(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());for(const f of ['0019_icy_wallflower.sql','0020_white_night_nurse.sql','0021_keen_steve_rogers.sql','0022_worthless_firestar.sql'])sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));const db={prepare(q){const make=args=>({bind:(...v)=>make(v),first:async()=>sql.prepare(q).get(...args)??null,all:async()=>({results:sql.prepare(q).all(...args)}),run:()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}})});return make([]);},async batch(statements){sql.exec('BEGIN');try{const out=statements.map(s=>s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};return {db,sql};}
const input=(action,patch={})=>({action,type:'promotion',revision:0,operationId:crypto.randomUUID(),profile,consent:true,...patch});
const request=(body,headers={})=>new Request('https://test/api/partner-applications',{method:'POST',headers:{origin:'https://test','content-type':'application/json',...headers},body:JSON.stringify(body)});
const call=(db,body,actor='applicant',admin=false)=>partnerApplicationRequest(db,actor,config,request(body),{admin,clock});
const review=(db,decision,revision=1)=>call(db,input('review',{revision,recipientId:'applicant',decision,verified:true,reason:decision==='approved'?'':'scope'}),'reviewer',true);
const contract=(db,action,patch={})=>partnerAdminRequest(db,'reviewer',config,request({action,type:'promotion',version:PARTNER_DRAFT_VERSION,operationId:crypto.randomUUID(),document:doc,reviewed:true,recipientId:'applicant',qualified:true,expiresAt:'2027-01-01',...patch}),clock);
test('application profile accepts bounded business fields and drops injected status, owner and role',()=>{
 assert.deepEqual(validatePartnerProfile({...profile,status:'approved',actor_id:'other',role:'admin'},'promotion'),profile);
 for(const p of [null,[],{...profile,email:'bad'},{...profile,services:''},{...profile,organization:'x'.repeat(181)},{...profile,contact:'\u0000'}])assert.equal(validatePartnerProfile(p,'promotion'),null);
 assert.equal(validatePartnerProfile({...profile,qualification:''},'professional'),null);
});
test('application endpoints require identity, admin privilege, same origin, JSON and bounded input',async t=>{
 const {db}=setup(t);
 assert.equal((await call(db,input('submit'),null)).status,401);assert.equal((await call(db,input('review'),'applicant',true)).status,403);
 for(const headers of [{origin:'https://evil'},{origin:''},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'}])assert.ok([403,415].includes((await partnerApplicationRequest(db,'applicant',config,request(input('submit'),headers),{clock})).status));
 assert.equal((await call(db,input('submit',{profile:{...profile,services:'x'.repeat(17000)}}))).status,400);
 assert.equal((await call(db,input('submit',{consent:false}))).status,400);
});
test('unconfigured reviewers close intake without storing application data',async t=>{
 const {db,sql}=setup(t);const r=await partnerApplicationRequest(db,'applicant',undefined,request(input('submit')),{clock});assert.equal(r.status,503);assert.equal(sql.prepare('SELECT count(*) n FROM dossivo_partner_applications').get().n,0);
 const get=await partnerApplicationRequest(db,'applicant',undefined,new Request('https://test/api'),{clock});assert.equal((await get.json()).reviewAvailable,false);
});
test('submission derives owner from session and owner listings cannot disclose another applicant',async t=>{
 const {db}=setup(t);const r=await call(db,input('submit',{recipientId:'victim',status:'approved'}));assert.equal(r.status,200);
 const list=async actor=>(await partnerApplicationRequest(db,actor,config,new Request('https://test/api?recipientId=applicant'),{clock})).json();
 assert.equal((await list('victim')).applications.length,0);const own=await list('applicant');assert.equal(own.applications[0].status,'pending');assert.equal(own.applications[0].actor_id,'applicant');
 assert.equal(await approvedPartnerDocument(db,'applicant','promotion','en',clock),null);
});
test('review needs manual verification, forbids self review and does not automatically release contracts',async t=>{
 const {db}=setup(t);await call(db,input('submit'));
 assert.equal((await call(db,input('review',{revision:1,recipientId:'applicant',decision:'approved',verified:false}),'reviewer',true)).status,400);
 await call(db,input('submit'),'reviewer');assert.equal((await call(db,input('review',{revision:1,recipientId:'reviewer',decision:'approved',verified:true}),'reviewer',true)).status,403);
 assert.equal((await review(db,'approved')).status,200);assert.equal(await approvedPartnerDocument(db,'applicant','promotion','en',clock),null);
});
test('needs-changes/rejected applications can resubmit and stale or replayed reviews cannot approve new revisions',async t=>{
 const {db}=setup(t);await call(db,input('submit'));assert.equal((await review(db,'needs_changes')).status,200);
 assert.equal((await call(db,input('submit',{revision:2}))).status,200);assert.equal((await review(db,'approved',1)).status,409);
 assert.equal((await review(db,'rejected',3)).status,200);assert.equal((await call(db,input('submit',{revision:4}))).status,200);
 assert.equal((await call(db,input('submit',{revision:5}))).status,409);
});
test('withdrawal stops approved contract access; resubmission and reapproval never revive old grants',async t=>{
 const {db,sql}=setup(t);await contract(db,'upload');assert.equal((await contract(db,'grant')).status,409);
 await call(db,input('submit'));await review(db,'approved');assert.equal((await contract(db,'grant')).status,200);
 assert.equal((await approvedPartnerDocument(db,'applicant','promotion','en',clock)).document.summary,'SYNTHETIC_PRIVATE_CONTRACT');
 await call(db,input('withdraw',{revision:2}));assert.equal(await approvedPartnerDocument(db,'applicant','promotion','en',clock),null);
 await call(db,input('submit',{revision:3}));await review(db,'approved',4);assert.equal(await approvedPartnerDocument(db,'applicant','promotion','en',clock),null);
 assert.equal((await contract(db,'grant')).status,200);await review(db,'needs_changes',5);assert.equal(await approvedPartnerDocument(db,'applicant','promotion','en',clock),null);
 assert.doesNotMatch(JSON.stringify(sql.prepare('SELECT * FROM dossivo_partner_application_events').all()),/SYNTHETIC_PRIVATE_PROFILE|test@example/);
});
test('concurrent withdrawal wins over a stale eligibility approval and leaves no false success event',async t=>{
 const {db,sql}=setup(t);await call(db,input('submit'));const original=db.batch;let injected=false;
 db.batch=async statements=>{if(!injected){injected=true;await call(db,input('withdraw',{revision:1}));}return original(statements);};
 assert.equal((await review(db,'approved',1)).status,409);assert.equal(sql.prepare('SELECT status FROM dossivo_partner_applications').get().status,'withdrawn');assert.equal(sql.prepare('SELECT count(*) n FROM dossivo_partner_application_events').get().n,2);
});
test('withdrawal between grant preflight and commit cannot restore contract access',async t=>{
 const {db,sql}=setup(t);await call(db,input('submit'));await review(db,'approved');await contract(db,'upload');const original=db.batch;let injected=false;
 db.batch=async statements=>{if(!injected){injected=true;await call(db,input('withdraw',{revision:2}));}return original(statements);};
 assert.equal((await contract(db,'grant')).status,409);assert.equal(await approvedPartnerDocument(db,'applicant','promotion','en',clock),null);assert.equal(sql.prepare("SELECT count(*) n FROM dossivo_partner_contract_audit WHERE action='grant'").get().n,0);
});
test('admin queue is bounded, paginated and status-filtered; ordinary users cannot read it',async t=>{
 const {db}=setup(t);for(let n=0;n<26;n++)await call(db,input('submit'),'applicant'+n);
 const query=offset=>partnerApplicationRequest(db,'reviewer',config,new Request('https://test/api?status=pending&offset='+offset),{admin:true,clock});
 const r=await query(0);assert.equal(r.headers.get('cache-control'),'private, no-store');const page=await r.json();assert.equal(page.applications.length,25);assert.equal(page.hasMore,true);const second=await(await query(25)).json();assert.equal(second.applications.length,1);assert.equal(second.hasMore,false);assert.equal((await query(-1)).status,400);
});
