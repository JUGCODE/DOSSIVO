import test from 'node:test';
import assert from 'node:assert/strict';
import {createTaskCommand} from '../lib/private-task-command.js';
import {createTaskActivity} from '../lib/private-task-activity.js';
test('uncertain task save retries original values and key while blocking replacement commands',()=>{
 const queue=createTaskCommand(()=> 'original-key'),body={action:'create',data:{payload:{purpose:'A'}}};
 const first=queue.prepare(body);body.data.payload.purpose='B';assert.equal(queue.failed(Error('network')),true);
 assert.throws(()=>queue.prepare({action:'create'}),/TASK_SAVE_UNCERTAIN/);
 assert.equal(queue.retry(),first);assert.equal(first.body.data.payload.purpose,'A');assert.equal(first.key,'original-key');
 queue.clear();assert.equal(queue.isUncertain(),false);assert.throws(()=>queue.retry(),/NO_PENDING/);
});
test('definitive version rejection clears pending request and preserves API code over prose',async()=>{
 const queue=createTaskCommand(()=> 'key'),activity=createTaskActivity();queue.prepare({action:'assess'});
 try{await activity.request(async()=>Response.json({code:'VERSION_CONFLICT',error:'Task changed; refresh'},{status:409}),'/api/private-tasks');assert.fail();}
 catch(error){assert.equal(error.message,'VERSION_CONFLICT');assert.equal(error.status,409);assert.equal(queue.failed(error),false);}
 assert.throws(()=>queue.retry(),/NO_PENDING/);
});
test('timeouts, throttling, server and malformed success responses retain recovery while validation errors release it',()=>{
 for(const status of [408,429,500,503,undefined]){const queue=createTaskCommand();queue.prepare({action:'create'});assert.equal(queue.failed(Object.assign(Error('failure'),{status})),true);assert.ok(queue.retry().key);}
 for(const status of [400,403,404,409,413,422]){const queue=createTaskCommand();queue.prepare({action:'create'});assert.equal(queue.failed({status}),false);assert.equal(queue.isUncertain(),false);}
});
