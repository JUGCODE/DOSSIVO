import test from 'node:test';
import assert from 'node:assert/strict';
import {basicProjection} from '../lib/basic-evidence-card.js';
const scope={facility:'A',period:'2026-10'};
function card(){return {outcome:scope,materials:[{id:'m',scope,categories:['electricity'],mode:'SYNTHETIC_TEXT',text:'synthetic'}],fields:[{id:'f',material_id:'m',scope,code:'kwh_monthly',confirmed_value:0,unit:'kWh'}],flags:[],assessment:{summary:{insufficient:true}},synthetic_only:true};}
const choice={fields:['kwh_monthly'],categories:['electricity']};
test('disclosure requires both field and source scope; zero survives and input is unchanged',()=>{
 const b=card(),before=structuredClone(b);assert.equal(basicProjection(b,choice).parameters[0].value,0);assert.deepEqual(b,before);
 for(const field of [{...b.fields[0],scope:null},{...b.fields[0],scope:{...scope,facility:'B'}},{...b.fields[0],material_id:'missing'},{...b.fields[0],confirmed_value:NaN},{...b.fields[0],confirmed_value:undefined}])assert.deepEqual(basicProjection({...b,fields:[field]},choice).parameters,[]);
 b.materials[0].scope={...scope,period:'2026-09'};assert.deepEqual(basicProjection(b,choice).parameters,[]);
});
test('disclosure without valid monthly task scope fails closed; selecting no fields remains private',()=>{
 const b=card();for(const outcome of [{facility:'',period:'2026-10'},{facility:'A',period:'2026-99'}])assert.deepEqual(basicProjection({...b,outcome},choice).parameters,[]);
 assert.deepEqual(basicProjection(b,{...choice,fields:[]}).parameters,[]);
});
