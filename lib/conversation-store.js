import {normalizeEvidenceRequest,evidenceRequestText} from './structured-evidence-request.js';
import {BuyerAccessStore} from './buyer-access-store.js';
import {CommunicationPolicyStore,communicationAvailableSql} from './communication-policy.js';
import {BridgeError,fingerprint} from './paci-bridge-core.js';
const unavailable=()=>new BridgeError('CONVERSATION_UNAVAILABLE','Conversation unavailable',404);
export class ConversationStore extends BuyerAccessStore {
 constructor(db,options={}){super(db,options);this.communicationPolicy=new CommunicationPolicyStore(db,options);}
 regionSql(actorSql){return communicationAvailableSql(actorSql,this.communicationPolicy.regionEnforcement);}
 policy(){return this.communicationPolicy;}
 async communicationAllowed(a,b){return (await this.policy().status(a)).available&&(await this.policy().status(b)).available;}
 async relation(actor,id){
  this.actor(actor);
  if(typeof id==='string'&&id.startsWith('dm_')){
   const c=await this.q('SELECT * FROM dossivo_contacts WHERE id=? AND (owner_id=? OR peer_id=?)',id,actor,actor).first();if(!c)throw unavailable();
   return {id:c.id,owner_id:c.owner_id,redeemed_by:c.peer_id,contact_only:true,send_allowed:!c.owner_blocked&&!c.peer_blocked&&await this.communicationAllowed(c.owner_id,c.peer_id)};
  }
  const g=await this.q('SELECT * FROM dossivo_basic_grants WHERE id=? AND (owner_id=? OR redeemed_by=?)',id,actor,actor).first();
  if(!g||!g.redeemed_by)throw unavailable();
  const state=await this.read(g.owner_id,g.task_id);if(!state.synthetic_only)throw new BridgeError('REAL_DATA_DISABLED','Only synthetic collaboration is enabled',403);
  const blocked=await this.q('SELECT id FROM dossivo_contacts WHERE ((owner_id=? AND peer_id=?) OR (owner_id=? AND peer_id=?)) AND (owner_blocked=1 OR peer_blocked=1)',g.owner_id,g.redeemed_by,g.redeemed_by,g.owner_id).first();
  return {...g,send_allowed:!blocked&&await this.communicationAllowed(g.owner_id,g.redeemed_by)};
 }
 async inbox(actor){
  this.actor(actor);
  const rows=(await this.q(`SELECT c.grant_id,c.status,c.last_sequence,c.created_at,
   COUNT(CASE WHEN m.actor_id<>? AND m.sequence>COALESCE(r.last_read_sequence,0) THEN 1 END) AS unread_count,
   MAX(m.created_at) AS last_message_at
   FROM dossivo_conversations c JOIN dossivo_basic_grants g ON g.id=c.grant_id
   LEFT JOIN dossivo_conversation_messages m ON m.conversation_id=c.id
   LEFT JOIN dossivo_conversation_reads r ON r.conversation_id=c.id AND r.actor_id=?
   WHERE (c.owner_id=? AND g.owner_id=?) OR (c.buyer_id=? AND g.redeemed_by=?)
   GROUP BY c.id ORDER BY MAX(m.created_at) DESC,c.id DESC`,actor,actor,actor,actor,actor,actor).all()).results;
  const conversations=[];
  for(const row of rows){const g=await this.relation(actor,row.grant_id);
   const snapshot=JSON.parse(g.snapshot_json);if(await fingerprint(snapshot)!==g.snapshot_hash)throw new BridgeError('INTEGRITY_FAILED','Disclosure snapshot mismatch',409);
   conversations.push({...row,organization:snapshot.scope.organization,facility:snapshot.scope.facility,period:snapshot.scope.period,buyer:actor===g.redeemed_by,evidence_active:!g.revoked_at&&(g.access_mode==='CONTINUOUS_SUMMARY'||g.expires_at>this.clock())});
  }
  const direct=(await this.q(`SELECT c.contact_id,c.status,c.last_sequence,c.created_at,p.display_name,p.public_id,
   COUNT(CASE WHEN m.actor_id<>? AND m.sequence>COALESCE(r.last_read_sequence,0) THEN 1 END) AS unread_count,MAX(m.created_at) AS last_message_at
   FROM dossivo_conversations c JOIN dossivo_contacts d ON d.id=c.contact_id
   JOIN dossivo_contact_profiles p ON p.actor_id=CASE WHEN d.owner_id=? THEN d.peer_id ELSE d.owner_id END
   LEFT JOIN dossivo_conversation_messages m ON m.conversation_id=c.id
   LEFT JOIN dossivo_conversation_reads r ON r.conversation_id=c.id AND r.actor_id=?
   WHERE (c.owner_id=? AND d.owner_id=?) OR (c.buyer_id=? AND d.peer_id=?) GROUP BY c.id`,actor,actor,actor,actor,actor,actor,actor).all()).results;
  for(const c of direct){const g=await this.relation(actor,c.contact_id);conversations.push({grant_id:c.contact_id,status:c.status,last_sequence:c.last_sequence,created_at:c.created_at,last_message_at:c.last_message_at,unread_count:c.unread_count,organization:c.display_name,public_id:c.public_id,buyer:false,contact_only:true,send_allowed:g.send_allowed,evidence_active:false});}
  conversations.sort((a,b)=>(b.last_message_at??b.created_at).localeCompare(a.last_message_at??a.created_at));
  return {conversations,unread_total:conversations.reduce((n,c)=>n+Number(c.unread_count),0)};
 }
 /** @param {number|null} before */
 async thread(actor,grantId,before=null){
  const g=await this.relation(actor,grantId);
  if(before!==null&&(!Number.isSafeInteger(before)||before<1))throw unavailable();
  const c=await this.q('SELECT * FROM dossivo_conversations WHERE (grant_id=? OR contact_id=?) AND (owner_id=? OR buyer_id=?)',grantId,grantId,actor,actor).first();
  const messages=c?(await this.q('SELECT id,actor_id,kind,body,reply_to,created_at,sequence,evidence_sequence,evidence_card_id,evidence_grant_id,structured_json FROM dossivo_conversation_messages WHERE conversation_id=? AND sequence<? ORDER BY sequence DESC LIMIT 100',c.id,before??Number.MAX_SAFE_INTEGER).all()).results.reverse():[];
  let reference_versions=[];
  if(!g.contact_only&&!g.revoked_at&&(g.access_mode==='CONTINUOUS_SUMMARY'||g.expires_at>this.clock())){
   const history=await this.publications(g);
   const stillActive=await this.q(`SELECT id FROM dossivo_basic_grants WHERE id=? AND (owner_id=? OR redeemed_by=?) AND revoked_at IS NULL AND (access_mode='CONTINUOUS_SUMMARY' OR expires_at>?)`,g.id,actor,actor,this.clock()).first();
   if(stillActive)reference_versions=history.map(p=>({sequence:p.sequence,card_id:p.card_id,task_version:p.snapshot.task_version,published_at:p.published_at}));
  }
  return {contact_only:!!g.contact_only,send_allowed:g.send_allowed!==false,reference_versions,grant_id:grantId,status:c?.status??'NOT_STARTED',buyer:actor===g.redeemed_by,synthetic_only:true,last_sequence:c?.last_sequence??0,has_earlier:messages.length>0&&messages[0].sequence>1,messages:messages.map(m=>({id:m.id,sequence:m.sequence,side:g.contact_only?'CONTACT':m.actor_id===g.owner_id?'SUPPLIER':'BUYER',mine:m.actor_id===actor,kind:m.kind,body:m.body,structured:m.structured_json?JSON.parse(m.structured_json):null,reply_to:m.reply_to,created_at:m.created_at,reference:m.evidence_sequence===null?null:{sequence:m.evidence_sequence,card_id:m.evidence_card_id,...(m.evidence_grant_id?{grant_id:m.evidence_grant_id}:{})}}))};
 }
 /** @param {string|null} before */
 async relatedGrants(actor,contactId,before=null){
  const contact=await this.relation(actor,contactId);
  if(!contact.contact_only)throw unavailable();
  if(before!==null&&(typeof before!=='string'||!before||before.length>128))throw unavailable();
  const peer=actor===contact.owner_id?contact.redeemed_by:contact.owner_id;
  const rows=(await this.q(`SELECT id,owner_id,redeemed_by,snapshot_json,snapshot_hash,access_mode,expires_at,revoked_at
   FROM dossivo_basic_grants WHERE ((owner_id=? AND redeemed_by=?) OR (owner_id=? AND redeemed_by=?))
   AND (? IS NULL OR id<?) ORDER BY id DESC LIMIT 51`,actor,peer,peer,actor,before,before).all()).results;
  const grants=[];
  for(const g of rows.slice(0,50)){
   const snapshot=JSON.parse(g.snapshot_json);if(await fingerprint(snapshot)!==g.snapshot_hash)throw new BridgeError('INTEGRITY_FAILED','Disclosure snapshot mismatch',409);
   grants.push({grant_id:g.id,organization:snapshot.scope.organization,facility:snapshot.scope.facility,period:snapshot.scope.period,
    buyer:actor===g.redeemed_by,contact_only:false,access_mode:g.access_mode,
    evidence_active:!g.revoked_at&&(g.access_mode==='CONTINUOUS_SUMMARY'||g.expires_at>this.clock())});
  }
  return {grants,next_before:rows.length>50?grants.at(-1).grant_id:null};
 }
 /** @param {number|null} before */
 async requests(actor,grantId,before=null){
  await this.relation(actor,grantId);
  if(before!==null&&(!Number.isSafeInteger(before)||before<1))throw unavailable();
  const c=await this.q('SELECT id FROM dossivo_conversations WHERE (grant_id=? OR contact_id=?) AND (owner_id=? OR buyer_id=?)',grantId,grantId,actor,actor).first();
  if(!c)return {requests:[],next_before:null};
  // Request pagination is independent of the message window. Latest response uses sequence, not wall-clock ties.
  const rows=(await this.q(`SELECT q.id,q.actor_id,q.sequence,q.created_at,q.structured_json,
   r.id AS response_id,r.sequence AS response_sequence,r.created_at AS responded_at,r.structured_json AS response_json,
   r.evidence_sequence,r.evidence_card_id,r.evidence_grant_id
   FROM dossivo_conversation_messages q LEFT JOIN dossivo_conversation_messages r ON r.id=(
    SELECT a.id FROM dossivo_conversation_messages a WHERE a.conversation_id=q.conversation_id AND a.reply_to=q.id
     AND a.actor_id<>q.actor_id AND json_extract(a.structured_json,'$.type')='RESPONSE' ORDER BY a.sequence DESC LIMIT 1)
   WHERE q.conversation_id=? AND q.sequence<? AND json_extract(q.structured_json,'$.type')='REQUEST'
   ORDER BY q.sequence DESC LIMIT 51`,c.id,before??Number.MAX_SAFE_INTEGER).all()).results;
  const page=rows.slice(0,50);
  return {requests:page.map(q=>({id:q.id,sequence:q.sequence,mine:q.actor_id===actor,created_at:q.created_at,
   request:JSON.parse(q.structured_json),status:q.response_json?JSON.parse(q.response_json).status:'AWAITING_RESPONSE',
   response:q.response_id?{id:q.response_id,sequence:q.response_sequence,created_at:q.responded_at,reference:q.evidence_sequence===null?null:{sequence:q.evidence_sequence,card_id:q.evidence_card_id,...(q.evidence_grant_id?{grant_id:q.evidence_grant_id}:{})}}:null})),next_before:rows.length>50?page.at(-1).sequence:null};
 }
 // Export one request and its complete structured response history, never evidence bodies or free text.
 async requestRecord(actor,grantId,requestId){
  await this.relation(actor,grantId);
  if(typeof requestId!=='string'||!requestId||requestId.length>128)throw unavailable();
  const q=await this.q(`SELECT m.id,m.sequence,m.actor_id,m.created_at,m.structured_json,m.conversation_id
   FROM dossivo_conversation_messages m JOIN dossivo_conversations c ON c.id=m.conversation_id
   WHERE (c.grant_id=? OR c.contact_id=?) AND (c.owner_id=? OR c.buyer_id=?) AND m.id=?
   AND json_extract(m.structured_json,'$.type')='REQUEST'`,grantId,grantId,actor,actor,requestId).first();
  if(!q)throw unavailable();
  // One statement captures the response history and grant states. A hard cap fails explicitly, never silently truncates.
  const checkedAt=this.clock();
  const rows=(await this.q(`SELECT m.id,m.sequence,m.created_at,m.structured_json,m.evidence_sequence,m.evidence_card_id,
   CASE WHEN m.evidence_sequence IS NOT NULL THEN COALESCE(m.evidence_grant_id,c.grant_id) END AS reference_grant_id,
   CASE WHEN g.id IS NULL THEN 'UNAVAILABLE' WHEN g.revoked_at IS NOT NULL THEN 'REVOKED'
    WHEN g.access_mode<>'CONTINUOUS_SUMMARY' AND g.expires_at<=? THEN 'EXPIRED' ELSE 'ACTIVE' END AS access_status
   FROM dossivo_conversation_messages m JOIN dossivo_conversations c ON c.id=m.conversation_id
   LEFT JOIN dossivo_basic_grants g ON g.id=COALESCE(m.evidence_grant_id,c.grant_id)
    AND ((g.owner_id=c.owner_id AND g.redeemed_by=c.buyer_id) OR (g.owner_id=c.buyer_id AND g.redeemed_by=c.owner_id))
   WHERE m.conversation_id=? AND m.reply_to=? AND m.actor_id<>?
    AND json_extract(m.structured_json,'$.type')='RESPONSE' ORDER BY m.sequence ASC LIMIT 501`,checkedAt,q.conversation_id,q.id,q.actor_id).all()).results;
  if(rows.length>500)throw new BridgeError('EXPORT_TOO_LARGE','Request history exceeds the 500-response export limit; no partial report was generated',413);
  return {schema:'dossivo/request-record/1',synthetic_only:true,generated_at:checkedAt,conversation_id:grantId,
   complete:true,scope:'ONE_REQUEST_STRUCTURED_RESPONSES',request:{id:q.id,sequence:q.sequence,mine:q.actor_id===actor,created_at:q.created_at,...JSON.parse(q.structured_json)},
   latest_status:rows.length?JSON.parse(rows.at(-1).structured_json).status:'AWAITING_RESPONSE',
   responses:rows.map(m=>({id:m.id,sequence:m.sequence,created_at:m.created_at,status:JSON.parse(m.structured_json).status,
    reference:m.evidence_sequence===null?null:{grant_id:m.reference_grant_id,sequence:m.evidence_sequence,card_id:m.evidence_card_id,access_status:m.access_status,checked_at:checkedAt}})),
   limitations:['HISTORICAL_RECORD_NOT_COMPLIANCE_CERTIFICATION','NO_EVIDENCE_CONTENT_INCLUDED','ACCESS_STATUS_AT_EXPORT_ONLY','EVIDENCE_REQUIRES_CURRENT_AUTHORIZATION','DOWNLOADED_COPIES_CANNOT_BE_RECALLED','NOT_SIGNED_OR_CHAIN_VERIFIED']};
 }
 async markRead(actor,data){
  await this.relation(actor,data.grant_id);
  const row=await this.q(`SELECT c.id,m.sequence FROM dossivo_conversations c JOIN dossivo_conversation_messages m ON m.conversation_id=c.id WHERE (c.grant_id=? OR c.contact_id=?) AND m.id=? AND (c.owner_id=? OR c.buyer_id=?)`,data.grant_id,data.grant_id,data.through_message_id,actor,actor).first();if(!row)throw unavailable();
  await this.db.batch([this.q('INSERT INTO dossivo_conversation_reads(conversation_id,actor_id,last_read_sequence,updated_at) VALUES(?,?,?,?) ON CONFLICT(conversation_id,actor_id) DO UPDATE SET last_read_sequence=MAX(last_read_sequence,excluded.last_read_sequence),updated_at=excluded.updated_at',row.id,actor,row.sequence,this.clock())]);
  const saved=await this.q('SELECT last_read_sequence FROM dossivo_conversation_reads WHERE conversation_id=? AND actor_id=?',row.id,actor).first();
  return {read_through_sequence:saved.last_read_sequence};
 }
 async reference(actor,grantId,messageId,kind='VIEWED'){
  let g=await this.relation(actor,grantId);
  if(!['VIEWED','DOWNLOADED'].includes(kind))throw unavailable();
  const m=await this.q('SELECT m.evidence_sequence,m.evidence_card_id,m.evidence_grant_id FROM dossivo_conversation_messages m JOIN dossivo_conversations c ON c.id=m.conversation_id WHERE (c.grant_id=? OR c.contact_id=?) AND m.id=?',grantId,grantId,messageId).first();if(!m||m.evidence_sequence===null)throw unavailable();
  if(g.contact_only){
   if(!m.evidence_grant_id)throw unavailable();
   const peer=actor===g.owner_id?g.redeemed_by:g.owner_id;
   const target=await this.relation(actor,m.evidence_grant_id);
   if(target.contact_only||!((target.owner_id===actor&&target.redeemed_by===peer)||(target.owner_id===peer&&target.redeemed_by===actor)))throw unavailable();
   g=target;
  }
  const history=await this.publications(g),selected=history.find(p=>p.sequence===m.evidence_sequence&&p.card_id===m.evidence_card_id);if(!selected)throw new BridgeError('INTEGRITY_FAILED','Reference identity mismatch',409);
  if(actor===g.redeemed_by)return this.buyerRead(actor,g.id,kind,m.evidence_sequence);
  const current=await this.read(g.owner_id,g.task_id),changed=current.version>selected.snapshot.task_version+1;
  // Supplier sees the same authorised projection, never exportCard's private body.
  await this.db.batch([this.q(`INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM dossivo_basic_grants WHERE id=? AND owner_id=? AND revoked_at IS NULL AND (access_mode='CONTINUOUS_SUMMARY' OR expires_at>?)) THEN 1 ELSE 0 END`,this.uuid(),g.id,actor,this.clock())]).catch(e=>{if(/CHECK/.test(String(e)))throw new BridgeError('ACCESS_UNAVAILABLE','Evidence access unavailable',404);throw e;});
  return {grant_id:g.id,snapshot:selected.snapshot,publication_sequence:selected.sequence,latest_publication_sequence:g.publication_seq,expires_at:g.access_mode==='CONTINUOUS_SUMMARY'?null:g.expires_at,access_mode:g.access_mode,current_status:{...selected.snapshot.issues,review_status:changed?'UPDATE_REVIEW_REQUIRED':'FIXED_SNAPSHOT',newer_version_exists:changed,counts_basis:'FIXED_SNAPSHOT'},checked_at:this.clock(),downloaded_at:kind==='DOWNLOADED'?this.clock():null};
 }
 async send(actor,data,key){
  const structured=data.structured===undefined?null:normalizeEvidenceRequest(data.structured);
  const external=data.evidence_grant_id??null;
  if(external!==null&&(typeof external!=='string'||!external||external.length>128||structured?.type!=='RESPONSE'||structured.status!=='CARD_SHARED'))throw new BridgeError('INVALID_INPUT','Separate grant is only allowed for a card response');
  if(structured){
   if(data.body!==undefined||data.kind!==undefined)throw new BridgeError('INVALID_INPUT','Structured text and kind are generated by the server');
   if(structured.type==='REQUEST'&&(data.reply_to||data.evidence_sequence!==undefined))throw new BridgeError('INVALID_INPUT','Request cannot attach evidence or be a reply');
   if(structured.type==='RESPONSE'&&structured.status==='CARD_SHARED'&&(!Number.isSafeInteger(data.evidence_sequence)||data.evidence_sequence<0))throw new BridgeError('INVALID_INPUT','Choose an authorised card version');
   if(structured.type==='RESPONSE'&&structured.status!=='CARD_SHARED'&&data.evidence_sequence!==undefined)throw new BridgeError('INVALID_INPUT','Only card response attaches evidence');
   data={...data,kind:structured.type==='REQUEST'?'REQUEST':'REPLY',body:evidenceRequestText(structured)};
  }
  const g=await this.relation(actor,data.grant_id);
  await this.policy().require(actor);await this.policy().requirePeer(actor===g.owner_id?g.redeemed_by:g.owner_id);
  if(data.synthetic_only!==true)throw new BridgeError('REAL_DATA_DISABLED','Confirm synthetic content only',403);
  if(typeof key!=='string'||!key||key.length>128||typeof data.body!=='string'||!data.body.trim()||data.body.length>2000)throw new BridgeError('INVALID_INPUT','Message and idempotency key required');
  if(!['REQUEST','REPLY','NOTE','RECEIVED'].includes(data.kind))throw new BridgeError('INVALID_INPUT','Unsupported message kind');
  if(data.kind==='REQUEST'&&!g.contact_only&&actor!==g.redeemed_by)throw new BridgeError('INVALID_ACTION','Only the buyer creates requests');
  const reply=data.reply_to??null;
  if(['REPLY','RECEIVED'].includes(data.kind)&&!reply)throw new BridgeError('INVALID_INPUT','Select the message being answered');
  if(!g.contact_only&&external!==null)throw new BridgeError('INVALID_INPUT','Separate grant requires a contact conversation');
  if(g.contact_only&&(!g.send_allowed||data.evidence_sequence!==undefined&&data.evidence_sequence!==null&&external===null))throw new BridgeError('CONVERSATION_READ_ONLY','Contact blocked or evidence not authorised',403);
  if(g.send_allowed===false)throw new BridgeError('CONVERSATION_READ_ONLY','Contact blocked',403);
  const ref=data.evidence_sequence??null;
  if(ref!==null&&(!Number.isSafeInteger(ref)||ref<0))throw unavailable();
  const command={grant_id:data.grant_id,kind:data.kind,body:data.body.trim(),reply_to:reply};if(ref!==null)command.evidence_sequence=ref;
  if(structured)command.structured=structured;
  if(external!==null)command.evidence_grant_id=external;
  const hash=await fingerprint(command);
  const replay=async()=>{const p=await this.q('SELECT command_hash FROM dossivo_conversation_messages WHERE actor_id=? AND idempotency_key=?',actor,key).first();if(p&&p.command_hash!==hash)throw new BridgeError('IDEMPOTENCY_CONFLICT','Same key, different message',409);return p;};
  if(await replay())return this.thread(actor,g.id);
  const c=await this.q('SELECT * FROM dossivo_conversations WHERE grant_id=? OR contact_id=?',g.id,g.id).first();
  if(reply&&(!c||!await this.q('SELECT id FROM dossivo_conversation_messages WHERE id=? AND conversation_id=?',reply,c.id).first()))throw unavailable();
  let requestTarget=null;
  if(structured?.type==='RESPONSE'){
   const target=c&&await this.q('SELECT actor_id,structured_json FROM dossivo_conversation_messages WHERE id=? AND conversation_id=?',reply,c.id).first();
   if(!target||target.actor_id===actor||!target.structured_json||JSON.parse(target.structured_json).type!=='REQUEST')throw new BridgeError('INVALID_INPUT','Respond to the other participant’s structured request');
   requestTarget=target;
  }
  if(c&&c.status!=='ACTIVE')throw new BridgeError('CONVERSATION_READ_ONLY','Conversation closed',403);
  let cardId=null,evidenceGrant=g;
  if(external!==null){
   evidenceGrant=await this.relation(actor,external);
   if(evidenceGrant.contact_only||evidenceGrant.owner_id!==actor||evidenceGrant.redeemed_by!==requestTarget?.actor_id)throw new BridgeError('ACCESS_UNAVAILABLE','Choose your grant already redeemed by the requester',404);
  }
  if(ref!==null){
   if(evidenceGrant.revoked_at||(evidenceGrant.access_mode!=='CONTINUOUS_SUMMARY'&&evidenceGrant.expires_at<=this.clock()))throw new BridgeError('ACCESS_UNAVAILABLE','Evidence access unavailable',404);
   const history=await this.publications(evidenceGrant),selected=history.find(p=>p.sequence===ref);if(!selected)throw unavailable();
   if(external!==null&&selected.snapshot.scope.period!==JSON.parse(requestTarget.structured_json).period)throw new BridgeError('PERIOD_MISMATCH','Card period must match the request');
   cardId=selected.card_id;
  }
  const id=c?.id??this.uuid(),now=this.clock();
  try{await this.db.batch([
   this.q("INSERT INTO dossivo_conversations(id,grant_id,contact_id,owner_id,buyer_id,status,created_at) VALUES(?,?,?,?,?,'ACTIVE',?) ON CONFLICT DO NOTHING",id,g.contact_only?null:g.id,g.contact_only?g.id:null,g.owner_id,g.redeemed_by,now),
   this.q(`UPDATE dossivo_conversations SET last_sequence=last_sequence+1 WHERE (grant_id=? OR contact_id=?) AND status='ACTIVE' AND (owner_id=? OR buyer_id=?)
    AND ${this.regionSql('dossivo_conversations.owner_id')} AND ${this.regionSql('dossivo_conversations.buyer_id')}
    AND NOT EXISTS(SELECT 1 FROM dossivo_contacts b WHERE ((b.owner_id=dossivo_conversations.owner_id AND b.peer_id=dossivo_conversations.buyer_id) OR (b.peer_id=dossivo_conversations.owner_id AND b.owner_id=dossivo_conversations.buyer_id)) AND (b.owner_blocked=1 OR b.peer_blocked=1))
    AND (contact_id IS NULL OR EXISTS(SELECT 1 FROM dossivo_contacts d WHERE d.id=contact_id AND d.owner_blocked=0 AND d.peer_blocked=0))
    AND (? IS NULL OR EXISTS(SELECT 1 FROM dossivo_basic_grants g WHERE g.id=grant_id AND g.revoked_at IS NULL AND (g.access_mode='CONTINUOUS_SUMMARY' OR g.expires_at>?)))`,g.id,g.id,actor,actor,g.contact_only?null:ref,now),
   this.q('INSERT INTO dossivo_task_guards(id,ok) VALUES(?,changes())',this.uuid()),
   this.q(`INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN ? IS NULL OR EXISTS(SELECT 1 FROM dossivo_basic_grants WHERE id=? AND owner_id=? AND redeemed_by=? AND revoked_at IS NULL AND (access_mode='CONTINUOUS_SUMMARY' OR expires_at>?)) THEN 1 ELSE 0 END`,this.uuid(),external,external,actor,requestTarget?.actor_id??null,now),
   this.q('INSERT INTO dossivo_conversation_messages(id,conversation_id,actor_id,kind,body,reply_to,created_at,idempotency_key,command_hash,sequence,evidence_sequence,evidence_card_id,evidence_grant_id,structured_json) SELECT ?,id,?,?,?,?,?,?,?,last_sequence,?,?,?,? FROM dossivo_conversations WHERE grant_id=? OR contact_id=?',this.uuid(),actor,data.kind,data.body.trim(),reply,now,key,hash,ref,cardId,external,structured?JSON.stringify(structured):null,g.id,g.id),
  ]);}catch(e){if(await replay())return this.thread(actor,g.id);if(/CHECK/.test(String(e)))throw unavailable();throw e;}
  return this.thread(actor,g.id);
 }
}
