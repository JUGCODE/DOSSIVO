import test from 'node:test';
import assert from 'node:assert/strict';
import {filterFieldReviews,REVIEW_FILTERS} from '../lib/field-review-filter.js';
const fields=[
 {field_id:'pending',review_state:'pending',ever_changed:false,source_linked:true,scope_matches:true},
 {field_id:'restored',review_state:'unchanged',ever_changed:true,source_linked:true,scope_matches:true},
 {field_id:'corrected',review_state:'corrected',ever_changed:true,source_linked:false,scope_matches:false},
 {field_id:'history',review_state:'history_missing',ever_changed:false,source_linked:true,scope_matches:true}
];
test('review filters preserve overlapping history and source/scope issues without dropping restored corrections',()=>{
 const report={fields},expected={all:['pending','restored','corrected','history'],pending:['pending'],unchanged:['restored'],corrected:['corrected'],ever_changed:['restored','corrected'],history_missing:['history'],source_unlinked:['corrected'],scope_mismatch:['corrected']};
 for(const filter of REVIEW_FILTERS)assert.deepEqual(filterFieldReviews(report,filter).map(f=>f.field_id),expected[filter]);
});
test('review filters are view-only, retain order, reject invalid filters and support empty results',()=>{
 const report=structuredClone({fields}),before=structuredClone(report);
 for(const filter of REVIEW_FILTERS)filterFieldReviews(report,filter);
 assert.deepEqual(report,before);assert.deepEqual(filterFieldReviews({fields:[]},'pending'),[]);
 assert.throws(()=>filterFieldReviews(report,'hide-problems'),/INVALID_REVIEW_FILTER/);
});
