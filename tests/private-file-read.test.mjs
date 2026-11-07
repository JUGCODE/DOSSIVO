import test from 'node:test';
import assert from 'node:assert/strict';
import {readStoredFile} from '../lib/private-file-read.js';
test('stored file reader validates actual byte count across chunks',async()=>{
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2]));c.enqueue(new Uint8Array([3]));c.close();}});
 assert.deepEqual(await readStoredFile(stream,3),new Uint8Array([1,2,3]));
 await assert.rejects(readStoredFile(new Response('short').body,10),{code:'FILE_INTEGRITY_FAILED'});
});
test('stored file reader cancels oversized streams despite small claimed metadata',async()=>{
 let cancelled=false;const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(100));},cancel(){cancelled=true;}});
 await assert.rejects(readStoredFile(stream,10),{code:'FILE_INTEGRITY_FAILED'});assert.equal(cancelled,true);assert.equal(stream.locked,false);
});
test('stored file reader rejects invalid sizes and releases lock on storage failure',async()=>{
 for(const size of [0,-1,NaN,Infinity,1.5,2097153])await assert.rejects(readStoredFile(new Response('a').body,size),{code:'FILE_INTEGRITY_FAILED'});
 const stream=new ReadableStream({pull(c){c.error(Error('storage interrupted'));}});await assert.rejects(readStoredFile(stream,1));assert.equal(stream.locked,false);
});
