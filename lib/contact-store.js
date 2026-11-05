import {PrivateTaskStore} from './private-task-store.js';
import {CommunicationPolicyStore,communicationAvailableSql} from './communication-policy.js';
import {BridgeError,fingerprint} from './paci-bridge-core.js';
const unavailable=()=>new BridgeError('CONTACT_UNAVAILABLE','Contact or request unavailable',404);
export function normalizeContactId(value){if(typeof value!=='string')throw unavailable();const id=value.trim().toUpperCase();if(!/^DS-[A-F0-9]{24}$/.test(id))throw unavailable();return id;}
function randomHex(){return Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();}
const projection=p=>({public_id:p.public_id,display_name:p.display_name,identity_verified:false});
export class ContactStore extends PrivateTaskStore {
 constructor(db,options={}){super(db,options);this.communicationPolicy=new CommunicationPolicyStore(db,options);}
 regionSql(actorSql){return communicationAvailableSql(actorSql,this.communicationPolicy.regionEnforcement);}
 policy(){return this.communicationPolicy;}
 async profile(actor){this.actor(actor);const p=await this.q('SELECT * FROM dossivo_contact_profiles WHERE actor_id=?',actor).first();return p?{...projection(p),discoverable:!!p.discoverable}:null;}
 async ensureProfile(actor,data){
  await this.policy().require(actor);if(data.synthetic_only!==true)throw new BridgeError('REAL_DATA_DISABLED','Confirm synthetic contact profile only',403);
  if(typeof data.display_name!=='string'||!data.display_name.trim()||data.display_name.length>80||/[\x00-\x1f\x7f]/.test(data.display_name)||typeof data.discoverable!=='boolean')throw new BridgeError('INVALID_INPUT','Display name and contact-link preference required');
  const now=this.clock();await this.db.batch([this.policy().guard(actor),this.q('INSERT INTO dossivo_contact_profiles(actor_id,public_id,display_name,discoverable,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(actor_id) DO UPDATE SET display_name=excluded.display_name,discoverable=excluded.discoverable,updated_at=excluded.updated_at',actor,'DS-'+randomHex(),data.display_name.trim(),data.discoverable?1:0,now,now)]);
  return this.profile(actor);
 }
 async throttle(actor,kind,limit){this.actor(actor);const bucket=Math.floor(Date.parse(this.clock())/(kind==='LOOKUP'?900000:3600000));const row=await this.q('INSERT INTO dossivo_contact_attempts(actor_id,kind,bucket,attempts) VALUES(?,?,?,1) ON CONFLICT(actor_id,kind,bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts',actor,kind,bucket).first();if(row.attempts>limit)throw new BridgeError('RATE_LIMITED','Too many contact actions; try later',429);}
 async publicProfile(publicId){const id=normalizeContactId(publicId),p=await this.q(`SELECT public_id,display_name FROM dossivo_contact_profiles WHERE public_id=? AND discoverable=1 AND ${this.regionSql('dossivo_contact_profiles.actor_id')}`,id).first();if(!p)throw unavailable();return projection(p);}
 async lookup(actor,publicId){await this.policy().require(actor);await this.throttle(actor,'LOOKUP',25);return this.publicProfile(publicId);}
 async replay(actor,key,hash){this.actor(actor);if(typeof key!=='string'||!key||key.length>128)throw new BridgeError('INVALID_INPUT','Idempotency key required');const p=await this.q('SELECT command_hash,target_id FROM dossivo_contact_operations WHERE actor_id=? AND key=?',actor,key).first();if(p&&p.command_hash!==hash)throw new BridgeError('IDEMPOTENCY_CONFLICT','Same key, different contact action',409);return p;}
 op(actor,key,hash,target){return this.q('INSERT INTO dossivo_contact_operations(actor_id,key,command_hash,target_id) VALUES(?,?,?,?)',actor,key,hash,target);}
 async request(actor,data,key){
  await this.policy().require(actor);if(data.synthetic_only!==true)throw new BridgeError('REAL_DATA_DISABLED','Confirm synthetic contact request only',403);
  if(data.recommender_id||data.recommender||data.recommender_label)throw new BridgeError('INVALID_INPUT','Use a server-issued referral link');
  const publicId=normalizeContactId(data.public_id),hash=await fingerprint({op:'request',public_id:publicId,referral_token:data.referral_token??null});
  const self=await this.profile(actor);if(!self?.discoverable)throw new BridgeError('PROFILE_REQUIRED','Enable your contact ID first',409);
  const target=await this.q('SELECT actor_id FROM dossivo_contact_profiles WHERE public_id=? AND discoverable=1',publicId).first();if(!target||target.actor_id===actor)throw unavailable();
  await this.policy().requirePeer(target.actor_id);if(await this.replay(actor,key,hash))return this.requests(actor);await this.throttle(actor,'REQUEST',10);
  const pair=await fingerprint([actor,target.actor_id].sort());
  let referral=null;if(data.referral_token){const r=await this.referralInfo(data.referral_token);if(r.target_public_id!==publicId)throw unavailable();referral=data.referral_token;}
  const existing=await this.q('SELECT id FROM dossivo_contact_requests WHERE pair_key=?',pair).first(),id=existing?.id??this.uuid();
  await this.db.batch([
   this.policy().guard(actor,target.actor_id),
   this.q('INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM dossivo_contact_profiles WHERE actor_id=? AND discoverable=1) AND EXISTS(SELECT 1 FROM dossivo_contact_profiles WHERE actor_id=? AND discoverable=1) THEN 1 ELSE 0 END',this.uuid(),actor,target.actor_id),
   ...(referral?[this.referralGuard(referral,target.actor_id)]:[]),
   this.q("INSERT INTO dossivo_contact_requests(id,requester_id,recipient_id,pair_key,status,created_at,referral_id) VALUES(?,?,?,?,'PENDING',?,?) ON CONFLICT(pair_key) DO NOTHING",id,actor,target.actor_id,pair,this.clock(),referral),
   this.q('INSERT INTO dossivo_contact_operations(actor_id,key,command_hash,target_id) SELECT ?,?,?,id FROM dossivo_contact_requests WHERE pair_key=?',actor,key,hash,pair),
  ]).catch(async e=>{if(!await this.replay(actor,key,hash))throw e;});
  return this.requests(actor);
 }
 async requests(actor){
  this.actor(actor);
  const rows=(await this.q('SELECT r.*,a.public_id AS from_id,a.display_name AS from_name,b.public_id AS to_id,b.display_name AS to_name,ref.display_name AS recommender_name,ref.public_id AS recommender_public_id FROM dossivo_contact_requests r JOIN dossivo_contact_profiles a ON a.actor_id=r.requester_id JOIN dossivo_contact_profiles b ON b.actor_id=r.recipient_id LEFT JOIN dossivo_contact_referrals f ON f.id=r.referral_id LEFT JOIN dossivo_contact_profiles ref ON ref.actor_id=f.recommender_id WHERE r.requester_id=? OR r.recipient_id=? ORDER BY r.created_at DESC',actor,actor).all()).results;
  const map=r=>({id:r.id,status:r.status,created_at:r.created_at,display_name:r.requester_id===actor?r.to_name:r.from_name,public_id:r.requester_id===actor?r.to_id:r.from_id,recommender:r.recommender_name?{display_name:r.recommender_name,public_id:r.recommender_public_id}:null});
  const contacts=(await this.q('SELECT c.*,p.public_id,p.display_name FROM dossivo_contacts c JOIN dossivo_contact_profiles p ON p.actor_id=CASE WHEN c.owner_id=? THEN c.peer_id ELSE c.owner_id END WHERE c.owner_id=? OR c.peer_id=? ORDER BY c.created_at DESC',actor,actor,actor).all()).results.map(c=>({id:c.id,...projection(c),status:c.owner_blocked||c.peer_blocked?'BLOCKED':'ACCEPTED',blocked_by_me:!!(c.owner_id===actor?c.owner_blocked:c.peer_blocked)}));
  return {incoming:rows.filter(r=>r.recipient_id===actor).map(map),outgoing:rows.filter(r=>r.requester_id===actor).map(map),contacts};
 }
 async respond(actor,data,key){
  this.actor(actor);if(!['ACCEPT','DECLINE'].includes(data.decision))throw new BridgeError('INVALID_INPUT','Choose accept or decline');
  const hash=await fingerprint({op:'respond',request_id:data.request_id,decision:data.decision});
  const r=await this.q('SELECT * FROM dossivo_contact_requests WHERE id=? AND recipient_id=?',data.request_id,actor).first();if(!r)throw unavailable();
  if(data.decision==='ACCEPT'){await this.policy().require(actor);await this.policy().requirePeer(r.requester_id);}
  if(await this.replay(actor,key,hash))return this.requests(actor);if(r.status!=='PENDING')throw unavailable();
  const now=this.clock(),stat=data.decision==='ACCEPT'?'ACCEPTED':'DECLINED',sql=[
   ...(data.decision==='ACCEPT'?[this.policy().guard(actor,r.requester_id)]:[]),
   this.q("UPDATE dossivo_contact_requests SET status=?,responded_at=? WHERE id=? AND recipient_id=? AND status='PENDING'",stat,now,r.id,actor),this.q('INSERT INTO dossivo_task_guards(id,ok) VALUES(?,changes())',this.uuid())];
  if(data.decision==='ACCEPT')sql.push(this.q('INSERT INTO dossivo_contacts(id,pair_key,owner_id,peer_id,created_at) VALUES(?,?,?,?,?)','dm_'+this.uuid(),r.pair_key,r.requester_id,r.recipient_id,now));
  sql.push(this.op(actor,key,hash,r.id));
  try{await this.db.batch(sql);}catch(e){if(!await this.replay(actor,key,hash)){if(/CHECK|UNIQUE/.test(String(e)))throw unavailable();throw e;}}
  return this.requests(actor);
 }
 async block(actor,data,key){
  this.actor(actor);if(typeof data.blocked!=='boolean')throw new BridgeError('INVALID_INPUT','Block state required');const c=await this.q('SELECT * FROM dossivo_contacts WHERE id=? AND (owner_id=? OR peer_id=?)',data.contact_id,actor,actor).first();if(!c)throw unavailable();
  const hash=await fingerprint({op:'block',contact_id:data.contact_id,blocked:data.blocked});if(await this.replay(actor,key,hash))return this.requests(actor);
  const column=c.owner_id===actor?'owner_blocked':'peer_blocked';await this.db.batch([this.q(`UPDATE dossivo_contacts SET ${column}=? WHERE id=?`,data.blocked?1:0,c.id),this.op(actor,key,hash,c.id)]).catch(async e=>{if(!await this.replay(actor,key,hash))throw e;});return this.requests(actor);
 }
 referralGuard(token,target){return this.q(`INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN EXISTS(
  SELECT 1 FROM dossivo_contact_referrals f JOIN dossivo_contact_profiles p ON p.actor_id=f.recommender_id AND p.discoverable=1
  JOIN dossivo_contact_profiles t ON t.actor_id=f.target_id AND t.discoverable=1
  JOIN dossivo_contacts c ON ((c.owner_id=f.recommender_id AND c.peer_id=f.target_id) OR (c.peer_id=f.recommender_id AND c.owner_id=f.target_id))
   AND c.owner_blocked=0 AND c.peer_blocked=0 WHERE f.id=? AND f.target_id=? AND ${this.regionSql('f.recommender_id')} AND ${this.regionSql('f.target_id')}) THEN 1 ELSE 0 END`,this.uuid(),token,target);}
 async referral(actor,data,key){
  await this.policy().require(actor);const publicId=normalizeContactId(data.public_id),hash=await fingerprint({op:'referral',public_id:publicId});
  const self=await this.profile(actor),target=await this.q('SELECT actor_id FROM dossivo_contact_profiles WHERE public_id=? AND discoverable=1',publicId).first();if(!self?.discoverable||!target)throw unavailable();await this.policy().requirePeer(target.actor_id);
  const c=await this.q('SELECT id FROM dossivo_contacts WHERE ((owner_id=? AND peer_id=?) OR (peer_id=? AND owner_id=?)) AND owner_blocked=0 AND peer_blocked=0',actor,target.actor_id,actor,target.actor_id).first();if(!c)throw unavailable();const old=await this.replay(actor,key,hash);if(old){await this.referralInfo(old.target_id);return {token:old.target_id};}await this.throttle(actor,'REQUEST',10);
  const token=randomHex();await this.db.batch([
   this.policy().guard(actor,target.actor_id),
   this.q(`INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM dossivo_contacts c JOIN dossivo_contact_profiles p ON p.actor_id=? AND p.discoverable=1 JOIN dossivo_contact_profiles t ON t.actor_id=? AND t.discoverable=1 WHERE c.id=? AND c.owner_blocked=0 AND c.peer_blocked=0) THEN 1 ELSE 0 END`,this.uuid(),actor,target.actor_id,c.id),
   this.q('INSERT INTO dossivo_contact_referrals(id,recommender_id,target_id,created_at) VALUES(?,?,?,?)',token,actor,target.actor_id,this.clock()),this.op(actor,key,hash,token)]).catch(async e=>{if(!await this.replay(actor,key,hash))throw e;});const saved=await this.replay(actor,key,hash);return {token:saved.target_id};
 }
 async referralInfo(token){
  if(typeof token!=='string'||!/^([A-F0-9]{24})$/.test(token))throw unavailable();
  const r=await this.q(`SELECT t.public_id AS target_public_id,p.public_id AS recommender_public_id,p.display_name AS recommender_display_name FROM dossivo_contact_referrals f JOIN dossivo_contact_profiles t ON t.actor_id=f.target_id AND t.discoverable=1 JOIN dossivo_contact_profiles p ON p.actor_id=f.recommender_id AND p.discoverable=1 JOIN dossivo_contacts c ON ((c.owner_id=f.recommender_id AND c.peer_id=f.target_id) OR (c.peer_id=f.recommender_id AND c.owner_id=f.target_id)) AND c.owner_blocked=0 AND c.peer_blocked=0 WHERE f.id=? AND ${this.regionSql('f.recommender_id')} AND ${this.regionSql('f.target_id')}`,token).first();if(!r)throw unavailable();return {...r,identity_verified:false};
 }
}
