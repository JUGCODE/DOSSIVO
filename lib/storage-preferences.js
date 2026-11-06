import {BridgeError} from './paci-bridge-core.js';
export const STORAGE_PREFERENCES=['NONE','LOCAL_ORIGINALS','PRIVATE_DEPLOYMENT'];
export class StoragePreferences {
 constructor(db){this.db=db;}
 actor(actor){if(typeof actor!=='string'||!actor||actor.length>200)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);}
 async read(actor){
  this.actor(actor);
  const row=await this.db.prepare('SELECT preference,version,updated_at FROM dossivo_storage_preferences WHERE actor_id=?').bind(actor).first();
  return {...(row??{preference:'NONE',version:0,updated_at:null}),scope:'ACCOUNT_PREFERENCE_ONLY',storage_mode:'SYNTHETIC_ONLY',connector_status:'NOT_IMPLEMENTED',freshness_status:'NOT_ASSESSED',original_upload_enabled:false,paci_recording_enabled:false};
 }
 async save(actor,data){
  this.actor(actor);
  if(!data||Object.keys(data).some(k=>!['preference','expected_version'].includes(k))||!STORAGE_PREFERENCES.includes(data.preference)||!Number.isSafeInteger(data.expected_version)||data.expected_version<0)throw new BridgeError('INVALID_INPUT','Invalid deployment preference');
  const now=new Date().toISOString();
  const result=data.expected_version===0
   ?await this.db.prepare('INSERT INTO dossivo_storage_preferences(actor_id,preference,version,updated_at) VALUES(?,?,1,?) ON CONFLICT(actor_id) DO NOTHING RETURNING version').bind(actor,data.preference,now).first()
   :await this.db.prepare('UPDATE dossivo_storage_preferences SET preference=?,version=version+1,updated_at=? WHERE actor_id=? AND version=? RETURNING version').bind(data.preference,now,actor,data.expected_version).first();
  if(!result){
   // Recover a lost response only when exactly this transition is still current.
   // Never replay an old preference over a newer choice or withdrawal.
   const current=await this.read(actor);
   if(current.version===data.expected_version+1&&current.preference===data.preference)return {...current,replayed:true};
   throw new BridgeError('VERSION_CONFLICT','Preference changed. Refresh before saving.',409);
  }
  return this.read(actor);
 }
}
