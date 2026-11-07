// Current private task diagnostics only. Never infer independence or pick a winner.
export function fieldCandidateGroups(state) {
 const groups=new Map();
 for(const f of state.fields??[]) {
  if(!groups.has(f.code))groups.set(f.code,[]);
  const m=(state.materials??[]).find(m=>m.id===f.material_id);
  groups.get(f.code).push({field_id:f.id,material_id:f.material_id,material_title:m?.title??null,root_id:f.root_id??null,scope:f.scope,locator:f.locator,extracted_value:f.extracted_value,confirmed_value:f.confirmed_value,unit:f.unit});
 }
 return [...groups].filter(([,c])=>c.length>1).map(([code,candidates])=>({code,reason:'AMBIGUOUS_INPUT',candidates}));
}
