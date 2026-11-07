import test from 'node:test';
import assert from 'node:assert/strict';
import {taskFieldChanges} from '../lib/task-field-changes.js';
const f=(id,value=null)=>({id,code:'kwh_monthly',material_id:'m',unit:'kWh',extracted_value:12,confirmed_value:value,confirmations:[],locator:{quote:'private quote'},reason:'private reason'});
test('field comparison distinguishes zero and null and preserves duplicate metric identities',()=>{
 const previous={version:2,fields:[f('a'),f('b',12)]},current={version:3,fields:[f('a',0),f('b',12),f('c')]};
 const report=taskFieldChanges(previous,current);assert.equal(report.total,2);assert.deepEqual(report.changes.map(r=>r.field_id),['a','c']);assert.equal(report.changes[0].before.confirmed_value,null);assert.equal(report.changes[0].after.confirmed_value,0);
 assert.doesNotMatch(JSON.stringify(report),/private quote|private reason|locator/);assert.equal(previous.fields[0].confirmed_value,null);
});
test('comparison records repeated confirmations and removal without claiming value correction',()=>{
 const old=f('a',12),next={...old,confirmations:[{value:12,reason:'Reviewed'}]};
 const report=taskFieldChanges({version:3,fields:[old,f('b')]},{version:4,fields:[next]});assert.equal(report.total,2);assert.equal(report.changes[0].before.confirmed_value,report.changes[0].after.confirmed_value);assert.equal(report.changes[0].after.confirmation_count,1);assert.equal(report.changes[1].kind,'removed');
 assert.equal(taskFieldChanges({version:4,fields:[next]},{version:5,fields:[next]}).total,0);
});
test('comparison caps displayed details but keeps complete change count',()=>{
 const r=taskFieldChanges({version:1,fields:[]},{version:2,fields:Array.from({length:105},(_,i)=>f(String(i)))});assert.equal(r.total,105);assert.equal(r.changes.length,100);assert.equal(r.truncated,true);
});
