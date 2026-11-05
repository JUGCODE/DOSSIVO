import {PrivateTaskStore} from './private-task-store.js';
import {BridgeError,fingerprint} from './paci-bridge-core.js';
import {chooseDisclosure,basicProjection,issueSummary} from './basic-evidence-card.js';
const UNAVAILABLE=()=>new BridgeError('ACCESS_UNAVAILABLE','Code or access unavailable, expired, redeemed or revoked',404);
export function normalizedCode(v){if(typeof v!=='string')throw UNAVAILABLE();const x=v.replace(/[\s-]/g,'').toUpperCase();if(!/^[0-9A-F]{32}$/.test(x))throw UNAVAILABLE();return x;}
const activeSql="(access_mode='CONTINUOUS_SUMMARY' OR expires_at>?)";
function accessExpiry(row){return row.access_mode==='CONTINUOUS_SUMMARY'?null:row.expires_at;}
function makeCode(){const bytes=crypto.getRandomValues(new Uint8Array(16));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();}
export class BuyerAccessStore extends PrivateTaskStore {
 async replay(actor,key,digest){this.actor(actor);const op=await this.q('SELECT command_hash,grant_id FROM dossivo_access_operations WHERE actor_id=? AND idempotency_key=?',actor,key).first();if(op&&op.command_hash!==digest)throw new BridgeError('IDEMPOTENCY_CONFLICT','Same key, different access operation',409);return op;}
 async owned(actor,id){this.actor(actor);const row=await this.q('SELECT * FROM dossivo_basic_grants WHERE id=? AND owner_id=?',id,actor).first();if(!row)throw UNAVAILABLE();return row;}
 meta(row){return {id:row.id,task_id:row.task_id,card_id:row.card_id,expires_at:accessExpiry(row),redemption_expires_at:row.expires_at,access_mode:row.access_mode??'TEMPORARY',purpose:row.purpose??'COMPLIANCE_REVIEW',version_policy:row.version_policy??'FIXED',publication_seq:row.publication_seq??0,revoked_at:row.revoked_at,redeemed:!!row.redeemed_by,created_at:row.created_at,choice:JSON.parse(row.choice_json)};}
 async ownerList(actor,taskId){await this.read(actor,taskId);const rows=(await this.q('SELECT * FROM dossivo_basic_grants WHERE owner_id=? AND task_id=? ORDER BY created_at DESC LIMIT 100',actor,taskId).all()).results;return rows.map(r=>this.meta(r));}
 async ownerUsage(actor,taskId){
  const state=await this.read(actor,taskId),now=this.clock();
  if(state.synthetic_only!==true)throw new BridgeError('REAL_DATA_DISABLED','Reuse statistics currently support synthetic tasks only',403);
  // Aggregate the complete task history in SQL. Never count the paginated owner list,
  // redemption events, owner activity or failed requests as independent readers.
  const rows=(await this.q(`WITH owned_grants AS (
   SELECT * FROM dossivo_basic_grants WHERE owner_id=? AND task_id=?
  ), entries AS (
   SELECT g.card_id,g.id AS grant_id,g.redeemed_by,g.revoked_at,
    CASE WHEN g.revoked_at IS NULL AND (g.expires_at>? OR (g.access_mode='CONTINUOUS_SUMMARY' AND g.redeemed_by IS NOT NULL)) THEN 1 ELSE 0 END AS active,
    NULL AS actor_id,NULL AS kind,NULL AS created_at FROM owned_grants g
   UNION ALL
   SELECT COALESCE(e.card_id,g.card_id),NULL,NULL,NULL,0,e.actor_id,e.kind,e.created_at
    FROM owned_grants g JOIN dossivo_access_events e ON e.grant_id=g.id AND e.actor_id=g.redeemed_by
    AND e.actor_id<>g.owner_id AND e.kind IN ('VIEWED','DOWNLOADED')
  ), grouped AS (
   SELECT 'card' AS row_type,card_id,COUNT(grant_id) AS grants_created,
    COUNT(CASE WHEN redeemed_by IS NOT NULL THEN grant_id END) AS grants_redeemed,
    SUM(active) AS active_grants,COUNT(CASE WHEN revoked_at IS NOT NULL THEN grant_id END) AS revoked_grants,
    COUNT(DISTINCT actor_id) AS unique_reader_accounts,
    SUM(CASE WHEN kind='VIEWED' THEN 1 ELSE 0 END) AS read_requests,
    SUM(CASE WHEN kind='DOWNLOADED' THEN 1 ELSE 0 END) AS download_requests,MAX(created_at) AS last_access_at
    FROM entries GROUP BY card_id
  ) SELECT * FROM grouped UNION ALL
   SELECT 'total',NULL,COUNT(grant_id),COUNT(CASE WHEN redeemed_by IS NOT NULL THEN grant_id END),COALESCE(SUM(active),0),
    COUNT(CASE WHEN revoked_at IS NOT NULL THEN grant_id END),COUNT(DISTINCT actor_id),
    COALESCE(SUM(CASE WHEN kind='VIEWED' THEN 1 ELSE 0 END),0),COALESCE(SUM(CASE WHEN kind='DOWNLOADED' THEN 1 ELSE 0 END),0),MAX(created_at) FROM entries`,actor,taskId,now).all()).results;
  const metricKeys=['grants_created','grants_redeemed','active_grants','revoked_grants','unique_reader_accounts','read_requests','download_requests'];
  const metrics=row=>Object.fromEntries([...metricKeys.map(key=>[key,Number(row?.[key]??0)]),['last_access_at',row?.last_access_at??null]]);
  const perCard=new Map(rows.filter(row=>row.row_type==='card').map(row=>[row.card_id,row]));
  const cards=state.cards.map(card=>({card_id:card.id,task_version:card.body.task_version,...metrics(perCard.get(card.id))}));
  return {format:'dossivo-evidence-reuse/0.1',synthetic_only:true,measured_at:now,
   totals:{...metrics(rows.find(row=>row.row_type==='total')),reused_card_versions:cards.filter(card=>card.unique_reader_accounts>=2).length},cards,
   unmeasured:{verified_buyer_companies:null,purchase_acceptances:null,real_commercial_usage:null,status:'NOT_MEASURED'}};
 }
 async createGrant(actor,data,key){
  this.actor(actor);if(typeof key!=='string'||!key||key.length>128)throw new BridgeError('INVALID_INPUT','Idempotency key required');
  if(![48,72].includes(data.hours))throw new BridgeError('INVALID_EXPIRY','Choose 48 or 72 hours');
  const mode=data.access_mode??'TEMPORARY';
  if(!['TEMPORARY','CONTINUOUS_SUMMARY'].includes(mode))throw new BridgeError('INVALID_ACCESS_MODE','Unsupported access mode');
  const policy=data.version_policy??'FIXED';
  if(!['FIXED','FOLLOW_PUBLISHED'].includes(policy)||(policy==='FOLLOW_PUBLISHED'&&mode!=='CONTINUOUS_SUMMARY'))throw new BridgeError('UNSUPPORTED_VERSION_POLICY','Follow published requires a continuous summary');
  if(data.purpose&&data.purpose!=='COMPLIANCE_REVIEW')throw new BridgeError('INVALID_PURPOSE','Only compliance review is supported');
  const choice=chooseDisclosure(data);
  if(mode==='CONTINUOUS_SUMMARY'&&choice.fields.length)throw new BridgeError('INVALID_DISCLOSURE','Continuous summaries cannot disclose precise numeric parameters');
  // Keep the legacy command digest unchanged for old retries.
  const command={op:'create_basic_grant',task_id:data.task_id,card_id:data.card_id,hours:data.hours,choice};
  if(mode==='CONTINUOUS_SUMMARY')command.access_mode=mode;
  if(policy==='FOLLOW_PUBLISHED')command.version_policy=policy;
  const digest=await fingerprint(command);
  const prior=await this.replay(actor,key,digest);if(prior)return {grant:this.meta(await this.owned(actor,prior.grant_id)),code:null,replayed:true};
  const card=await this.exportCard(actor,data.task_id,data.card_id),id=this.uuid();const snapshot=policy==='FOLLOW_PUBLISHED'?await this.publishedProjection(card,choice,id):basicProjection(card,choice),now=this.clock(),code=makeCode(),expires=new Date(Date.parse(now)+data.hours*3600000).toISOString();
  const row={id,task_id:data.task_id,card_id:data.card_id,expires_at:expires,revoked_at:null,redeemed_by:null,created_at:now,choice_json:JSON.stringify(choice),access_mode:mode,purpose:'COMPLIANCE_REVIEW',version_policy:policy,publication_seq:0};
  try{await this.db.batch([
   this.q('INSERT INTO dossivo_basic_grants (id,owner_id,task_id,card_id,code_hash,snapshot_json,snapshot_hash,choice_json,created_at,expires_at,access_mode,purpose,version_policy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',id,actor,data.task_id,data.card_id,await fingerprint({code}),JSON.stringify(snapshot),await fingerprint(snapshot),JSON.stringify(choice),now,expires,mode,'COMPLIANCE_REVIEW',policy),
   this.q('INSERT INTO dossivo_access_operations (id,actor_id,idempotency_key,command_hash,grant_id) VALUES (?,?,?,?,?)',this.uuid(),actor,key,digest,id),
   this.q("INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at) VALUES (?,?,?,'CREATED',?)",this.uuid(),id,actor,now),
  ]);}catch(e){const p=await this.replay(actor,key,digest);if(p)return {grant:this.meta(await this.owned(actor,p.grant_id)),code:null,replayed:true};throw e;}
  return {grant:this.meta(row),code:code.match(/.{1,4}/g).join('-'),replayed:false};
 }
 async publishedProjection(card,choice,grantId){
  const snapshot=basicProjection(card,choice);
  if(!snapshot.synthetic_only)throw new BridgeError('REAL_DATA_DISABLED','Only synthetic summaries are enabled',403);
  snapshot.issue_states=await Promise.all(card.body.flags.map(async f=>({id:await fingerprint({grant_id:grantId,flag_id:f.id}),severity:f.severity,status:f.status})));
  return snapshot;
 }
 async publications(row){
  const initial=JSON.parse(row.snapshot_json);
  if(await fingerprint(initial)!==row.snapshot_hash)throw new BridgeError('INTEGRITY_FAILED','Disclosure snapshot digest mismatch',409);
  const history=[{sequence:0,card_id:row.card_id,snapshot:initial,hash:row.snapshot_hash,published_at:row.created_at}];
  const records=(await this.q('SELECT * FROM dossivo_summary_publications WHERE grant_id=? ORDER BY sequence',row.id).all()).results;
  for(const r of records){
   const previous=history.at(-1),snapshot=JSON.parse(r.snapshot_json);
   if(r.sequence!==previous.sequence+1||r.previous_hash!==previous.hash||await fingerprint(snapshot)!==r.snapshot_hash)throw new BridgeError('INTEGRITY_FAILED','Publication history mismatch',409);
   history.push({sequence:r.sequence,card_id:r.card_id,snapshot,hash:r.snapshot_hash,published_at:r.created_at});
  }
  if(history.at(-1).sequence!==row.publication_seq)throw new BridgeError('VERSION_CONFLICT','Publication changed; refresh',409);
  return history;
 }
 async previewPublication(actor,data){
  const row=await this.owned(actor,data.grant_id);
  if(row.revoked_at||!row.redeemed_by||row.access_mode!=='CONTINUOUS_SUMMARY'||row.version_policy!=='FOLLOW_PUBLISHED')throw UNAVAILABLE();
  const history=await this.publications(row),previous=history.at(-1);
  const card=await this.exportCard(actor,row.task_id,data.card_id),snapshot=await this.publishedProjection(card,JSON.parse(row.choice_json),row.id);
  if(snapshot.task_version<=previous.snapshot.task_version)throw new BridgeError('VERSION_CONFLICT','Publish a newer fixed card',409);
  if(JSON.stringify(snapshot.scope)!==JSON.stringify(history[0].snapshot.scope))throw new BridgeError('SCOPE_CHANGE','A different entity, facility or period needs a new grant',409);
  if(previous.snapshot.issue_states.some(f=>!snapshot.issue_states.some(n=>n.id===f.id)))throw new BridgeError('HISTORY_LOSS','Previously disclosed matters must remain traceable',409);
  return {grant_id:row.id,card_id:card.id,expected_sequence:row.publication_seq,previous_hash:previous.hash,projection_hash:await fingerprint(snapshot),snapshot};
 }
 async publishSummary(actor,data,key){
  this.actor(actor);if(typeof key!=='string'||!key||key.length>128)throw new BridgeError('INVALID_INPUT','Idempotency key required');
  const digest=await fingerprint({op:'publish_summary',grant_id:data.grant_id,card_id:data.card_id,expected_sequence:data.expected_sequence,projection_hash:data.projection_hash});
  const prior=await this.replay(actor,key,digest);if(prior){const row=await this.owned(actor,prior.grant_id);if(row.revoked_at)throw UNAVAILABLE();return {grant:this.meta(row),replayed:true};}
  const preview=await this.previewPublication(actor,data);
  if(preview.expected_sequence!==data.expected_sequence||preview.projection_hash!==data.projection_hash)throw new BridgeError('VERSION_CONFLICT','Preview changed; review before publishing',409);
  const now=this.clock();
  try{await this.db.batch([
   this.q("UPDATE dossivo_basic_grants SET publication_seq=publication_seq+1 WHERE id=? AND owner_id=? AND publication_seq=? AND revoked_at IS NULL AND redeemed_by IS NOT NULL AND version_policy='FOLLOW_PUBLISHED' AND access_mode='CONTINUOUS_SUMMARY'",data.grant_id,actor,data.expected_sequence),
   this.q('INSERT INTO dossivo_task_guards (id,ok) VALUES (?,changes())',this.uuid()),
   this.q('INSERT INTO dossivo_summary_publications (id,grant_id,sequence,card_id,snapshot_json,snapshot_hash,previous_hash,created_at) VALUES (?,?,?,?,?,?,?,?)',this.uuid(),data.grant_id,data.expected_sequence+1,data.card_id,JSON.stringify(preview.snapshot),preview.projection_hash,preview.previous_hash,now),
   this.q('INSERT INTO dossivo_access_operations (id,actor_id,idempotency_key,command_hash,grant_id) VALUES (?,?,?,?,?)',this.uuid(),actor,key,digest,data.grant_id),
   this.q("INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at,card_id) VALUES (?,?,?,'SUMMARY_PUBLISHED',?,?)",this.uuid(),data.grant_id,actor,now,data.card_id),
  ]);}catch(e){const p=await this.replay(actor,key,digest);if(p)return {grant:this.meta(await this.owned(actor,p.grant_id)),replayed:true};if(/CHECK|UNIQUE/.test(String(e)))throw new BridgeError('VERSION_CONFLICT','Grant revoked or publication changed; refresh',409);throw e;}
  return {grant:this.meta(await this.owned(actor,data.grant_id)),replayed:false};
 }
 async revoke(actor,id,key){
  if(typeof key!=='string'||!key||key.length>128)throw new BridgeError('INVALID_INPUT','Idempotency key required');
  const row=await this.owned(actor,id),digest=await fingerprint({op:'revoke_basic_grant',id});if(await this.replay(actor,key,digest))return {grant:this.meta(await this.owned(actor,id)),replayed:true};
  const now=this.clock();await this.db.batch([
   this.q('UPDATE dossivo_basic_grants SET revoked_at=COALESCE(revoked_at,?) WHERE id=? AND owner_id=?',now,id,actor),
   this.q('INSERT INTO dossivo_access_operations (id,actor_id,idempotency_key,command_hash,grant_id) VALUES (?,?,?,?,?)',this.uuid(),actor,key,digest,id),
   this.q("INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at) VALUES (?,?,?,'REVOKED',?)",this.uuid(),id,actor,now),
  ]);return {grant:this.meta(await this.owned(actor,id)),replayed:false};
 }
 async redeem(actor,rawCode,key){
  this.actor(actor);if(typeof key!=='string'||!key||key.length>128)throw new BridgeError('INVALID_INPUT','Idempotency key required');
  const now=this.clock(),bucket=Math.floor(Date.parse(now)/900000);
  const throttle=await this.q('INSERT INTO dossivo_access_attempts (actor_id,bucket,attempts) VALUES (?,?,1) ON CONFLICT(actor_id,bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts',actor,bucket).first();
  if(throttle.attempts>10)throw new BridgeError('RATE_LIMITED','Too many attempts; wait before retrying',429);
  const code=normalizedCode(rawCode),code_hash=await fingerprint({code}),digest=await fingerprint({op:'redeem',code_hash});
  const replay=await this.replay(actor,key,digest);if(replay)return {access:await this.buyerRead(actor,replay.grant_id),replayed:true};
  const row=await this.q('SELECT * FROM dossivo_basic_grants WHERE code_hash=?',code_hash).first();
  if(!row||row.owner_id===actor||row.revoked_at||row.redeemed_by||row.expires_at<=now)throw UNAVAILABLE();
  try{await this.db.batch([
   this.q('UPDATE dossivo_basic_grants SET redeemed_by=?,redeemed_at=? WHERE id=? AND redeemed_by IS NULL AND revoked_at IS NULL AND expires_at>? AND owner_id<>?',actor,now,row.id,now,actor),
   this.q('INSERT INTO dossivo_task_guards (id,ok) VALUES (?,changes())',this.uuid()),
   this.q('INSERT INTO dossivo_access_operations (id,actor_id,idempotency_key,command_hash,grant_id) VALUES (?,?,?,?,?)',this.uuid(),actor,key,digest,row.id),
   this.q("INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at) VALUES (?,?,?,'REDEEMED',?)",this.uuid(),row.id,actor,now),
  ]);}catch(e){const p=await this.replay(actor,key,digest);if(p)return {access:await this.buyerRead(actor,p.grant_id),replayed:true};if(/CHECK|UNIQUE/.test(String(e)))throw UNAVAILABLE();throw e;}
  return {access:await this.buyerRead(actor,row.id),replayed:false};
 }
 async buyerList(actor){this.actor(actor);const rows=(await this.q(`SELECT id,expires_at,access_mode,purpose,snapshot_json FROM dossivo_basic_grants WHERE redeemed_by=? AND revoked_at IS NULL AND ${activeSql} ORDER BY created_at DESC LIMIT 100`,actor,this.clock()).all()).results;
  return rows.map(r=>({id:r.id,expires_at:accessExpiry(r),access_mode:r.access_mode,purpose:r.purpose,organization:JSON.parse(r.snapshot_json).scope.organization}));}
 /** @param {number|null} sequence */
 async buyerRead(actor,id,kind='VIEWED',sequence=null){
  this.actor(actor);if(!['VIEWED','DOWNLOADED'].includes(kind))throw UNAVAILABLE();
  const row=await this.q(`SELECT * FROM dossivo_basic_grants WHERE id=? AND redeemed_by=? AND revoked_at IS NULL AND ${activeSql}`,id,actor,this.clock()).first();if(!row)throw UNAVAILABLE();
  const history=await this.publications(row);
  if(sequence!==null&&(!Number.isSafeInteger(sequence)||sequence<0))throw UNAVAILABLE();
  const selected=sequence===null?history.at(-1):history.find(p=>p.sequence===sequence);if(!selected)throw UNAVAILABLE();
  const snapshot=selected.snapshot;
  // Latest status is deliberately limited to issue counts and version existence; never new body/notes.
  const current=await this.read(row.owner_id,row.task_id),changed=current.version>snapshot.task_version+1;
  const current_status=row.access_mode==='CONTINUOUS_SUMMARY'
   ?{...snapshot.issues,newer_version_exists:changed,review_status:changed?'UPDATE_REVIEW_REQUIRED':'FIXED_SNAPSHOT',counts_basis:'FIXED_SNAPSHOT'}
   :{...issueSummary(current.flags),newer_version_exists:changed};
  // Recheck current authorisation in the same batch as access logging, after reading status.
  await this.db.batch([
   this.q(`INSERT INTO dossivo_task_guards (id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM dossivo_basic_grants WHERE id=? AND redeemed_by=? AND revoked_at IS NULL AND ${activeSql}) THEN 1 ELSE 0 END`,this.uuid(),id,actor,this.clock()),
   this.q('INSERT INTO dossivo_access_events (id,grant_id,actor_id,kind,created_at,card_id) VALUES (?,?,?,?,?,?)',this.uuid(),id,actor,kind,this.clock(),selected.card_id),
  ]).catch(e=>{if(/CHECK/.test(String(e)))throw UNAVAILABLE();throw e;});
  return {grant_id:id,snapshot,current_status,expires_at:accessExpiry(row),redemption_expires_at:row.expires_at,access_mode:row.access_mode,purpose:row.purpose,version_policy:row.version_policy,publication_sequence:selected.sequence,latest_publication_sequence:row.publication_seq,publication_history:history.map(p=>({sequence:p.sequence,card_id:p.card_id,task_version:p.snapshot.task_version,published_at:p.published_at,issues:p.snapshot.issues,issue_states:p.snapshot.issue_states??[]})),checked_at:this.clock(),downloaded_at:kind==='DOWNLOADED'?this.clock():null};
 }
}
