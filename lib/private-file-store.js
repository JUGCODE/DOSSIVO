import {readStoredFile} from './private-file-read.js';
import {BridgeError} from './paci-bridge-core.js';
import {PRIVATE_FILE_LIMIT,PRIVATE_FILE_COUNT,PRIVATE_FILE_TYPES,PRIVATE_FILE_RECOVERY_MS} from './private-file-policy.js';
export {PRIVATE_FILE_LIMIT,PRIVATE_FILE_COUNT} from './private-file-policy.js';
const idPattern=/^[a-zA-Z0-9_-]{1,128}$/;
const deny=(code,status=400)=>{throw new BridgeError(code,code,status);};
export async function fileDigest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function readPrivateFile(request){
 const media=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
 if(!PRIVATE_FILE_TYPES.includes(media))deny('FILE_TYPE_UNSUPPORTED',415);
 if(Number(request.headers.get('content-length'))>PRIVATE_FILE_LIMIT)deny('FILE_TOO_LARGE',413);
 const reader=request.body?.getReader();if(!reader)deny('EMPTY_FILE');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>PRIVATE_FILE_LIMIT){await reader.cancel();deny('FILE_TOO_LARGE',413);}chunks.push(value);}}finally{reader.releaseLock();}
 if(!size)deny('EMPTY_FILE');const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const signature=media==='application/pdf'?[37,80,68,70,45]:media==='image/png'?[137,80,78,71,13,10,26,10]:[255,216,255];
 if(!signature.every((v,i)=>bytes[i]===v))deny('FILE_SIGNATURE_MISMATCH',415);
 // Signature checks are format screening, not malware inspection or proof of authenticity.
 return {bytes,media,size,sha256:await fileDigest(bytes)};
}
function metadata(row){const {id,task_id,filename,media_type,size_bytes,sha256,state,created_at,updated_at}=row;return {id,task_id,filename,media_type,size_bytes,sha256,state,created_at,updated_at,verified:false};}
export class PrivateFileStore{
 constructor(db,bucket){this.db=db;this.bucket=bucket;}
 q(sql,...args){return this.db.prepare(sql).bind(...args);}
 async owner(actor,task){
  if(typeof actor!=='string'||!actor||actor.length>200)deny('AUTH_REQUIRED',401);
  if(typeof task!=='string'||!idPattern.test(task))deny('INVALID_TASK');
  if(!await this.q('SELECT id FROM dossivo_task_heads WHERE id=? AND tenant_id=?',task,actor).first())deny('TASK_NOT_FOUND',404);
 }
 async row(actor,task,id){await this.owner(actor,task);if(!idPattern.test(id??''))deny('FILE_NOT_FOUND',404);const row=await this.q('SELECT * FROM dossivo_private_files WHERE id=? AND owner_id=? AND task_id=?',id,actor,task).first();if(!row)deny('FILE_NOT_FOUND',404);return row;}
 async list(actor,task){await this.owner(actor,task);return (await this.q("SELECT * FROM dossivo_private_files WHERE owner_id=? AND task_id=? AND state!='DELETED' ORDER BY created_at DESC LIMIT 20",actor,task).all()).results.map(metadata);}
 async usage(actor,task){
  await this.owner(actor,task);
  const rows=(await this.q("SELECT task_id,state,COUNT(*) AS count FROM dossivo_private_files WHERE owner_id=? AND state!='DELETED' GROUP BY task_id,state",actor).all()).results;
  const selected={stored:0,uploading:0,deleting:0};let occupied=0;
  for(const row of rows){occupied+=row.count;if(row.task_id===task){const key={STORED_UNREVIEWED:'stored',UPLOADING:'uploading',DELETING:'deleting'}[row.state];if(key)selected[key]+=row.count;}}
  return {account:{occupied,limit:PRIVATE_FILE_COUNT,remaining:Math.max(0,PRIVATE_FILE_COUNT-occupied)},task:selected};
 }
 async history(actor,task,before=''){
  await this.owner(actor,task);
  if(typeof before!=='string'||(before!==''&&(!/^[1-9]\d{0,15}$/.test(before)||!Number.isSafeInteger(Number(before)))))deny('INVALID_CURSOR');
  const cursor=before?Number(before):Number.MAX_SAFE_INTEGER;
  const rows=(await this.q('SELECT sequence,file_id,from_state,to_state,recorded_at FROM dossivo_private_file_events WHERE owner_id=? AND task_id=? AND sequence<? ORDER BY sequence DESC LIMIT 51',actor,task,cursor).all()).results;
  return {events:rows.slice(0,50),next_before:rows.length>50?String(rows[49].sequence):null};
 }
 async upload(actor,task,key,filename,file){
  await this.owner(actor,task);
  if(typeof key!=='string'||!idPattern.test(key))deny('INVALID_REQUEST_KEY');
  if(typeof filename!=='string'||!filename.trim()||filename.length>180||/[\\/\u0000-\u001f\u007f]/.test(filename))deny('INVALID_FILENAME');
  const previous=()=>this.q('SELECT * FROM dossivo_private_files WHERE owner_id=? AND request_key=?',actor,key).first();
  const replay=row=>{if(row.task_id!==task||row.sha256!==file.sha256||row.filename!==filename||row.media_type!==file.media||row.size_bytes!==file.size)deny('IDEMPOTENCY_CONFLICT',409);if(row.state!=='STORED_UNREVIEWED')deny('FILE_NOT_READY',409);return metadata(row);};
  const old=await previous();if(old)return replay(old);
  const id=crypto.randomUUID(),objectKey='private-staging/'+id,now=new Date().toISOString();
  const reserved=await this.q("INSERT INTO dossivo_private_files (id,owner_id,task_id,request_key,object_key,filename,media_type,size_bytes,sha256,state,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,'UPLOADING',?,? WHERE (SELECT COUNT(*) FROM dossivo_private_files WHERE owner_id=? AND state!='DELETED')<? ON CONFLICT(owner_id,request_key) DO NOTHING RETURNING id",id,actor,task,key,objectKey,filename,file.media,file.size,file.sha256,now,now,actor,PRIVATE_FILE_COUNT).first();
  if(!reserved){const old=await previous();if(old)return replay(old);deny('FILE_QUOTA_EXCEEDED',409);}
  try{
   await this.bucket.put(objectKey,file.bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{sha256:file.sha256}});
   const ready=await this.q("UPDATE dossivo_private_files SET state='STORED_UNREVIEWED',updated_at=? WHERE id=? AND owner_id=? AND state='UPLOADING' RETURNING *",new Date().toISOString(),id,actor).first();
   if(!ready)deny('UPLOAD_CANCELLED',409);return metadata(ready);
  }catch(e){
   // Covers failed puts and deletion racing an in-flight put. Failed cleanup stays visible.
   await this.q("UPDATE dossivo_private_files SET state='DELETING',updated_at=? WHERE id=? AND owner_id=?",new Date().toISOString(),id,actor).run();
   try{await this.remove(actor,task,id);}catch{}
   throw e;
  }
 }
 async download(actor,task,id){
  const row=await this.row(actor,task,id);if(row.state!=='STORED_UNREVIEWED')deny('FILE_NOT_READY',409);
  const object=await this.bucket.get(row.object_key);if(!object)deny('FILE_UNAVAILABLE',503);
  if(object.size!==row.size_bytes||object.size>PRIVATE_FILE_LIMIT)deny('FILE_INTEGRITY_FAILED',409);
  const bytes=await readStoredFile(object.body,row.size_bytes);if(await fileDigest(bytes)!==row.sha256)deny('FILE_INTEGRITY_FAILED',409);
  // Recheck after storage access so a completed delete cannot return a stale object.
  if((await this.row(actor,task,id)).state!=='STORED_UNREVIEWED')deny('FILE_NOT_READY',409);
  return {bytes,filename:row.filename};
 }
 async cleanup(actor,task){
  await this.owner(actor,task);
  const cutoff=new Date(Date.now()-PRIVATE_FILE_RECOVERY_MS).toISOString();
  const eligible="(state='DELETING' OR (state='UPLOADING' AND updated_at<=?))";
  const rows=(await this.q(`SELECT id FROM dossivo_private_files WHERE owner_id=? AND task_id=? AND ${eligible} ORDER BY created_at,id LIMIT 20`,actor,task,cutoff).all()).results;
  const result={examined:rows.length,deleted:0,pending:0,skipped:0};
  for(const row of rows){
   try{
    // Recheck eligibility atomically: a just-completed upload must never be removed.
    const claimed=await this.q(`UPDATE dossivo_private_files SET state='DELETING',updated_at=? WHERE id=? AND owner_id=? AND task_id=? AND ${eligible} RETURNING id`,new Date().toISOString(),row.id,actor,task,cutoff).first();
    if(!claimed){result.skipped++;continue;}
    await this.remove(actor,task,row.id);result.deleted++;
   }catch{result.pending++;}
  }
  return result;
 }
 async remove(actor,task,id){
  const row=await this.row(actor,task,id);if(row.state==='DELETED')return {id,state:'DELETED'};
  await this.q("UPDATE dossivo_private_files SET state='DELETING',updated_at=? WHERE id=? AND owner_id=? AND state!='DELETED'",new Date().toISOString(),id,actor).run();
  await this.bucket.delete(row.object_key);
  await this.q("UPDATE dossivo_private_files SET state='DELETED',filename='',updated_at=? WHERE id=? AND owner_id=? AND state='DELETING'",new Date().toISOString(),id,actor).run();
  return {id,state:'DELETED'};
 }
}
