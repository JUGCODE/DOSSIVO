import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceDiagnosticSummary} from '../lib/source-diagnostic-summary.js';
test('fresh source diagnostics include issues beyond display truncation without exporting excerpts',()=>{
 const state={materials:[{id:'m',mode:'SYNTHETIC_TEXT',text:'产量：3 EUR\n'.repeat(101)+'用电量：1,000 kWh',location_report:{issue_count:0}}]},before=structuredClone(state);
 const result=sourceDiagnosticSummary(state);assert.equal(result.issue_count,102);assert.equal(result.materials[0].issue_counts.output_qty,101);assert.equal(result.materials[0].issue_counts.kwh_monthly,1);assert.deepEqual(result.affected_codes,['output_qty','kwh_monthly']);assert.doesNotMatch(JSON.stringify(result),/EUR|1,000|quote/);assert.deepEqual(state,before);
});
test('unlocated synthetic inputs are checked while directories and unrelated prose do not invent metrics',()=>{
 const result=sourceDiagnosticSummary({materials:[{id:'d',mode:'DIRECTORY',text:'用电量：3 EUR'},{id:'p',mode:'SYNTHETIC_TEXT',text:'Synthetic employment policy'},{id:'m',mode:'SYNTHETIC_TEXT',text:'Revenue: 4 EUR'}]});
 assert.equal(result.issue_count,1);assert.deepEqual(result.affected_codes,['revenue']);assert.equal(result.materials.length,1);
});
