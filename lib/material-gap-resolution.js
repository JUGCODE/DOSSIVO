// A company declaration of receipt, not independent verification or legal closure.
export function eligibleGapMaterials(state,gap){
 if(gap?.mode!=='DIRECTORY'||!gap.gap||!Array.isArray(gap.categories)||!gap.categories.length||!gap.scope?.facility||!gap.scope?.period)return [];
 return state.materials.filter(m=>m.mode==='SYNTHETIC_TEXT'&&typeof m.text==='string'&&m.text.trim()&&m.review?.status==='COMPANY_CONFIRMED'&&m.scope?.facility===gap.scope?.facility&&m.scope?.period===gap.scope?.period&&(gap.categories??[]).every(c=>(m.categories??[]).includes(c)));
}
export function gapReceiptConfirmed(state,gap){
 return gap.gap?.status==='RECEIPT_CONFIRMED'&&eligibleGapMaterials(state,gap).some(m=>m.id===gap.gap.resolution?.material_id&&m.version===gap.gap.resolution?.material_version);
}
