import {PrivateTaskStore} from './private-task-store.js';
import {BridgeError,fingerprint} from './paci-bridge-core.js';
import {PaciRegistrationClient,registrationEnvelope,TransportError} from './paci-http-client.js';
export class TaskRegistrationStore extends PrivateTaskStore {
 async sync(actor,taskId,operationId,binding,options={}) {
  await this.read(actor,taskId);
  if(!binding)throw new TransportError('PACI_NOT_CONFIGURED',false,503);
  const item=await this.q('SELECT * FROM dossivo_task_outbox WHERE operation_id=? AND tenant_id=? AND task_id=?',operationId,actor,taskId).first();
  if(!item)throw new BridgeError('REQUEST_NOT_FOUND','Outbox request unavailable',404);
  const card=await this.exportCard(actor,taskId,item.card_id);
  if(item.card_hash!==card.sha256)throw new BridgeError('INTEGRITY_FAILED','Outbox does not bind this card',409);
  const manifest={synthetic_demo:true,dossier_id:item.card_id,case_version:card.body.task_version,records:[{client_record_ref:item.card_id,record:{content:{synthetic_demo:true,preparation:card.body,card_sha256:card.sha256,originals_included:false},summary:{synthetic_demo:true,task_version:card.body.task_version,formal_card:false}}}]};
  const envelope=await registrationEnvelope(operationId,manifest,actor,binding),digest=await fingerprint(envelope);
  await this.q("INSERT OR IGNORE INTO dossivo_task_deliveries (operation_id,tenant_id,task_id,envelope_json,envelope_hash,state,updated_at) VALUES (?,?,?,?,?,'PREPARED',?)",operationId,actor,taskId,JSON.stringify(envelope),digest,this.clock()).run();
  const row=await this.q('SELECT * FROM dossivo_task_deliveries WHERE operation_id=? AND tenant_id=? AND task_id=?',operationId,actor,taskId).first();
  if(!row||row.envelope_hash!==digest||await fingerprint(JSON.parse(row.envelope_json))!==digest)throw new TransportError('PACI_BINDING_OR_PAYLOAD_CHANGED',false,409);
  try{
   const reply=await new PaciRegistrationClient(binding,options).registerOrRecover(envelope);
   if(row.record_id&&(row.record_id!==reply.record_id||row.remote_operation_id!==reply.operation_id))throw new TransportError('PACI_RECEIPT_CHANGED',false,409);
   await this.db.batch([
    this.q("UPDATE dossivo_task_deliveries SET state='REGISTERED',record_id=?,record_version=?,remote_operation_id=?,receipt_json=?,last_error=NULL,updated_at=? WHERE operation_id=? AND tenant_id=? AND envelope_hash=? AND (record_id IS NULL OR (record_id=? AND remote_operation_id=?))",reply.record_id,reply.record_version,reply.operation_id,JSON.stringify(reply.receipt),this.clock(),operationId,actor,digest,reply.record_id,reply.operation_id),
    this.q("UPDATE dossivo_task_outbox SET state='REGISTERED' WHERE operation_id=? AND tenant_id=? AND EXISTS(SELECT 1 FROM dossivo_task_deliveries WHERE operation_id=? AND tenant_id=? AND state='REGISTERED' AND record_id=? AND remote_operation_id=?)",operationId,actor,operationId,actor,reply.record_id,reply.operation_id),
   ]);
   const saved=await this.q('SELECT * FROM dossivo_task_deliveries WHERE operation_id=? AND tenant_id=?',operationId,actor).first();
   if(saved.state!=='REGISTERED'||saved.record_id!==reply.record_id||saved.remote_operation_id!==reply.operation_id)throw new TransportError('PACI_RECEIPT_CHANGED',false,409);
   return {registration:'REGISTERED',verification:'UNVERIFIED',chain_status:'NOT_CONNECTED',formal_card:false};
  }catch(e){await this.db.batch([
   this.q("UPDATE dossivo_task_deliveries SET state='UNCONFIRMED',last_error=?,updated_at=? WHERE operation_id=? AND tenant_id=?",e instanceof TransportError?e.code:'PACI_CONFIRMATION_UNAVAILABLE',this.clock(),operationId,actor),
   this.q("UPDATE dossivo_task_outbox SET state='PENDING' WHERE operation_id=? AND tenant_id=?",operationId,actor),
  ]);if(e instanceof TransportError)throw e;throw new TransportError('PACI_CONFIRMATION_UNAVAILABLE',true);}
 }
}
