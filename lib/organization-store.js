import {BridgeError,fingerprint} from './paci-bridge-core.js';
const denied=()=>new BridgeError('ORGANIZATION_UNAVAILABLE','Organization unavailable',404);
function value(x,max=200){if(typeof x!=='string'||!x.trim()||x.length>max||/[\x00-\x1f]/.test(x))throw new BridgeError('INVALID_INPUT','Invalid input');return x.trim();}
export class OrganizationStore {
 constructor(db,{clock=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID()}={}){this.db=db;this.clock=clock;this.uuid=uuid;}
 q(sql,...args){return this.db.prepare(sql).bind(...args);}
 async list(actor){value(actor);const rows=(await this.q(`SELECT o.id,o.name,o.country,o.created_at,
 CASE WHEN o.owner_id=? THEN 'OWNER' ELSE 'MEMBER' END role,
 CASE WHEN o.owner_id=? THEN 'ACTIVE' ELSE m.status END status,m.version
 FROM dossivo_organizations o LEFT JOIN dossivo_organization_members m ON m.organization_id=o.id AND m.actor_id=?
 WHERE o.owner_id=? OR m.status IN ('INVITED','ACTIVE') ORDER BY o.created_at DESC,o.id DESC`,actor,actor,actor,actor).all()).results;
 return {organizations:rows,verification:'SELF_DECLARED',evidence_access:'SEPARATE_AUTHORIZATION',billing:'NOT_CONNECTED'};}
 async owner(actor,id){value(actor);value(id);const row=await this.q('SELECT * FROM dossivo_organizations WHERE id=? AND owner_id=?',id,actor).first();if(!row)throw denied();return row;}
 async members(actor,id){await this.owner(actor,id);return {members:(await this.q('SELECT actor_id,status,version,updated_at FROM dossivo_organization_members WHERE organization_id=? ORDER BY actor_id',id).all()).results};}
 /** @param {string|null} before */
 async audit(actor,id,before=null){
  await this.owner(actor,id);let cursor=null;
  if(before!==null){if(typeof before!=='string'||before.length>512)throw new BridgeError('INVALID_INPUT','Invalid audit cursor');try{cursor=JSON.parse(before);}catch{throw new BridgeError('INVALID_INPUT','Invalid audit cursor');}if(!Array.isArray(cursor)||cursor.length!==2||cursor.some(x=>typeof x!=='string'||!x||x.length>128))throw new BridgeError('INVALID_INPUT','Invalid audit cursor');}
  const rows=(await this.q(`SELECT id,actor_id,subject_id,action,created_at FROM dossivo_organization_events WHERE organization_id=? AND (? IS NULL OR created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 51`,id,cursor?.[0]??null,cursor?.[0]??null,cursor?.[0]??null,cursor?.[1]??null).all()).results;
  return {events:rows.slice(0,50),next_before:rows.length>50?JSON.stringify([rows[49].created_at,rows[49].id]):null};
 }
 async replay(actor,key,hash){const prior=await this.q('SELECT command_hash,organization_id FROM dossivo_organization_operations WHERE actor_id=? AND request_key=?',actor,key).first();if(prior&&prior.command_hash!==hash)throw new BridgeError('IDEMPOTENCY_CONFLICT','Key already used',409);return prior;}
 async command(actor,action,input,key){value(actor);value(key,128);
  const d=input??{};let clean;
  if(action==='create'){
   if(d.confirmed!==true)throw new BridgeError('CONSENT_REQUIRED','Confirm self-declaration');
   clean={name:value(d.name,160),country:value(d.country,2).toUpperCase(),confirmed:true};
   if(!/^[A-Z]{2}$/.test(clean.country))throw new BridgeError('INVALID_INPUT','Two-letter country code required');
  }else if(['invite','revoke','accept','decline','leave'].includes(action)){
   clean={organization_id:value(d.organization_id),member_id:['accept','decline','leave'].includes(action)?actor:value(d.member_id),expected_version:d.expected_version};
   if(!Number.isSafeInteger(clean.expected_version)||clean.expected_version<0)throw new BridgeError('INVALID_INPUT','Expected membership version required');
  }else throw new BridgeError('INVALID_ACTION','Unsupported action');
  const hash=await fingerprint({action,data:clean});
  // Even retries require current authority for owner-only operations.
  if(action==='invite'||action==='revoke'){const org=await this.owner(actor,clean.organization_id);if(org.owner_id===clean.member_id)throw new BridgeError('INVALID_INPUT','Owner membership cannot be changed');}
  const prior=await this.replay(actor,key,hash);if(prior)return {organization_id:prior.organization_id,replayed:true};
  const id=action==='create'?this.uuid():clean.organization_id,now=this.clock();let statements=[];
  if(action==='create'){
   if(await this.q('SELECT id FROM dossivo_organizations WHERE owner_id=?',actor).first())throw new BridgeError('ORGANIZATION_EXISTS','One founding workspace per account in this release',409);
   statements=[this.q('INSERT INTO dossivo_organizations(id,owner_id,name,country,created_at) VALUES(?,?,?,?,?)',id,actor,clean.name,clean.country,now)];
  }else if(action==='invite'&&clean.expected_version===0){
   statements=[this.q("INSERT INTO dossivo_organization_members(organization_id,actor_id,status,version,updated_at) VALUES(?,?,'INVITED',1,?)",id,clean.member_id,now)];
  }else{
   const next=action==='invite'?'INVITED':action==='accept'?'ACTIVE':'REVOKED';
   const from=action==='invite'?'REVOKED':action==='leave'?'ACTIVE':'INVITED';
   statements=[this.q(`UPDATE dossivo_organization_members SET status=?,version=version+1,updated_at=? WHERE organization_id=? AND actor_id=? AND version=? AND ${action==='revoke'?"status IN ('INVITED','ACTIVE')":"status=?"}`,next,now,id,clean.member_id,clean.expected_version,...(action==='revoke'?[]:[from])),this.q('INSERT INTO dossivo_task_guards(id,ok) VALUES(?,changes())',this.uuid())];
  }
  statements.push(this.q('INSERT INTO dossivo_organization_events(id,organization_id,actor_id,subject_id,action,created_at) VALUES(?,?,?,?,?,?)',this.uuid(),id,actor,clean.member_id??actor,action,now),this.q('INSERT INTO dossivo_organization_operations(actor_id,request_key,command_hash,organization_id) VALUES(?,?,?,?)',actor,key,hash,id));
  try{await this.db.batch(statements);}catch(e){const p=await this.replay(actor,key,hash);if(p)return {organization_id:p.organization_id,replayed:true};if(/UNIQUE|CHECK|constraint/i.test(String(e)))throw new BridgeError('VERSION_CONFLICT','Refresh before retrying',409);throw e;}
  return {organization_id:id,replayed:false};
 }
}
