// Compare persisted candidates by identity; repeated metric codes are not merged.
function project(field){return field?{code:field.code,material_id:field.material_id,unit:field.unit,extracted_value:field.extracted_value??null,confirmed_value:field.confirmed_value??null,confirmation_count:(field.confirmations??[]).length}:null;}
export function taskFieldChanges(previous,current){
 const old=new Map(previous.fields.map(f=>[f.id,f])),now=new Map(current.fields.map(f=>[f.id,f])),rows=[];
 for(const id of new Set([...old.keys(),...now.keys()])){
  const before=project(old.get(id)),after=project(now.get(id));
  if(JSON.stringify(before)===JSON.stringify(after))continue;
  rows.push({field_id:id,kind:!before?'added':!after?'removed':'changed',before,after});
 }
 return {from_version:previous.version,to_version:current.version,total:rows.length,changes:rows.slice(0,100),truncated:rows.length>100};
}
