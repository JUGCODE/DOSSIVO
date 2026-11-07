// Private workflow feedback, not verified labels, accuracy scoring or training data.
export function fieldReviewSummary(state){
 const fields=state.fields??[],materials=new Map((state.materials??[]).map(m=>[m.id,m]));
 const counts={total:fields.length,pending:0,unchanged:0,corrected:0,history_missing:0,ever_changed:0,change_events:0,source_unlinked:0,scope_mismatch:0};
 const rows=fields.map(f=>{
  const events=Array.isArray(f.confirmations)?f.confirmations:[];
  const confirmed=typeof f.confirmed_value==='number'&&Number.isFinite(f.confirmed_value);
  const historyValid=events.length>0&&events.at(-1).value===f.confirmed_value;
  const review_state=!confirmed?'pending':!historyValid?'history_missing':f.confirmed_value===f.extracted_value?'unchanged':'corrected';
  let previous=f.extracted_value,change_events=0,ever_changed=false;
  for(const event of events){if(typeof event.value!=='number'||!Number.isFinite(event.value))continue;if(event.value!==previous)change_events++;if(event.value!==f.extracted_value)ever_changed=true;previous=event.value;}
  const m=materials.get(f.material_id),p=f.locator;
  const source_linked=!!(m&&typeof m.text==='string'&&m.version===f.material_version&&p&&Number.isInteger(p.start_utf16)&&Number.isInteger(p.end_utf16)&&p.start_utf16>=0&&p.end_utf16>p.start_utf16&&p.end_utf16<=m.text.length&&typeof p.quote==='string'&&m.text.slice(p.start_utf16,p.end_utf16)===p.quote);
  const scope_matches=!!(f.scope&&state.outcome&&f.scope.facility===state.outcome.facility&&f.scope.period===state.outcome.period);
  counts[review_state]++;if(ever_changed)counts.ever_changed++;counts.change_events+=change_events;if(!source_linked)counts.source_unlinked++;if(!scope_matches)counts.scope_mismatch++;
  return {field_id:f.id,code:f.code,review_state,ever_changed,change_events,source_linked,scope_matches};
 });
 return {format:'dossivo-field-review-summary/1',task_id:state.task_id,task_version:state.version,counts,fields:rows,independently_verified:false,training_use:false,accuracy_score:null};
}
