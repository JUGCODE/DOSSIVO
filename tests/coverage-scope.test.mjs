import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageFor} from '../lib/evidence-coverage.js';
import {preparationOverview} from '../lib/preparation-overview.js';
import {initialTask,transitionTask} from '../lib/private-task-core.js';
import {fingerprint} from '../lib/paci-bridge-core.js';
import {basicProjection} from '../lib/basic-evidence-card.js';
const scope={facility:'A',period:'2026-10'};
const material=(id,ownScope=scope)=>({id,mode:'SYNTHETIC_TEXT',text:'用电量：20kWh',categories:['electricity'],scope:ownScope,review:{status:'COMPANY_CONFIRMED'}});
test('coverage uses the same facility/month in overview, full checklist and selected checklist',()=>{
 const s={outcome:scope,materials:[material('old',{...scope,period:'2026-09'}),material('other',{...scope,facility:'B'}),material('unknown',null)],fields:[],preparation_categories:['electricity']};
 assert.equal(coverageFor(s).submitted,0);assert.equal(coverageFor(s).company_confirmed,0);assert.equal(coverageFor(s).excluded_material_count,3);
 s.materials.push(material('current'));const before=structuredClone(s),c=coverageFor(s),o=preparationOverview(s);
 assert.equal(c.submitted,1);assert.equal(c.selected_submitted,o.selected_submitted);assert.equal(c.total_catalog,11);assert.equal(c.percent,9);assert.deepEqual(s,before);
});
test('coverage fails closed for missing or invalid task scope and rejects mismatched field confirmation',()=>{
 const s={outcome:scope,materials:[{...material('current'),review:null}],fields:[{material_id:'current',code:'kwh_monthly',confirmed_value:0,scope:{...scope,period:'2026-09'}}]};
 assert.equal(coverageFor(s).company_confirmed,0);s.fields[0].scope=scope;assert.equal(coverageFor(s).company_confirmed,1);
 for(const outcome of [undefined,{facility:'',period:'2026-10'},{facility:'A',period:'2026-99'}]){const c=coverageFor({...s,outcome});assert.equal(c.submitted,0);assert.equal(c.scope_status,'SCOPE_UNAVAILABLE');}
});
test('new frozen card and buyer projection use scoped counts, without changing earlier frozen cards',async()=>{
 let n=0,s=initialTask({synthetic_only:true,purpose:'Synthetic',organization:'Synthetic',...scope},'task','2026-11-07');
 const run=async(action,data={})=>{s=await transitionTask(s,{action,data},'owner','2026-11-07',()=>String(++n));};
 await run('choose_materials',{categories:['electricity']});
 await run('import_text',{synthetic_only:true,title:'Other month',text:'用电量：20kWh',categories:['electricity'],facility:'A',period:'2026-09'});
 await run('assess');await run('freeze_card');const old=structuredClone(s.cards[0]);assert.equal(old.body.coverage.submitted,0);
 await run('import_text',{synthetic_only:true,title:'Current month',text:'用电量：20kWh',categories:['electricity'],...scope});
 await run('assess');await run('freeze_card');const latest=s.cards.at(-1);
 assert.equal(latest.body.coverage.submitted,1);assert.deepEqual(latest.body.preparation_categories,['electricity']);assert.equal(coverageFor(latest.body).selected_total,1);assert.deepEqual(s.cards[0],old);assert.equal(await fingerprint(s.cards[0].body),old.sha256);
 assert.equal(basicProjection(latest,{categories:['electricity'],fields:[]}).coverage.submitted,1);
 assert.equal(basicProjection(old,{categories:['electricity'],fields:[]}).coverage.submitted,0);
 // A stored legacy snapshot retains its recorded counts; no retroactive recalculation.
 const legacy=structuredClone(old);legacy.body.coverage.schema='dossivo-material-coverage/0.1';legacy.body.coverage.submitted=1;legacy.body.coverage.percent=9;
 assert.equal(basicProjection(legacy,{categories:['electricity'],fields:[]}).coverage.submitted,1);
});
