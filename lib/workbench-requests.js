import {ConversationStore} from './conversation-store.js';
import {BridgeError} from './paci-bridge-core.js';
export class WorkbenchRequests extends ConversationStore {
 /** @param {string|null} before */
 async queue(actor,before=null){
  this.actor(actor);
  if(before!==null&&(typeof before!=='string'||!before||before.length>128))throw new BridgeError('INVALID_INPUT','Invalid cursor');
  const rows=(await this.q(`SELECT q.id,q.sequence,q.created_at,q.structured_json,c.grant_id,c.contact_id,
   CASE WHEN g.owner_id=? THEN g.task_id ELSE b.task_id END AS task_id,
   r.structured_json AS response_json,r.created_at AS responded_at
   FROM dossivo_conversation_messages q JOIN dossivo_conversations c ON c.id=q.conversation_id
   LEFT JOIN dossivo_basic_grants g ON g.id=c.grant_id
   LEFT JOIN dossivo_request_tasks b ON b.request_id=q.id AND b.actor_id=?
   LEFT JOIN dossivo_conversation_messages r ON r.id=(SELECT a.id FROM dossivo_conversation_messages a
    WHERE a.conversation_id=c.id AND a.reply_to=q.id AND a.actor_id=? AND json_extract(a.structured_json,'$.type')='RESPONSE' ORDER BY a.sequence DESC LIMIT 1)
   WHERE (c.owner_id=? OR c.buyer_id=?) AND q.actor_id<>? AND json_extract(q.structured_json,'$.type')='REQUEST'
   AND (? IS NULL OR q.id<?) ORDER BY q.id DESC LIMIT 51`,actor,actor,actor,actor,actor,actor,before,before).all()).results;
  return {requests:rows.slice(0,50).map(q=>({id:q.id,sequence:q.sequence,created_at:q.created_at,request:JSON.parse(q.structured_json),conversation_id:q.contact_id??q.grant_id,task_id:q.task_id??null,status:q.response_json?JSON.parse(q.response_json).status:'AWAITING_RESPONSE',responded_at:q.responded_at})),next_before:rows.length>50?rows[49].id:null};
 }
 async bind(actor,data){
  this.actor(actor);
  if(typeof data.request_id!=='string'||typeof data.task_id!=='string')throw new BridgeError('INVALID_INPUT','Request and task required');
  const target=await this.q(`SELECT q.actor_id,q.structured_json,c.contact_id,c.owner_id,c.buyer_id FROM dossivo_conversation_messages q JOIN dossivo_conversations c ON c.id=q.conversation_id WHERE q.id=? AND (c.owner_id=? OR c.buyer_id=?)`,data.request_id,actor,actor).first();
  if(!target||target.actor_id===actor||!target.contact_id||!target.structured_json||JSON.parse(target.structured_json).type!=='REQUEST')throw new BridgeError('REQUEST_UNAVAILABLE','Request unavailable',404);
  const state=await this.read(actor,data.task_id);
  if(state.outcome.period!==JSON.parse(target.structured_json).period)throw new BridgeError('SCOPE_MISMATCH','Task period must match request period',409);
  // An explicit association is private to the responding actor and never changes evidence access.
  await this.q('INSERT INTO dossivo_request_tasks(request_id,actor_id,task_id,created_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING',data.request_id,actor,data.task_id,this.clock()).run();
  const binding=await this.q('SELECT task_id FROM dossivo_request_tasks WHERE request_id=? AND actor_id=?',data.request_id,actor).first();
  if(binding.task_id!==data.task_id)throw new BridgeError('REQUEST_ALREADY_LINKED','Request already linked to another task',409);
  return {request_id:data.request_id,task_id:binding.task_id};
 }
}
