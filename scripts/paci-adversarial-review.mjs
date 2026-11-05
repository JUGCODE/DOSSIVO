/**
 * Known-defect reproduction for the supplied paci-core 0.1 baseline.
 * Exit 0 means the UNSAFE observations were reproduced, not that security passed.
 * Run manually; never add this script to the normal application test gate.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node --experimental-strip-types scripts/paci-adversarial-review.mjs [core-directory]
Core directory: positional argument, then PACI_CORE_PATH, then ../alignment_review/paci-core beside this repository.
Exit 0 reproduces known UNSAFE behavior. Exit 1 means the baseline changed or a probe failed; review the evidence.
This is an opt-in audit probe, not a security acceptance test.`);
  process.exit(0);
}
if (args.length > 1) throw new Error('Pass at most one core-directory argument. Use --help for usage.');
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 6)) {
  throw new Error('Node >= 22.6 is required. For Node 22, run with --experimental-strip-types.');
}
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const coreDirectory = resolve(args[0] || process.env.PACI_CORE_PATH || resolve(scriptDirectory, '../../alignment_review/paci-core'));
const engineFile = join(coreDirectory, 'src/engine.ts');
if (!existsSync(engineFile)) {
  throw new Error(`paci-core src/engine.ts not found in ${coreDirectory}; pass a core-directory or set PACI_CORE_PATH.`);
}
const { PaciEngine } = await import(pathToFileURL(engineFile).href);
console.log(JSON.stringify({ mode: 'KNOWN_UNSAFE_BASELINE', coreDirectory, node: process.versions.node,
  meaning: 'Assertions below intentionally demonstrate current defects; success is not security acceptance.' }));
let reproduced = 0;
let changedOrFailed = 0;
let n = 0;
const key = () => `review-${++n}`;
const a = { actor_id: 'alice', tenant_id: 'tenant-a' };
const b = { actor_id: 'bob', tenant_id: 'tenant-b' };
const buyer = { actor_id: 'buyer', tenant_id: 'tenant-b' };
const sys = { actor_id: 'svc', executor: 'SYSTEM', visible_material: 'FULL_CONTENT' };
const material = (over = {}) => ({kind:'MATERIAL',source:'SELF_REPORTED',coverage:'COMPLETE_WITHIN_SCOPE',content:{secret:'original'},summary:{label:'shareable'},...over});
function setup() {
  const e = new PaciEngine({now:()=>new Date('2026-11-01T08:00:00Z')});
  e.registerTenant('tenant-a','cn',['alice']);
  e.registerTenant('tenant-b','eu',['bob','buyer']);
  return e;
}
function makeAudit(e, ctx, name, over={}) {
  return e.registerRecord(ctx,material({source:'THIRD_PARTY_ATTESTED',attestor:{kind:'AUDITOR',name},...over}),key());
}
function makeClaim(e,ctx,ids,over={}) {
  return e.registerRecord(ctx,{kind:'CLAIM',source:'SELF_REPORTED',coverage:'COMPLETE_WITHIN_SCOPE',content:{predicate:'wages_paid',evidence_ids:ids},...over},key());
}
function observed(name, expectedSafeBehavior, fn) {
  try {
    const output = fn();
    reproduced++;
    console.log(JSON.stringify({ status: 'KNOWN_DEFECT_REPRODUCED', probe: name, expectedSafeBehavior, observed: output }));
  } catch (error) {
    changedOrFailed++;
    console.error(JSON.stringify({ status: 'BASELINE_CHANGED_OR_PROBE_FAILED', probe: name, expectedSafeBehavior,
      error: error instanceof Error ? error.message : String(error),
      note: 'This may indicate a fix, an API change, or an execution error. Review it; do not count it as automatic security acceptance.' }));
  }
}

observed('returned view mutates stored content without a new version', 'Reject or isolate mutation of returned data; stored content and its committed version must remain unchanged.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  r.content.secret='silently changed';
  const got=e.getRecord(a,r.record_id);
  assert.equal(got.content.secret,'silently changed');
  assert.equal(e.history(a,r.record_id).length,1);
  return {content:got.content,version:got.version,logSize:e.log('cn').size};
});

observed('returned grant permits silent change of recipient', 'Reject or isolate mutation of the returned grant; an unapproved recipient must remain denied.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  const g=e.grantAccess(a,{grantee:'buyer',record_ids:[r.record_id],scope:'SUMMARY',purpose:'buyer review',expires_at:'2027-01-01'});
  g.grantee='intruder';g.scope='CONTENT';
  const leaked=e.getRecord({actor_id:'intruder'},r.record_id);
  assert.equal(leaked.content.secret,'original');
  return {disclosed:leaked.disclosed,content:leaked.content};
});

observed('erased plaintext survives in the idempotency result cache', 'A retry must not return erased plaintext or the previous non-erased projection.', ()=>{
  const e=setup(),input=material(),r=e.registerRecord(a,input,'stable-key');
  e.eraseContent(a,r.record_id,'synthetic deletion request');
  assert.equal(e.getRecord(a,r.record_id).content,undefined);
  const retry=e.registerRecord(a,input,'stable-key');
  assert.equal(retry.content.secret,'original');
  assert.equal(retry.erased,false);
  return {currentErased:true,retryErased:retry.erased,retryContent:retry.content};
});

observed('idempotent retry skips current tenant membership authorization', 'Reject the retry when the actor no longer has access; re-authorize before serving a cached result.', ()=>{
  const e=setup(),input=material(),r=e.registerRecord(a,input,'stable-key');
  e.registerTenant('tenant-a','cn',[]);
  assert.throws(()=>e.getRecord(a,r.record_id),/NOT_FOUND/);
  const retry=e.registerRecord(a,input,'stable-key');
  assert.equal(retry.content.secret,'original');
  return {getRecordDenied:true,retryContent:retry.content};
});

observed('Link2 page description does not enforce pages or version', 'Reject disclosure outside explicitly authorized pages and versions; purpose text is not an authorization rule.', ()=>{
  const e=setup(),r=e.registerRecord(a,material({content:{pages:['approved page 1','confidential page 2']}}),key());
  e.grantAccess(a,{grantee:'buyer',record_ids:[r.record_id],scope:'CONTENT',purpose:'Link2 version 1 page 1 only',expires_at:'2027-01-01'});
  const first=e.getRecord(buyer,r.record_id);
  assert.equal(first.content.pages[1],'confidential page 2');
  e.amendRecord(a,r.record_id,material({content:{pages:['new unapproved page']}}),'new version',key());
  const second=e.getRecord(buyer,r.record_id);
  assert.equal(second.content.pages[0],'new unapproved page');
  return {version1Content:first.content,version2Content:second.content};
});

observed('invalid expiration date acts as an unbounded grant', 'Reject an invalid expiration date at grant creation.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  e.grantAccess(a,{grantee:'buyer',record_ids:[r.record_id],scope:'CONTENT',purpose:'short review',expires_at:'not-a-date'});
  const got=e.getRecord(buyer,r.record_id);
  assert.equal(got.disclosed,'CONTENT');
  return {disclosed:got.disclosed};
});

observed('cross tenant private evidence is traversed and disclosed by ENI', 'Reject or exclude inaccessible evidence; do not disclose its private controller metadata.', ()=>{
  const e=setup(),privateAudit=makeAudit(e,b,'PRIVATE-AUDITOR-NAME');
  assert.throws(()=>e.getRecord(a,privateAudit.record_id),/NOT_FOUND/);
  const claim=makeClaim(e,a,[privateAudit.record_id]);
  const ev=e.evaluate(a,claim.record_id);
  assert.equal(ev.assessment,'SUPPORTED');
  assert.equal(ev.roots[0].controller,'attestor:PRIVATE-AUDITOR-NAME');
  return {privateRecordDenied:true,assessment:ev.assessment,roots:ev.roots};
});

observed('private relation in another tenant silently changes victim assessment', "Do not let an unreviewed inaccessible relation silently determine another tenant's claim assessment.", ()=>{
  const e=setup(),audit=makeAudit(e,a,'Audit A'),claim=makeClaim(e,a,[audit.record_id]);
  assert.equal(e.evaluate(a,claim.record_id).assessment,'SUPPORTED');
  e.registerRecord(b,material({content:{allegation:'fabricated'},relations:[{type:'CONTRADICTS',target:claim.record_id}]}),key());
  const ev=e.evaluate(a,claim.record_id);
  assert.equal(ev.assessment,'CONTRADICTED');
  return {assessment:ev.assessment,contradictions:ev.contradictions};
});

observed('runCheck permits nonreader to label self as an independent reviewer', 'Reject unauthorized checks and reviewer impersonation; derive independence from authenticated relationships.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  e.registerReviewer({reviewer_id:'real-reviewer',independent_of_operator:true,name:'reviewer'});
  assert.throws(()=>e.getRecord({actor_id:'intruder'},r.record_id),/NOT_FOUND/);
  const chk=e.runCheck({actor_id:'intruder',executor:'THIRD_PARTY',visible_material:'FULL_CONTENT',reviewer_id:'real-reviewer'},r.record_id,1,'INTEGRITY');
  assert.equal(chk.result,'PASSED');assert.equal(chk.independent,true);
  return {readerDenied:true,check:chk};
});

observed('caller supplied auditor names manufacture corroboration', 'Do not authenticate independent sources or pass corroboration solely from caller-supplied names.', ()=>{
  const e=setup(),one=makeAudit(e,a,'Alias A'),two=makeAudit(e,a,'Alias B');
  const claim=makeClaim(e,a,[one.record_id,two.record_id]),ev=e.evaluate(a,claim.record_id);
  const chk=e.runCheck(sys,claim.record_id,1,'EVIDENCE_CORROBORATION');
  assert.equal(ev.independent_source_count,2);assert.equal(chk.result,'PASSED');
  return {assessment:ev.assessment,independent_source_count:ev.independent_source_count,check:chk.result};
});

observed('corroboration for version 1 actually evaluates version 2', 'Evaluate the requested claim version and its exact evidence set; version 1 with no evidence must not pass.', ()=>{
  const e=setup(),one=makeAudit(e,a,'A'),two=makeAudit(e,a,'B'),claim=makeClaim(e,a,[]);
  e.amendRecord(a,claim.record_id,{kind:'CLAIM',source:'SELF_REPORTED',coverage:'COMPLETE_WITHIN_SCOPE',content:{predicate:'new claim',evidence_ids:[one.record_id,two.record_id]}},'new evidence',key());
  const chk=e.runCheck(sys,claim.record_id,1,'EVIDENCE_CORROBORATION');
  assert.equal(chk.version,1);assert.equal(chk.result,'PASSED');
  assert.equal(e.getRecord(a,claim.record_id,1).content.evidence_ids.length,0);
  return {requestedVersion:1,version1Evidence:[],checkResult:chk.result};
});

observed('explicit evidence version is discarded by ENI', 'Resolve record_id@1 to version 1 without substituting the latest version.', ()=>{
  const e=setup(),original=e.registerRecord(a,material(),key());
  const claim=makeClaim(e,a,[`${original.record_id}@1`]);
  e.amendRecord(a,original.record_id,material({source:'THIRD_PARTY_ATTESTED',attestor:{kind:'AUDITOR',name:'New Auditor'}}),'new evidence',key());
  const ev=e.evaluate(a,claim.record_id);
  assert.equal(ev.assessment,'SUPPORTED');assert.equal(ev.roots[0].source,'THIRD_PARTY_ATTESTED');
  return {evidenceReference:`${original.record_id}@1`,resolvedSource:ev.roots[0].source,assessment:ev.assessment};
});

observed('a derivative revives an expired original', 'Propagate applicable root-evidence validity restrictions through derived evidence.', ()=>{
  const e=setup(),expired=makeAudit(e,a,'Old Auditor',{expires_at:'2025-01-01',expiry_basis:'issuer'});
  const copy=e.registerRecord(a,material({relations:[{type:'DERIVED_FROM',target:expired.record_id}]}),key());
  const direct=e.evaluate(a,makeClaim(e,a,[expired.record_id]).record_id);
  const derived=e.evaluate(a,makeClaim(e,a,[copy.record_id]).record_id);
  assert.equal(direct.assessment,'EXPIRED');assert.equal(derived.assessment,'SUPPORTED');
  return {direct:direct.assessment,derived:derived.assessment,excluded:derived.excluded};
});

observed('one day evidence supports a whole year because overlap is enough', 'Expose the uncovered period; a one-day overlap must not automatically support a full-year claim.', ()=>{
  const e=setup(),one=makeAudit(e,a,'A',{period:{from:'2026-01-01',to:'2026-01-01'}});
  const claim=makeClaim(e,a,[one.record_id],{period:{from:'2026-01-01',to:'2026-12-31'}});
  const ev=e.evaluate(a,claim.record_id);
  assert.equal(ev.assessment,'SUPPORTED');
  return {assessment:ev.assessment,excluded:ev.excluded};
});

observed('FAILED integrity check leaves INTEGRITY_VERIFIED projection', 'Surface the current failure or conflict and never let an old success hide it.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  assert.equal(e.runCheck(sys,r.record_id,1,'INTEGRITY').result,'PASSED');
  r.content.secret='silent tamper';
  assert.equal(e.runCheck(sys,r.record_id,1,'INTEGRITY').result,'FAILED');
  const view=e.getRecord(a,r.record_id);
  assert.ok(view.status.verification.includes('INTEGRITY_VERIFIED'));
  return {checkResults:view.checks.map(x=>x.result),verification:view.status.verification};
});

observed('generic register bypasses jurisdiction and AI action validation', 'Reject invalid ledger content consistently through every registration and amendment entry point.', ()=>{
  const e=setup();
  const j=e.registerRecord(a,{kind:'JURISDICTION',source:'SELF_REPORTED',content:{authority_kind:'BUYER_REQUIREMENT',classification:'PROHIBITED',is_legal_ruling:true}},key());
  const ai=e.registerRecord(a,{kind:'AI_ACTION',source:'SELF_REPORTED',coverage:'COMPLETE_WITHIN_SCOPE',content:{}},key());
  assert.equal(j.content.classification,'PROHIBITED');assert.equal(ai.ledger,'AI');
  return {jurisdiction:j.content,AIAction:ai.content};
});

observed('INSTRUMENTED event accepts invalid time and unverified outcome target', 'Reject invalid dates and unsupported confirmed outcomes; imported historical dates must not become trusted execution times.', ()=>{
  const e=setup(),cap=e.grantCapture(a,['EVENT']);
  const r=e.registerRecord(a,{kind:'EVENT',source:'INSTRUMENTED',coverage:'COMPLETE_WITHIN_SCOPE',capture_grant_id:cap.grant_id,occurred_at:'not-a-date',occurred_at_source:'SYSTEM_CLOCK',lifecycle:'OUTCOME_CONFIRMED',relations:[{type:'OUTCOME_OF',target:'nonexistent-action'}],content:{event:'BUYER_ACCEPTED'}},key());
  assert.equal(r.status.lifecycle,'OUTCOME_CONFIRMED');assert.equal(r.occurred_at,'not-a-date');
  const imported=makeAudit(e,a,'Historical Report',{occurred_at:'1999-01-01',occurred_at_source:'SYSTEM_CLOCK'});
  assert.equal(imported.occurred_at_source,'SYSTEM_CLOCK');
  return {instrumented:r.status,occurred_at:r.occurred_at,importedHistoricalTimeSource:imported.occurred_at_source};
});

observed('external challenger cannot fetch own challenge or response', 'Allow an authorized challenge participant to read their challenge and response without granting underlying original access.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  e.grantAccess(a,{grantee:'buyer',record_ids:[r.record_id],scope:'SUMMARY',purpose:'review',expires_at:'2027-01-01'});
  const ch=e.openChallenge(buyer,{target_record:r.record_id,grounds:'please check'},key());
  e.respondChallenge(a,ch.challenge_id,'business correction underway');
  assert.throws(()=>e.getChallenge(buyer,ch.challenge_id),/NOT_FOUND/);
  return {challengeId:ch.challenge_id,ownChallengeReadDenied:true};
});

observed('returned challenge object bypasses independent decision rule', 'Reject or isolate direct status mutation; adjudication must pass the independent-reviewer transition.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  const ch=e.openChallenge(a,{target_record:r.record_id,grounds:'review'},key());
  ch.status='REJECTED';ch.decided_by='operator';
  const read=e.getChallenge(a,ch.challenge_id);
  assert.equal(read.status,'REJECTED');assert.equal(read.history.length,1);
  return {status:read.status,decided_by:read.decided_by,history:read.history.map(x=>x.to)};
});

observed('regional tenant relabel moves future version into another log', 'Require an explicit controlled migration before changing an existing tenant region; do not silently redirect later versions.', ()=>{
  const e=setup(),r=e.registerRecord(a,material(),key());
  e.registerTenant('tenant-a','eu',['alice']);
  e.amendRecord(a,r.record_id,material({content:{secret:'new'}}),'updated',key());
  assert.equal(e.log('cn').size,1);assert.equal(e.log('eu').size,1);
  return {cnLogSize:e.log('cn').size,euLogSize:e.log('eu').size,note:'trusted setup migration has no immutability guard'};
});

console.log(JSON.stringify({ probes: 20, reproduced, changedOrFailed, meaning: 'Reproduced means the known unsafe baseline remains present; this is not an acceptance gate.' }));
if (changedOrFailed) process.exitCode = 1;
