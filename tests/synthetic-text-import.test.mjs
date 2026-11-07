import test from 'node:test';
import assert from 'node:assert/strict';
import {createSyntheticTextReader} from '../lib/synthetic-text-import.js';
const file=(text,name='synthetic.txt')=>{const bytes=new TextEncoder().encode(text);return {name,size:bytes.length,arrayBuffer:async()=>bytes.buffer};};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('text import: latest selection wins even if an earlier file finishes last',async()=>{
 const reader=createSyntheticTextReader(),slow=deferred();
 const first=reader.read({name:'old.txt',size:2,arrayBuffer:()=>slow.promise});
 assert.deepEqual(await reader.read(file('new','new.txt')),{status:'loaded',text:'new',title:'new.txt'});
 slow.resolve(new TextEncoder().encode('old').buffer);assert.deepEqual(await first,{status:'stale'});
});
test('text import: cancellation or a newer invalid selection invalidates pending reads',async()=>{
 for(const cancel of [true,false]){
  const reader=createSyntheticTextReader(),slow=deferred(),pending=reader.read({name:'old.txt',size:2,arrayBuffer:()=>slow.promise});
  if(cancel)reader.cancel();else assert.equal((await reader.read(file('wrong','wrong.pdf'))).code,'TEXT_FILE_UNSUPPORTED');
  slow.reject(Error('sensitive path'));assert.deepEqual(await pending,{status:'stale'});
 }
});
test('text import: bounded UTF-8, empty files and read failures return safe error codes',async()=>{
 const reader=createSyntheticTextReader();
 assert.equal((await reader.read(file('用电量：20kWh'))).status,'loaded');
 assert.equal((await reader.read(file(' '.repeat(3)))).code,'TEXT_FILE_EMPTY');
 assert.equal((await reader.read(file('x'.repeat(10001)))).code,'TEXT_FILE_UNSUPPORTED');
 assert.equal((await reader.read({...file('x'.repeat(10001)),size:1})).code,'TEXT_FILE_UNSUPPORTED');
 assert.equal((await reader.read({name:'bad.txt',size:1,arrayBuffer:async()=>new Uint8Array([255]).buffer})).code,'TEXT_ENCODING_INVALID');
 assert.deepEqual(await reader.read({name:'bad.txt',size:1,arrayBuffer:async()=>{throw Error('/private/path');}}),{status:'error',code:'TEXT_READ_FAILED'});
});
