import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldReviewSummary} from '../lib/field-review-summary.js';
const scope={facility:'synthetic',period:'2026-10'};
const field=(patch={})=>({id:'f1',code:'kwh_monthly',material_id:'m1',material_version:1,scope,extracted_value:0,confirmed_value:null,confirmations:[],locator:{start_utf16:0,end_utf16:3,quote:'abc'},...patch});
const state=fields=>({task_id:'t1',version:3,outcome:scope,materials:[{id:'m1',version:1,text:'abc private source'}],fields});
test('review summary distinguishes pending, confirmed zero, corrected and missing history without accuracy claims',()=>{
 const report=fieldReviewSummary(state([field(),field({id:'f2',confirmed_value:0,confirmations:[{value:0}]}),field({id:'f3',confirmed_value:2,confirmations:[{value:2}]}),field({id:'f4',confirmed_value:3})]));
 assert.deepEqual(report.counts,{total:4,pending:1,unchanged:1,corrected:1,history_missing:1,ever_changed:1,change_events:1,source_unlinked:0,scope_mismatch:0});
 assert.equal(report.training_use,false);assert.equal(report.independently_verified,false);assert.equal(report.accuracy_score,null);
});
test('returning to extracted value preserves historical changes and repeated confirmations do not inflate changes',()=>{
 const report=fieldReviewSummary(state([field({confirmed_value:0,confirmations:[{value:0},{value:2},{value:2},{value:0},{value:0}]})]));
 assert.equal(report.counts.unchanged,1);assert.equal(report.counts.corrected,0);assert.equal(report.counts.ever_changed,1);assert.equal(report.counts.change_events,2);
});
test('summary flags broken source/version/scope links and never emits raw text, values, actors or reasons',()=>{
 const report=fieldReviewSummary(state([field({locator:{start_utf16:0,end_utf16:3,quote:'wrong'},scope:{facility:'other',period:'2026-10'},confirmed_value:123456,confirmations:[{value:123456,actor:'secret-person',reason:'private-reason'}]}),field({id:'f2',material_version:2})]));
 assert.equal(report.counts.source_unlinked,2);assert.equal(report.counts.scope_mismatch,1);
 assert.doesNotMatch(JSON.stringify(report),/secret-person|private-reason|private source|123456|wrong/);
 assert.equal(fieldReviewSummary(state([])).counts.total,0);
});
