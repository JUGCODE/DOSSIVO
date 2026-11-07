import {inspectSyntheticText} from './synthetic-field-parser.js';
import {eligibleGapMaterials,gapReceiptConfirmed} from './material-gap-resolution.js';
import {coverageFor,MATERIAL_CATALOG} from './evidence-coverage.js';
import {fieldCandidateGroups} from './field-candidates.js';
export function preparationOverview(state){
 const matches=m=>m.scope?.facility===state.outcome.facility&&m.scope?.period===state.outcome.period;
 const materials=state.materials.filter(matches),ids=new Set(materials.map(m=>m.id));
 const scoped={...state,materials,fields:state.fields.filter(f=>ids.has(f.material_id)&&matches(f))};
 const coverage=coverageFor(scoped),submitted=coverage.items.filter(i=>i.submitted),missing=coverage.items.filter(i=>i.selected&&!i.submitted);
 const conflicts=fieldCandidateGroups(state);
 const gaps=materials.filter(m=>m.mode==='DIRECTORY'&&m.gap).map(m=>({id:m.id,title:m.title,category:m.categories[0],custodian:m.custodian,reason:m.gap.reason,recorded_at:m.gap.recorded_at,status:m.gap.status,receipt_state:gapReceiptConfirmed(state,m)?'CONFIRMED':m.gap.status==='RECEIPT_CONFIRMED'?'REVIEW_REQUIRED':eligibleGapMaterials(state,m).length?'READY_FOR_REVIEW':'AWAITING_MATERIAL',resolution:m.gap.resolution??null,history:m.gap.history??[]}));
 const diagnostics=new Map(materials.filter(m=>m.mode==='SYNTHETIC_TEXT'&&typeof m.text==='string').map(m=>[m.id,inspectSyntheticText(m.text).report]));
 const enriched=submitted.map(item=>{
  const codes=MATERIAL_CATALOG.find(c=>c.code===item.code).fields;
  const sources=materials.filter(m=>(m.categories??[]).includes(item.code)&&m.mode!=='DIRECTORY'&&typeof m.text==='string').map(m=>{
   const fields=scoped.fields.filter(f=>f.material_id===m.id),reasons=[];
   if(codes.some(code=>(diagnostics.get(m.id)?.issue_counts[code]??0)>0))reasons.push('SOURCE_PARSE_ISSUE');
   if(m.review?.status!=='COMPANY_CONFIRMED')reasons.push('MATERIAL_CONFIRMATION');
   if(codes.some(code=>!fields.some(f=>f.code===code)))reasons.push('MISSING_FIELDS');
   if(fields.some(f=>codes.includes(f.code)&&f.confirmed_value===null))reasons.push('FIELD_CONFIRMATION');
   if(codes.some(code=>conflicts.some(g=>g.code===code)))reasons.push('CONFLICT');
   return {id:m.id,title:m.title,reasons};
  });
  return {...item,sources};
 });
 return {gaps,gap_pending_count:gaps.filter(g=>g.receipt_state!=='CONFIRMED').length,gap_confirmed_count:gaps.filter(g=>g.receipt_state==='CONFIRMED').length,submitted:enriched,missing,review:enriched.filter(i=>i.sources.some(m=>m.reasons.length)),
 supplements:coverage.items.filter(i=>!i.submitted&&['electricity','social_insurance','payroll','production','audit_report'].includes(i.code)),
 other_scope_count:state.materials.length-materials.length,conflict_count:conflicts.length,
 selected_total:coverage.selected_total,selected_submitted:coverage.selected_submitted,
 percent:coverage.selected_total?Math.round(coverage.selected_submitted/coverage.selected_total*100):null,
 capability:'SYNTHETIC_TEXT_ONLY',independent_verification:false};
}
