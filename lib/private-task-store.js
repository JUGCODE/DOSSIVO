import { BridgeError, fingerprint } from './paci-bridge-core.js';
import { initialTask, required, transitionTask } from './private-task-core.js';
export class PrivateTaskStore {
  constructor(db, options={}) {this.db=db;this.uuid=options.uuid??(()=>crypto.randomUUID());this.clock=options.clock??(()=>new Date().toISOString());}
  q(sql,...args) {return this.db.prepare(sql).bind(...args);}
  actor(actor) {return required(actor,'actor',200);}
  async list(actor) {this.actor(actor);const rows=(await this.q('SELECT id, title, version, updated_at FROM dossivo_task_heads WHERE tenant_id=? ORDER BY updated_at DESC LIMIT 50',actor).all()).results;return Promise.all(rows.map(async row=>({...row,period:(await this.read(actor,row.id,row.version)).outcome.period})));}
  async matching(actor,period,before='') {
    this.actor(actor);
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)||typeof before!=='string'||before.length>128)throw new BridgeError('INVALID_INPUT','Invalid month or cursor');
    const rows=(await this.q("SELECT h.id,h.title,h.version,h.updated_at FROM dossivo_task_heads h JOIN dossivo_task_versions v ON v.task_id=h.id AND v.tenant_id=h.tenant_id AND v.version=h.version WHERE h.tenant_id=? AND json_extract(v.body_json,'$.outcome.period')=? AND (?='' OR h.id<?) ORDER BY h.id DESC LIMIT 51",actor,period,before,before).all()).results;
    const tasks=await Promise.all(rows.slice(0,50).map(async row=>({...row,period:(await this.read(actor,row.id,row.version)).outcome.period})));
    return {tasks,next_before:rows.length>50?rows[49].id:null};
  }
  async read(actor,id,version=null) {
    this.actor(actor);const head=await this.q('SELECT version FROM dossivo_task_heads WHERE id=? AND tenant_id=?',id,actor).first();
    if(!head)throw new BridgeError('TASK_NOT_FOUND','Task unavailable',404);
    const row=await this.q('SELECT body_json, body_hash FROM dossivo_task_versions WHERE task_id=? AND tenant_id=? AND version=?',id,actor,version??head.version).first();
    if(!row)throw new BridgeError('VERSION_NOT_FOUND','Version unavailable',404);
    const state=JSON.parse(row.body_json);if(await fingerprint(state)!==row.body_hash)throw new BridgeError('INTEGRITY_FAILED','Stored task digest mismatch',409);return state;
  }
  async command(actor,cmd) {
    this.actor(actor); cmd=Object.fromEntries(Object.entries(cmd).filter(([,v])=>v!==undefined)); const key=required(cmd.idempotency_key,'idempotency_key',128), hash=await fingerprint(cmd);
    const replay=async()=>{const op=await this.q('SELECT command_hash, task_id, version FROM dossivo_task_operations WHERE tenant_id=? AND idempotency_key=?',actor,key).first();if(op&&op.command_hash!==hash)throw new BridgeError('IDEMPOTENCY_CONFLICT','Same key, different command',409);return op;};
    const prev=await replay();if(prev)return {state:await this.read(actor,prev.task_id),replayed:true};
    const now=this.clock(),opId=this.uuid();let state, before=null; const sql=[];
    if(cmd.action==='create') {
      state=initialTask(cmd.data??{},this.uuid(),now);
      sql.push(this.q('INSERT INTO dossivo_task_heads (id,tenant_id,title,version,last_operation_id,updated_at) VALUES (?,?,?,1,?,?)',state.task_id,actor,state.outcome.purpose,opId,now));
    }else {
      before=await this.read(actor,required(cmd.task_id,'task_id'));
      if(cmd.expected_version!==before.version)throw new BridgeError('VERSION_CONFLICT','Task changed; refresh',409);
      state=await transitionTask(before,cmd,actor,now,this.uuid);
      sql.push(this.q('UPDATE dossivo_task_heads SET version=?,last_operation_id=?,updated_at=? WHERE id=? AND tenant_id=? AND version=?',state.version,opId,now,state.task_id,actor,before.version));
      // Abort the entire D1 batch on a stale CAS, including every subsequent side effect.
      sql.push(this.q('INSERT INTO dossivo_task_guards (id,ok) VALUES (?,changes())',opId));
    }
    sql.push(this.q('INSERT INTO dossivo_task_versions (task_id,tenant_id,version,body_json,body_hash,created_at) VALUES (?,?,?,?,?,?)',state.task_id,actor,state.version,JSON.stringify(state),await fingerprint(state),now));
    sql.push(this.q('INSERT INTO dossivo_task_operations (id,tenant_id,idempotency_key,command_hash,task_id,version,created_at) VALUES (?,?,?,?,?,?,?)',opId,actor,key,hash,state.task_id,state.version,now));
    if(cmd.action==='freeze_card') {
      const card=state.cards.at(-1);
      sql.push(this.q("INSERT INTO dossivo_task_outbox (operation_id,tenant_id,task_id,task_version,card_id,card_hash,state,created_at) VALUES (?,?,?,?,?,?,'PENDING',?)",opId,actor,state.task_id,state.version,card.id,card.sha256,now));
    }
    try{await this.db.batch(sql);}catch(e){const r=await replay();if(r)return {state:await this.read(actor,r.task_id),replayed:true};if(/UNIQUE|CHECK/.test(String(e)))throw new BridgeError('VERSION_CONFLICT','Concurrent update; refresh',409);throw e;}
    return {state,replayed:false};
  }
  async outbox(actor,id) {await this.read(actor,id);return (await this.q('SELECT operation_id,task_version,card_id,card_hash,state,created_at FROM dossivo_task_outbox WHERE tenant_id=? AND task_id=? ORDER BY created_at',actor,id).all()).results;}
  async exportCard(actor,id,cardId) {
    const state=await this.read(actor,id), card=state.cards.find(c=>c.id===cardId);if(!card)throw new BridgeError('CARD_NOT_FOUND','Card unavailable',404);
    if(await fingerprint(card.body)!==card.sha256)throw new BridgeError('INTEGRITY_FAILED','Card digest mismatch',409);
    return {...card,notice:'Private synthetic preparation only. Local hash equality is not authenticated provenance, PACI registration, an on-chain proof or independent verification. No latest-state guarantee offline.'};
  }
}
