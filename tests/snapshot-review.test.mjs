import test from "node:test";
import assert from "node:assert/strict";
import { snapshotView, compareSnapshotViews } from "../lib/snapshot-review.js";
import { buildRegistrationDraft } from "../lib/paci-bridge-core.js";
import { createInitialState, extractSyntheticFacts } from "../lib/workflow-core.js";
function manifest(){return buildRegistrationDraft({snapshotId:"fixed",caseId:"case",caseVersion:1,state:{...createInitialState(),facts:extractSyntheticFacts()},now:"2026-10-26T10:00:00.000Z"});}
test("diff treats reordered facts as unchanged and tracks additions, removals and confirmation separately",()=>{
 const before=snapshotView(manifest(),"hash"); const after=structuredClone(before);
 after.facts.reverse(); after.created_at="2026-10-27T10:00:00.000Z";after.case_version=2;
 assert.deepEqual(compareSnapshotViews(before,after).changes,[]);
 const old=after.facts.pop(); after.facts.push({...old,local_ref:"new-reference"});
 after.facts[0].confirmed_by_company=true;
 const result=compareSnapshotViews(before,after);
 assert.equal(result.summary.added,1);assert.equal(result.summary.removed,1);assert.equal(result.summary.changed,1);
 assert.equal(result.verification,"UNVERIFIED");assert.equal(result.proof_package,null);
});
test("ambiguous local references and unsupported snapshot formats are rejected",()=>{
 const m=manifest();m.records[0].record.content.facts.push({...m.records[0].record.content.facts[0]});
 assert.throws(()=>snapshotView(m,"hash"),{code:"AMBIGUOUS_SNAPSHOT"});
 m.format="unknown";assert.throws(()=>snapshotView(m,"hash"),{code:"INVALID_SNAPSHOT"});
});
