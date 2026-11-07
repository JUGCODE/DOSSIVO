import {BridgeError} from './paci-bridge-core.js';
const readable=m=>m?.mode==='SYNTHETIC_TEXT'&&typeof m.text==='string';
const sameScope=(a,b)=>a?.facility===b?.facility&&a?.period===b?.period;
export function assignMaterialLineage(state,material,data,actor,now){
 const parentId=data.source_material_id,kind=data.source_relation;
 let parent=null,relation='original',basis='',method='NEW_SOURCE_DECLARATION';
 if(parentId||kind){
 if(typeof parentId!=='string'||!['translation','summary','copy'].includes(kind))throw new BridgeError('SOURCE_RELATION_INVALID','Select a source material and a recognised relationship');
 parent=state.materials.find(m=>m.id===parentId&&readable(m));
 if(!parent)throw new BridgeError('SOURCE_RELATION_INVALID','Choose a readable source material in this task');
 if(!sameScope(parent.scope,material.scope))throw new BridgeError('SOURCE_SCOPE_MISMATCH','Related materials must use the same facility and period');
 if(typeof data.source_reason!=='string'||!data.source_reason.trim()||data.source_reason.length>1000)throw new BridgeError('SOURCE_RELATION_INVALID','Explain the declared source relationship');
 if(kind==='copy'&&parent.text!==material.text)throw new BridgeError('SOURCE_RELATION_INVALID','An exact copy must preserve the original text');
 relation=kind;basis=data.source_reason.trim();method='USER_DECLARED_RELATION';
 }else{
 parent=state.materials.find(m=>readable(m)&&sameScope(m.scope,material.scope)&&m.text===material.text);
 if(parent){relation='copy';method='EXACT_TEXT_SCOPE_MATCH';}
 }
 return {...material,root_id:parent?(parent.root_id||parent.id):material.id,lineage:{schema:'dossivo-material-lineage/0.1',relation,parent_material_id:parent?.id??null,method,basis,recorded_by:actor,recorded_at:now,provenance_status:'NOT_INDEPENDENTLY_VERIFIED'}};
}
export function materialSourceSummary(state){
 const materials=state.materials.filter(readable);
 return {readable_material_count:materials.length,source_group_count:new Set(materials.map(m=>m.root_id||m.id)).size,related_material_count:materials.filter(m=>m.lineage?.parent_material_id).length,independent_source_count:null,interpretation:'SOURCE_GROUPS_NOT_INDEPENDENT_VERIFICATION'};
}
