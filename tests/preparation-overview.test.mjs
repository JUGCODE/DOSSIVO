import test from 'node:test';
import assert from 'node:assert/strict';
import {preparationOverview} from '../lib/preparation-overview.js';
const scope={facility:'A',period:'2026-10'};
const base=()=>({outcome:scope,materials:[],fields:[],preparation_categories:['electricity','payroll']});
const material=(extra={})=>({id:'m',mode:'SYNTHETIC_TEXT',text:'synthetic',scope,categories:['electricity'],...extra});
test('overview distinguishes missing, directory only and unsupported real intake without inventing submissions',()=>{const s=base();s.materials.push(material({mode:'DIRECTORY',text:undefined}));const o=preparationOverview(s);assert.equal(o.percent,0);assert.equal(o.submitted.length,0);assert.equal(o.missing.find(i=>i.code==='electricity').directory,true);assert.equal(o.capability,'SYNTHETIC_TEXT_ONLY');assert.equal(o.independent_verification,false);});
test('overview progress only counts matching facility and month; deselection does not erase submitted records',()=>{const s=base();s.materials=[material({scope:{...scope,period:'2026-09'}}),material({id:'b',scope:{...scope,facility:'B'}})];assert.equal(preparationOverview(s).percent,0);assert.equal(preparationOverview(s).other_scope_count,2);s.materials.push(material({id:'c'}));assert.equal(preparationOverview(s).percent,50);s.preparation_categories=[];const o=preparationOverview(s);assert.equal(o.percent,null);assert.equal(o.submitted.length,1);assert.equal(o.missing.length,0);});
test('overview retains conflicts in review even after company confirmation and leaves state unchanged',()=>{const s=base();s.materials=[material({review:{status:'COMPANY_CONFIRMED'}})];s.fields=[{id:'a',code:'kwh_monthly',material_id:'m',scope,confirmed_value:20},{id:'b',code:'kwh_monthly',material_id:'m',scope,confirmed_value:20}];const before=structuredClone(s),o=preparationOverview(s);assert.equal(o.review.length,1);assert.equal(o.conflict_count,1);assert.equal(o.supplements.some(i=>i.code==='electricity'),false);assert.deepEqual(s,before);});

test('overview does not hide a second unconfirmed material behind one confirmed material',()=>{const s=base();s.materials=[material({review:{status:'COMPANY_CONFIRMED'}}),material({id:'second',title:'Needs review'})];const o=preparationOverview(s);assert.equal(o.review.length,1);assert.equal(o.submitted[0].sources.length,2);assert.ok(o.review[0].sources.find(m=>m.id==='second').reasons.includes('MATERIAL_CONFIRMATION'));assert.ok(o.review[0].sources[0].reasons.includes('MISSING_FIELDS'));});
test('overview review reasons clear only for completed single-source fields and material confirmation',()=>{const s=base();s.materials=[material({review:{status:'COMPANY_CONFIRMED'}})];s.fields=[{id:'f',material_id:'m',code:'kwh_monthly',scope,confirmed_value:null}];assert.deepEqual(preparationOverview(s).review[0].sources[0].reasons,['FIELD_CONFIRMATION']);s.fields[0].confirmed_value=0;assert.equal(preparationOverview(s).review.length,0);s.materials.push(material({id:'outside',scope:{...scope,period:'2026-09'}}));assert.equal(preparationOverview(s).submitted[0].sources.length,1);assert.equal(preparationOverview(s).independent_verification,false);});

test('gap summary remains pending at full material coverage until explicit receipt confirmation',()=>{const s=base();s.preparation_categories=['electricity'];const source=material({version:1,review:{status:'COMPANY_CONFIRMED'}}),gap={id:'gap',mode:'DIRECTORY',scope,categories:['electricity'],gap:{status:'NOT_OBTAINED',reason:'Pending'}};s.materials=[source,gap];let o=preparationOverview(s);assert.equal(o.percent,100);assert.equal(o.gap_pending_count,1);assert.equal(o.gaps[0].receipt_state,'READY_FOR_REVIEW');gap.gap.status='RECEIPT_CONFIRMED';gap.gap.resolution={material_id:'m',material_version:1};o=preparationOverview(s);assert.equal(o.gap_pending_count,0);assert.equal(o.gap_confirmed_count,1);source.version=2;o=preparationOverview(s);assert.equal(o.gaps[0].receipt_state,'REVIEW_REQUIRED');assert.equal(o.gap_pending_count,1);gap.gap.status='NOT_OBTAINED';gap.gap.resolution=null;source.review=null;assert.equal(preparationOverview(s).gaps[0].receipt_state,'AWAITING_MATERIAL');});
test('gap summary excludes other scopes and refuses incomplete category matching',async()=>{const {eligibleGapMaterials}=await import('../lib/material-gap-resolution.js');const s=base();const source=material({review:{status:'COMPANY_CONFIRMED'}}),gap={id:'g',mode:'DIRECTORY',scope:{...scope,period:'2026-09'},categories:['electricity'],gap:{status:'NOT_OBTAINED'}};s.materials=[source,gap];assert.equal(preparationOverview(s).gaps.length,0);for(const categories of [undefined,[]])assert.deepEqual(eligibleGapMaterials(s,{...gap,scope,categories}),[]);});

test('overview keeps malformed source metrics in review despite company and field confirmation',()=>{
 const s=base();s.materials=[material({text:'用电量：20kWh\n用电量：未知kWh',review:{status:'COMPANY_CONFIRMED'},location_report:{issue_count:0}})];
 s.fields=[{id:'f',material_id:'m',code:'kwh_monthly',scope,confirmed_value:20}];
 const before=structuredClone(s),o=preparationOverview(s);
 assert.deepEqual(o.review[0].sources[0].reasons,['SOURCE_PARSE_ISSUE']);
 assert.equal(o.percent,50);assert.deepEqual(s,before);
 s.materials[0].text='用电量：20kWh';assert.equal(preparationOverview(s).review.length,0);
});
test('overview checks unlocated sources and limits parser issues to category and current scope',()=>{
 const s=base();s.materials=[material({text:'用电量：20MWh',review:{status:'COMPANY_CONFIRMED'}})];
 assert.ok(preparationOverview(s).review[0].sources[0].reasons.includes('SOURCE_PARSE_ISSUE'));
 s.materials[0].text='用电量：20kWh\n营收：未知CNY';s.fields=[{id:'f',material_id:'m',code:'kwh_monthly',scope,confirmed_value:20}];
 s.materials.push(material({id:'other',text:'用电量：未知',scope:{...scope,period:'2026-09'}}));
 assert.equal(preparationOverview(s).review.length,0);
});
