import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {privateFileRequest} from '../lib/private-file-request.js';
import {PRIVATE_FILE_LIMIT} from '../lib/private-file-store.js';
const origin='https://dossivo.example';
const pdf=new TextEncoder().encode('%PDF-1.4\nSynthetic test fixture only\n%%EOF');
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 sql.prepare('INSERT INTO dossivo_task_heads(id,tenant_id,title,version,last_operation_id,updated_at) VALUES(?,?,?,1,?,?)').run('task-A','owner','Synthetic','op','2026-11-07');
 sql.prepare('INSERT INTO dossivo_task_heads(id,tenant_id,title,version,last_operation_id,updated_at) VALUES(?,?,?,1,?,?)').run('task-B','buyer','Synthetic','op2','2026-11-07');
 let beforeClaim=null;
 const db={prepare(s){return {bind(...v){return {async first(){if(beforeClaim&&s.startsWith("UPDATE dossivo_private_files SET state='DELETING'")&&s.includes('RETURNING id')){const fn=beforeClaim;beforeClaim=null;fn();}return sql.prepare(s).get(...v)??null;},async all(){return {results:sql.prepare(s).all(...v)};},async run(){return sql.prepare(s).run(...v);}};}};}};
 const objects=new Map();let putHook=null,deleteFails=false,putFails=false,puts=0;
 const bucket={async put(k,b){puts++;if(putFails)throw Error('secret storage provider failure');if(putHook)await putHook();objects.set(k,new Uint8Array(b));},async get(k){const b=objects.get(k);return b?{size:b.length,body:new Response(b).body,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}:null;},async delete(k){if(deleteFails)throw Error('secret deletion failure');objects.delete(k);}};
 const request=({method='GET',actor='owner',task='task-A',file='',action='',history=false,before='',key='upload-1',bytes=pdf,media='application/pdf',name='sample.pdf',allowed='["owner","buyer"]',extra={}}={})=>privateFileRequest(new Request(origin+'/api/private-files?task='+task+(file?'&file='+file:'')+(action?'&action='+action:'')+(history?'&history=1&before='+encodeURIComponent(before):''),{method,headers:{origin,'content-type':media,'idempotency-key':key,'x-file-name':encodeURIComponent(name),'x-dossivo-file-confirmation':'synthetic-test-only-v1',...extra},...(method==='POST'?{body:bytes}: {})}),actor,db,bucket,allowed);
 return {sql,objects,request,setBeforeClaim(fn){beforeClaim=fn;},setPutHook(fn){putHook=fn;},setDeleteFails(v){deleteFails=v;},setPutFails(v){putFails=v;},get puts(){return puts;}};
}
test('private files: anonymous, closed pilot, wrong owner and cross-origin writes fail before upload',async t=>{
 const f=fixture(t);
 for(const [args,status] of [[{actor:null},401],[{allowed:null,method:'POST'},503],[{allowed:'[]',method:'POST'},503],[{allowed:'{}',method:'POST'},503],[{allowed:'oops',method:'POST'},503],[{actor:'buyer'},404],[{method:'POST',extra:{origin:'https://evil.example'}},403]])assert.equal((await f.request(args)).status,status);
 assert.equal(f.puts,0);
});
test('private files: owner-only upload, list and download; no object keys, verification or buyer exposure',async t=>{
 const f=fixture(t),r=await f.request({method:'POST'});assert.equal(r.status,201);const saved=await r.json();assert.equal(saved.state,'STORED_UNREVIEWED');assert.equal(saved.verified,false);assert.equal('object_key' in saved,false);
 const listed=await (await f.request()).json();assert.equal(listed.files.length,1);assert.equal(listed.real_customer_intake,false);
 const download=await f.request({file:saved.id});assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'application/octet-stream');assert.match(download.headers.get('content-disposition'),/^attachment;/);assert.equal(download.headers.get('cache-control'),'private, no-store');assert.deepEqual(new Uint8Array(await download.arrayBuffer()),pdf);
 assert.equal((await f.request({actor:'buyer',task:'task-B',file:saved.id})).status,404);
 assert.equal((await f.request({method:'DELETE',actor:'buyer',task:'task-B',file:saved.id})).status,404);
});
test('private files: idempotent retries do not rewrite objects and altered requests conflict',async t=>{
 const f=fixture(t),a=await (await f.request({method:'POST'})).json(),b=await (await f.request({method:'POST'})).json();assert.equal(a.id,b.id);assert.equal(f.puts,1);
 assert.equal((await f.request({method:'POST',name:'different.pdf'})).status,409);
 assert.equal((await f.request({method:'POST',bytes:new TextEncoder().encode('%PDF-1.4 changed')})).status,409);assert.equal(f.puts,1);
});
test('private files: bounded streamed bytes, signatures, filename and confirmation are enforced',async t=>{
 const f=fixture(t);
 for(const [args,code] of [[{media:'text/html'},'FILE_TYPE_UNSUPPORTED'],[{bytes:new TextEncoder().encode('<script>bad</script>')},'FILE_SIGNATURE_MISMATCH'],[{bytes:new Uint8Array()},'EMPTY_FILE'],[{bytes:new Uint8Array(PRIVATE_FILE_LIMIT+1)},'FILE_TOO_LARGE'],[{name:'../secret.pdf'},'INVALID_FILENAME'],[{extra:{'x-dossivo-file-confirmation':''}},'FILE_CONFIRMATION_REQUIRED']]){const r=await f.request({method:'POST',...args});assert.equal((await r.json()).code,code);}
 assert.equal(f.puts,0);
});
test('private files: retryable failed deletion prevents download until object cleanup succeeds',async t=>{
 const f=fixture(t),saved=await (await f.request({method:'POST'})).json();f.setDeleteFails(true);
 const failed=await f.request({method:'DELETE',file:saved.id});assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/secret/);assert.equal((await f.request({file:saved.id})).status,409);
 f.setDeleteFails(false);assert.equal((await f.request({method:'DELETE',file:saved.id})).status,200);assert.equal(f.objects.size,0);assert.equal((await f.request({method:'DELETE',file:saved.id})).status,200);assert.equal((await (await f.request()).json()).files.length,0);
 assert.equal(f.sql.prepare('SELECT filename FROM dossivo_private_files WHERE id=?').get(saved.id).filename,'');
 assert.equal((await f.request({method:'POST'})).status,409);
});
test('private files: missing or altered objects never download',async t=>{
 const f=fixture(t),saved=await (await f.request({method:'POST'})).json(),key=[...f.objects.keys()][0];
 const altered=new Uint8Array(pdf);altered[altered.length-1]^=1;f.objects.set(key,altered);assert.equal((await f.request({file:saved.id})).status,409);
 f.objects.delete(key);assert.equal((await f.request({file:saved.id})).status,503);
});
test('private files: failed put is cleaned up and never becomes stored',async t=>{
 const f=fixture(t);f.setPutFails(true);const r=await f.request({method:'POST'});assert.equal(r.status,503);assert.equal(f.objects.size,0);assert.equal(f.sql.prepare('SELECT state FROM dossivo_private_files').get().state,'DELETED');
});
test('private files: delete racing upload cannot resurrect or leave an accessible object',async t=>{
 const f=fixture(t);f.setPutHook(async()=>{const id=f.sql.prepare('SELECT id FROM dossivo_private_files').get().id;assert.equal((await f.request({method:'DELETE',file:id})).status,200);});
 assert.equal((await f.request({method:'POST'})).status,409);assert.equal(f.objects.size,0);assert.equal(f.sql.prepare('SELECT state FROM dossivo_private_files').get().state,'DELETED');
});
test('private files: account quota is reserved atomically across tasks and deletion releases capacity',async t=>{
 const f=fixture(t);let first;
 for(let i=0;i<20;i++){const r=await f.request({method:'POST',key:'k'+i});assert.equal(r.status,201);const body=await r.json();first??=body.id;}
 assert.equal((await f.request({method:'POST',key:'overflow'})).status,409);assert.equal(f.puts,20);
 await f.request({method:'DELETE',file:first});assert.equal((await f.request({method:'POST',key:'after-delete'})).status,201);
});

test('private files: retry during upload stays busy rather than issuing a second put',async t=>{
 const f=fixture(t);f.setPutHook(async()=>{const retry=await f.request({method:'POST'});assert.equal(retry.status,409);assert.equal((await retry.json()).code,'FILE_NOT_READY');});
 assert.equal((await f.request({method:'POST'})).status,201);assert.equal(f.puts,1);
});

test('file recovery deletes only stale or deleting entries; stored and recent uploads survive',async t=>{
 const f=fixture(t),ids=[];for(let i=0;i<4;i++)ids.push((await (await f.request({method:'POST',key:'k'+i})).json()).id);
 f.sql.prepare("UPDATE dossivo_private_files SET state='UPLOADING',updated_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(ids[0]);
 f.sql.prepare("UPDATE dossivo_private_files SET state='UPLOADING',updated_at='2999-01-01T00:00:00.000Z' WHERE id=?").run(ids[1]);
 f.sql.prepare("UPDATE dossivo_private_files SET state='DELETING' WHERE id=?").run(ids[2]);
 const result=await (await f.request({method:'POST',action:'cleanup'})).json();assert.deepEqual(result,{examined:2,deleted:2,pending:0,skipped:0});assert.equal(f.objects.size,2);
 assert.equal(f.sql.prepare('SELECT state FROM dossivo_private_files WHERE id=?').get(ids[1]).state,'UPLOADING');assert.equal((await f.request({file:ids[3]})).status,200);
 assert.deepEqual(await (await f.request({method:'POST',action:'cleanup'})).json(),{examined:0,deleted:0,pending:0,skipped:0});
});
test('file recovery reports storage failures without exposing details and permits later retry',async t=>{
 const f=fixture(t),id=(await (await f.request({method:'POST'})).json()).id;f.sql.prepare("UPDATE dossivo_private_files SET state='DELETING' WHERE id=?").run(id);f.setDeleteFails(true);
 assert.deepEqual(await (await f.request({method:'POST',action:'cleanup'})).json(),{examined:1,deleted:0,pending:1,skipped:0});assert.equal((await f.request({file:id})).status,409);
 f.setDeleteFails(false);assert.equal((await (await f.request({method:'POST',action:'cleanup'})).json()).deleted,1);assert.equal(f.objects.size,0);
});
test('file recovery cannot delete an upload completed between discovery and claim',async t=>{
 const f=fixture(t),id=(await (await f.request({method:'POST'})).json()).id;f.sql.prepare("UPDATE dossivo_private_files SET state='UPLOADING',updated_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(id);
 f.setBeforeClaim(()=>f.sql.prepare("UPDATE dossivo_private_files SET state='STORED_UNREVIEWED' WHERE id=?").run(id));
 assert.deepEqual(await (await f.request({method:'POST',action:'cleanup'})).json(),{examined:1,deleted:0,pending:0,skipped:1});assert.equal((await f.request({file:id})).status,200);
});
test('file recovery requires the same ownership, origin and test gate as uploads',async t=>{
 const f=fixture(t);for(const [extra,status] of [[{actor:null},401],[{actor:'buyer'},404],[{allowed:'[]'},200],[{extra:{origin:'https://evil.example'}},403]])assert.equal((await f.request({method:'POST',action:'cleanup',...extra})).status,status);
 assert.equal((await f.request({method:'POST',action:'unknown'})).status,400);
});
test('file recovery handles a late put after cleanup without resurrecting the file',async t=>{
 const f=fixture(t);f.setPutHook(async()=>{f.sql.prepare("UPDATE dossivo_private_files SET updated_at='2000-01-01T00:00:00.000Z'").run();assert.equal((await (await f.request({method:'POST',action:'cleanup'})).json()).deleted,1);});
 assert.equal((await f.request({method:'POST'})).status,409);assert.equal(f.objects.size,0);assert.equal(f.sql.prepare('SELECT state FROM dossivo_private_files').get().state,'DELETED');
});

test('file state history survives deletion without filenames, content or object keys',async t=>{
 const f=fixture(t),id=(await (await f.request({method:'POST'})).json()).id;
 await f.request({method:'DELETE',file:id});
 const response=await f.request({history:true});assert.equal(response.headers.get('cache-control'),'private, no-store');const body=await response.json();
 assert.deepEqual(body.events.map(e=>e.to_state),['DELETED','DELETING','STORED_UNREVIEWED','UPLOADING']);assert.ok(body.events.every(e=>e.file_id===id));
 for(const e of body.events)assert.deepEqual(Object.keys(e).sort(),['file_id','from_state','recorded_at','sequence','to_state'].sort());
 assert.doesNotMatch(JSON.stringify(body),/sample.pdf|private-staging|Synthetic test fixture|object_key/);
});
test('file history is append-only and state/event writes roll back together',async t=>{
 const f=fixture(t);await f.request({method:'POST'});
 assert.throws(()=>f.sql.prepare("UPDATE dossivo_private_file_events SET to_state='DELETED'").run(),/FILE_HISTORY_APPEND_ONLY/);
 assert.throws(()=>f.sql.prepare('DELETE FROM dossivo_private_file_events').run(),/FILE_HISTORY_APPEND_ONLY/);
 f.sql.exec("CREATE TRIGGER synthetic_event_failure BEFORE INSERT ON dossivo_private_file_events BEGIN SELECT RAISE(ABORT,'SYNTHETIC_EVENT_FAILURE'); END");
 assert.equal((await f.request({method:'POST',key:'second'})).status,503);assert.equal(f.puts,1);assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM dossivo_private_files').get().n,1);
});
test('idempotent retries and repeated deletes do not manufacture new state events',async t=>{
 const f=fixture(t),id=(await (await f.request({method:'POST'})).json()).id;await f.request({method:'POST'});assert.equal((await (await f.request({history:true})).json()).events.length,2);
 await f.request({method:'DELETE',file:id});await f.request({method:'DELETE',file:id});assert.equal((await (await f.request({history:true})).json()).events.length,4);
});
test('file history rejects cross-owner access, invalid cursors and closed gates',async t=>{
 const f=fixture(t);await f.request({method:'POST'});
 assert.equal((await f.request({history:true,actor:'buyer'})).status,404);assert.deepEqual((await (await f.request({history:true,actor:'buyer',task:'task-B'})).json()).events,[]);
 assert.equal((await f.request({history:true,allowed:'[]'})).status,200);
 for(const before of ['0','-1','1.5','1e3','9007199254740992','1 OR 1=1'])assert.equal((await f.request({history:true,before})).status,400);
});
test('file history pagination remains stable when new state events arrive',async t=>{
 const f=fixture(t);for(let i=0;i<14;i++){const id=(await (await f.request({method:'POST',key:'k'+i})).json()).id;await f.request({method:'DELETE',file:id});}
 const first=await (await f.request({history:true})).json();assert.equal(first.events.length,50);assert.ok(first.next_before);
 await f.request({method:'POST',key:'after-page'});
 const next=await (await f.request({history:true,before:first.next_before})).json();assert.equal(next.events.length,6);assert.equal(next.next_before,null);
 assert.equal(new Set([...first.events,...next.events].map(e=>e.sequence)).size,56);
});

test('closing upload admission preserves existing owner file management without enabling buyer access',async t=>{
 const f=fixture(t),id=(await (await f.request({method:'POST'})).json()).id;
 for(const allowed of ['[]','oops',null]){
  const listing=await (await f.request({allowed})).json();assert.equal(listing.can_upload,false);assert.equal(listing.files[0].id,id);
  assert.equal((await f.request({allowed,file:id})).status,200);assert.equal((await f.request({allowed,history:true})).status,200);
  assert.equal((await f.request({allowed,method:'POST',key:'blocked'})).status,503);
  assert.equal((await f.request({allowed,actor:'buyer',task:'task-B',file:id})).status,404);
 }
 assert.equal((await f.request({allowed:'[]',method:'DELETE',file:id})).status,200);assert.equal(f.objects.size,0);
});
test('owner can retry pending deletion after upload access is removed; cross-origin remains blocked',async t=>{
 const f=fixture(t),id=(await (await f.request({method:'POST'})).json()).id;f.setDeleteFails(true);
 assert.equal((await f.request({allowed:'[]',method:'DELETE',file:id})).status,503);f.setDeleteFails(false);
 assert.equal((await f.request({allowed:'[]',method:'POST',action:'cleanup',extra:{origin:'https://evil.example'}})).status,403);
 const result=await (await f.request({allowed:'[]',method:'POST',action:'cleanup'})).json();assert.equal(result.deleted,1);assert.equal(f.objects.size,0);
});
test('private file usage: account scope, task scope, pending reservations and deletion release',async t=>{
 const f=fixture(t);
 f.sql.prepare('INSERT INTO dossivo_task_heads(id,tenant_id,title,version,last_operation_id,updated_at) VALUES(?,?,?,1,?,?)').run('task-C','owner','Synthetic','op3','2026-11-07');
 const saved=await (await f.request({method:'POST'})).json();
 await f.request({method:'POST',task:'task-C',key:'other-task'});
 await f.request({method:'POST',actor:'buyer',task:'task-B',key:'other-owner'});
 f.setDeleteFails(true);await f.request({method:'DELETE',file:saved.id});
 let body=await (await f.request({allowed:'[]'})).json();
 assert.deepEqual(body.usage,{account:{occupied:2,limit:20,remaining:18},task:{stored:0,uploading:0,deleting:1}});
 assert.equal(body.can_upload,false);assert.equal(body.real_customer_intake,false);
 assert.doesNotMatch(JSON.stringify(body.usage),/owner|task-C|sha256|object_key/);
 f.setDeleteFails(false);await f.request({method:'DELETE',file:saved.id});
 body=await (await f.request()).json();assert.equal(body.usage.account.remaining,19);assert.equal(body.usage.task.deleting,0);
 f.setPutHook(async()=>{const pending=await (await f.request()).json();assert.equal(pending.usage.task.uploading,1);assert.equal(pending.usage.account.occupied,2);});
 await f.request({method:'POST',key:'pending'});
 assert.equal((await (await f.request()).json()).usage.task.stored,1);
});
test('private file usage: empty task reports zero and capacity is clamped at zero',async t=>{
 const f=fixture(t);assert.deepEqual((await (await f.request()).json()).usage,{account:{occupied:0,limit:20,remaining:20},task:{stored:0,uploading:0,deleting:0}});
 for(let i=0;i<20;i++)await f.request({method:'POST',key:'slot'+i});
 assert.equal((await (await f.request()).json()).usage.account.remaining,0);
 assert.equal((await f.request({actor:'buyer'})).status,404);
});

test('file history rejects replacement even with recursive triggers disabled',async t=>{
 const f=fixture(t);await f.request({method:'POST'});
 const prior=f.sql.prepare('SELECT * FROM dossivo_private_file_events ORDER BY sequence').all();
 for(const recursive of ['OFF','ON']){
  f.sql.exec('PRAGMA recursive_triggers='+recursive);
  for(const insert of ['INSERT OR REPLACE','REPLACE']){
   assert.throws(()=>f.sql.prepare(`${insert} INTO dossivo_private_file_events(sequence,file_id,owner_id,task_id,to_state,recorded_at) VALUES(?,?,?,?,?,?)`).run(prior[0].sequence,'forged','buyer','task-B','DELETED','2099'),/FILE_HISTORY_APPEND_ONLY/);
  }
  assert.deepEqual(f.sql.prepare('SELECT * FROM dossivo_private_file_events ORDER BY sequence').all(),prior);
 }
});
test('failed history replacement leaves ordinary upload and deletion events appendable',async t=>{
 const f=fixture(t),saved=await (await f.request({method:'POST'})).json();
 const prior=f.sql.prepare('SELECT * FROM dossivo_private_file_events ORDER BY sequence').all();
 assert.throws(()=>f.sql.exec(`INSERT OR REPLACE INTO dossivo_private_file_events SELECT * FROM dossivo_private_file_events`),/FILE_HISTORY_APPEND_ONLY/);
 assert.equal((await f.request({method:'DELETE',file:saved.id})).status,200);
 const events=f.sql.prepare('SELECT * FROM dossivo_private_file_events ORDER BY sequence').all();
 assert.deepEqual(events.slice(0,prior.length),prior);
 assert.deepEqual(events.map(e=>e.to_state),['UPLOADING','STORED_UNREVIEWED','DELETING','DELETED']);
 assert.equal((await f.request({method:'POST',key:'after-delete'})).status,201);
});
