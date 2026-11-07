export function partnerAdminIds(configuration){
 try{const ids=JSON.parse(configuration);return Array.isArray(ids)&&ids.length>0&&ids.every(id=>typeof id==='string'&&id.trim()===id&&id.length>0)?ids:[];}catch{return [];}
}
export const isPartnerAdmin=(actor,configuration)=>!!actor&&partnerAdminIds(configuration).includes(actor);
