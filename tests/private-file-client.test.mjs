import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFileUpload,requestPrivateFile,fileEndpoint} from '../lib/private-file-client.js';
import {PRIVATE_FILE_LIMIT,privateFileInputError} from '../lib/private-file-policy.js';
const fixture=()=>new File(['%PDF-1.4 Synthetic'], '合成.pdf',{type:'application/pdf'});
test('file selection rejects empty/oversized/unsupported inputs and requires explicit cloud-test confirmation',()=>{
 assert.throws(()=>prepareFileUpload(fixture(),false),/FILE_CONFIRMATION_REQUIRED/);
 for(const [f,code] of [[null,'EMPTY_FILE'],[{size:0},'EMPTY_FILE'],[{size:PRIVATE_FILE_LIMIT+1},'FILE_TOO_LARGE'],[{size:10,type:'text/html',name:'a.html'},'FILE_TYPE_UNSUPPORTED'],[{size:10,type:'application/pdf',name:'../a.pdf'},'INVALID_FILENAME']])assert.equal(privateFileInputError(f),code);
 assert.equal(privateFileInputError(fixture()),null);
});
test('uncertain upload retries keep the same key and bytes and encode the filename',async()=>{
 const file=fixture(),attempt=prepareFileUpload(file,true,()=> 'request-1'),calls=[];
 const fetcher=async(url,options)=>{calls.push({url,options});if(calls.length===1)throw TypeError('network');return Response.json({id:'file-1',state:'STORED_UNREVIEWED'});};
 await assert.rejects(requestPrivateFile(fetcher,'task-A',{method:'POST',attempt}));
 assert.equal((await requestPrivateFile(fetcher,'task-A',{method:'POST',attempt})).id,'file-1');
 for(const {options} of calls){assert.equal(options.headers['idempotency-key'],'request-1');assert.equal(options.body,file);assert.equal(decodeURIComponent(options.headers['x-file-name']),'合成.pdf');assert.equal(options.headers['x-dossivo-file-confirmation'],'synthetic-test-only-v1');}
});
test('request URLs encode task/file identifiers without adding injected query parameters',()=>{
 const url=new URL(fileEndpoint('task&owner=other','file&x=1'),'https://test');assert.equal(url.searchParams.get('task'),'task&owner=other');assert.equal(url.searchParams.get('file'),'file&x=1');assert.equal(url.searchParams.size,2);
});
test('client preserves gate/identity/integrity errors and rejects JSON masquerading as a download',async()=>{
 for(const [status,code] of [[503,'FILE_PILOT_CLOSED'],[401,'AUTH_REQUIRED'],[409,'FILE_INTEGRITY_FAILED']])await assert.rejects(requestPrivateFile(async()=>Response.json({code},{status}),'task',{id:'file'}),new RegExp(code));
 await assert.rejects(requestPrivateFile(async()=>Response.json({unexpected:true}),'task',{id:'file'}),/FILE_UNAVAILABLE/);
 const blob=await requestPrivateFile(async()=>new Response('bytes',{headers:{'content-type':'application/octet-stream'}}),'task',{id:'file'});assert.equal(await blob.text(),'bytes');
});
test('delete and refresh use the same authenticated endpoint with no-store and cancellation',async()=>{
 const calls=[],controller=new AbortController(),fetcher=async(url,options)=>{calls.push({url,options});return Response.json({files:[]});};
 await requestPrivateFile(fetcher,'task',{method:'DELETE',id:'file',signal:controller.signal});await requestPrivateFile(fetcher,'task',{signal:controller.signal});
 assert.equal(calls[0].options.method,'DELETE');assert.equal(calls[1].options.method,'GET');for(const call of calls){assert.equal(call.options.cache,'no-store');assert.equal(call.options.signal,controller.signal);}
});

test('cleanup is a bounded POST action without file bytes or a manufactured upload attempt',async()=>{
 let call;const result=await requestPrivateFile(async(url,options)=>{call={url,options};return Response.json({deleted:1,pending:0,skipped:0});},'task-A',{method:'POST',action:'cleanup'});
 assert.equal(new URL(call.url,'https://test').searchParams.get('action'),'cleanup');assert.equal(call.options.method,'POST');assert.equal(call.options.body,undefined);assert.equal(result.deleted,1);
});

test('file history request carries an encoded cursor and does not trigger binary download',async()=>{
 let query;const result=await requestPrivateFile(async(url)=>{query=new URL(url,'https://test');return Response.json({events:[],next_before:null});},'task',{history:true,before:'123'});assert.equal(query.searchParams.get('history'),'1');assert.equal(query.searchParams.get('before'),'123');assert.deepEqual(result.events,[]);
});
