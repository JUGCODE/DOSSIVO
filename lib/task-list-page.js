import {BridgeError} from './paci-bridge-core.js';
export function encodeTaskCursor(row){return btoa(JSON.stringify([row.updated_at,row.id])).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
export function decodeTaskCursor(value){
 if(value==='')return null;
 try{
  if(typeof value!=='string'||value.length>512||!/^[-_a-zA-Z0-9]+$/.test(value))throw Error();
  const decoded=JSON.parse(atob(value.replace(/-/g,'+').replace(/_/g,'/')));
  if(!Array.isArray(decoded)||decoded.length!==2||typeof decoded[0]!=='string'||decoded[0].length>40||!Number.isFinite(Date.parse(decoded[0]))||typeof decoded[1]!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(decoded[1]))throw Error();
  return {updated_at:decoded[0],id:decoded[1]};
 }catch{throw new BridgeError('INVALID_CURSOR','Invalid task list cursor');}
}
// Reordering during pagination must not duplicate an already displayed task.
export function mergeTaskPage(previous,incoming){const seen=new Set(previous.map(t=>t.id));return [...previous,...incoming.filter(t=>{if(seen.has(t.id))return false;seen.add(t.id);return true;})];}
