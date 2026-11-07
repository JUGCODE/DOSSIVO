import test from 'node:test';
import assert from 'node:assert/strict';
import {cardHtml} from '../lib/basic-evidence-card.js';
function view(){return {scope:{organization:'<script>Company</script>',facility:'Factory',period:'2026-11'},task_version:7,source_card_id:'fixed-1',coverage:{percent:10,submitted:1,total_catalog:11,company_confirmed:1,checked:0},parameters:[{code:'si_headcount',value:0,unit:'人',scope:{period:'2026-11',facility:'Factory'}},{code:'output_qty',value:2,unit:'件',scope:{period:'2026-11',facility:'Factory'}}],materials:[{code:'electricity',submitted:true,company_confirmed:false}],issues:{unresolved_count:1,red_count:1},assessment:{insufficient:true},created_at:'2026-11-06T10:00:00Z',synthetic_only:true};}
test('Italian downloads translate parameters categories units and all snapshot notices without changing source',()=>{
 const p=view(),before=structuredClone(p),html=cardHtml(p,'it');assert.match(html,/<html lang="it">/);assert.match(html,/Numero di addetti assicurati/);assert.match(html,/0 persone/);assert.match(html,/2 unità/);assert.match(html,/Bollette e consumi elettrici/);assert.match(html,/Documentazione insufficiente: Sì/);assert.match(html,/revoche o aggiornamenti successivi/);assert.match(html,/non invalida né disabilita/);assert.match(html,/fixed-1/);assert.match(html,/2026-11-06T10:00:00Z/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|[\u3400-\u9fff]|Material coverage|Online access expires|Not submitted/);assert.deepEqual(p,before);
});
test('Chinese boolean labels and English units do not leak internal display values',()=>{
 const p=view();assert.match(cardHtml(p,'zh'),/资料不足项: 是/);p.assessment.insufficient=false;assert.match(cardHtml(p,'zh'),/资料不足项: 否/);delete p.assessment.insufficient;assert.match(cardHtml(p,'zh'),/资料不足项: 未提供/);
 const en=cardHtml(p,'en');assert.match(en,/0 people/);assert.match(en,/2 units/);assert.doesNotMatch(en,/[\u3400-\u9fff]/);assert.match(cardHtml(p,'unknown'),/<html lang="en">/);
});
test('Italian published history translates stages and preserves publication and download provenance',()=>{
 const v={snapshot:view(),downloaded_at:'2026-11-07T10:00:00Z',access_mode:'CONTINUOUS_SUMMARY',version_policy:'FOLLOW_PUBLISHED',publication_sequence:1,latest_publication_sequence:2,publication_history:[{sequence:1,task_version:7,published_at:'2026-11-06',card_id:'fixed-1',issues:{unresolved_count:1,red_count:1},issue_states:[{id:'issue',severity:'red',status:'remediating'}]}]};
 const html=cardHtml(v,'it');assert.match(html,/Fino alla revoca/);assert.match(html,/Pubblicazione selezionata: 1/);assert.match(html,/ultima al momento del download: 2/);assert.match(html,/Rimedio in corso/);assert.match(html,/Scaricata il: 2026-11-07T10:00:00Z/);assert.doesNotMatch(html,/remediating|Published history|Until revoked/);
});
