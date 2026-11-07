import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSyntheticFields,SYNTHETIC_PARSER_VERSION} from '../lib/synthetic-field-parser.js';
test('multilingual parser normalizes equivalent units and preserves exact UTF-16 source positions',()=>{
 const text='🧪 Synthetic\r\n  Monthly electricity : 2000.5 kWh\n参保人数：10人\nAddetti retribuiti: 10 persone\nPayroll total: 50000 CNY\nRicavi: 200000 CNY\nQuantità prodotta: 1000 pezzi\n名册人数：10人';
 const rows=parseSyntheticFields(text);assert.equal(rows.length,7);
 for(const f of rows){assert.equal(text.slice(f.locator.start_utf16,f.locator.end_utf16),f.locator.quote);assert.equal(f.model,null);assert.equal(f.method,SYNTHETIC_PARSER_VERSION);}
 assert.equal(rows[0].locator.line,2);assert.equal(rows[0].extracted_value,2000.5);assert.equal(rows[2].unit,'人');assert.equal(rows[3].unit,'CNY');assert.equal(rows[5].unit,'件');
});
test('multilingual parser rejects ambiguous numbers, unsupported currencies, missing or mismatched units and oversized values',()=>{
 for(const text of ['Monthly electricity: 2,000 kWh','Elettricità mensile: 2000,5 kWh','Revenue: 5 EUR','Revenue: 5 people','Monthly electricity: -3 kWh','Monthly electricity: 3','Monthly electricity: 3 kWhfake','Revenue: 1000000000001 CNY','NotMonthly electricity: 3 kWh'])assert.deepEqual(parseSyntheticFields(text),[],text);
 assert.throws(()=>parseSyntheticFields('x'.repeat(10001)),/INVALID_SYNTHETIC_TEXT/);
});
test('mixed-language duplicate candidates remain separate and yuan conversion remains explicit',()=>{
 const rows=parseSyntheticFields('用电量：2000kWh\nMonthly electricity: 2000 kWh\nElettricità mensile: 2000 kWh\n代发总额：5万元');
 assert.equal(rows.filter(f=>f.code==='kwh_monthly').length,3);assert.equal(rows[3].raw_value,5);assert.equal(rows[3].extracted_value,50000);assert.equal(rows[3].conversion.factor,10000);
});
test('diagnostics explain supported labels with invalid formats and retain exact original locations',async()=>{
 const {inspectSyntheticText}=await import('../lib/synthetic-field-parser.js');
 const text='🧪\nMonthly electricity: 2,000 kWh\nRevenue: 5 EUR\n参保人数：10\n产量 4件\n代发总额：1000000000001元\nAddetti in elenco: 10 persone';
 const result=inspectSyntheticText(text);assert.equal(result.fields.length,1);assert.equal(result.report.issue_count,5);
 assert.deepEqual(result.report.issues.map(i=>i.reason),['NUMBER_FORMAT_UNSUPPORTED','UNIT_UNSUPPORTED','UNIT_MISSING','FORMAT_UNSUPPORTED','VALUE_OUT_OF_RANGE']);
 for(const issue of result.report.issues)assert.equal(text.slice(issue.locator.start_utf16,issue.locator.end_utf16),issue.locator.quote);
 assert.equal(result.report.issues[0].locator.line,2);assert.equal(result.report.model,null);
});
test('diagnostics distinguish no supported labels, valid input and bounded issue detail',async()=>{
 const {inspectSyntheticText}=await import('../lib/synthetic-field-parser.js');
 assert.equal(inspectSyntheticText('Narrative only').report.recognised_labels,0);
 const valid=inspectSyntheticText('用电量：2000kWh');assert.equal(valid.report.recognised_labels,1);assert.equal(valid.report.issue_count,0);
 const many=inspectSyntheticText('产量：3 EUR\n'.repeat(120));assert.equal(many.report.issue_count,120);assert.equal(many.report.issues.length,100);assert.equal(many.report.truncated,true);
});
