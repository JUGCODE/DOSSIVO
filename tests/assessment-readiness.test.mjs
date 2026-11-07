import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentReadiness} from '../lib/assessment-readiness.js';
const state=()=>({version:4,assessments:[{id:'a',input_version:3}],events:[{action:'assess'}],cards:[]});
test('readiness requires matching input version and assess event, never a favorable verdict',()=>{
 const s=state();s.assessments[0].summary={insufficient:true,unresolved:true};assert.equal(assessmentReadiness(s).can_freeze,true);
 s.version=5;assert.equal(assessmentReadiness(s).status,'needs_check');s.version=4;s.events=[{action:'confirm_field'}];assert.equal(assessmentReadiness(s).can_freeze,false);
 assert.equal(assessmentReadiness({version:1,assessments:[],events:[],cards:[]}).status,'missing');
});
test('frozen status requires a card matching the last assessment and version',()=>{
 const s=state();s.version=5;s.events=[{action:'freeze_card'}];s.cards=[{body:{task_version:4,assessment:{id:'a'}}}];assert.equal(assessmentReadiness(s).status,'frozen');assert.equal(assessmentReadiness(s).can_freeze,false);
 s.cards[0].body.assessment.id='old';assert.equal(assessmentReadiness(s).status,'needs_check');
});
