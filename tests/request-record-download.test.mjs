import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchRequestRecord} from '../lib/request-record-download.js';

test('record download: validates attachment and passes no-store, cancellation and redirect protection',async()=>{
 const controller=new AbortController();
 for(const format of ['html','json']){
  const body=format==='html'?'<!doctype html><p>record</p>':'{"schema":"dossivo/request-record/1"}';
  const blob=await fetchRequestRecord('/api/conversations',format,{signal:controller.signal,fetcher:async(url,options)=>{
   assert.equal(url,'/api/conversations');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(options.signal,controller.signal);
   return new Response(body,{headers:{'content-type':format==='html'?'text/html; charset=utf-8':'application/json','content-disposition':`attachment; filename="DOSSIVO_Request_Record.${format}"`}});
  }});assert.equal(await blob.text(),body);
 }
});
test('record download: authentication and authorization failures never become files',async()=>{
 for(const [status,code] of [[401,'AUTH_REQUIRED'],[403,'ACCESS_UNAVAILABLE'],[404,'ACCESS_UNAVAILABLE'],[413,'EXPORT_TOO_LARGE'],[503,'DOWNLOAD_FAILED']]){
  await assert.rejects(fetchRequestRecord('/api/conversations','html',{fetcher:async()=>new Response('error',{status})}),{code});
 }
});
test('record download: successful sign-in pages, wrong MIME, missing attachment and empty bodies rejected',async()=>{
 for(const [body,headers] of [['<html>Sign in</html>',{'content-type':'text/html'}],['{}',{'content-type':'application/json','content-disposition':'attachment; filename="DOSSIVO_Request_Record.html"'}],['',{'content-type':'text/html','content-disposition':'attachment; filename="DOSSIVO_Request_Record.html"'}]]){
  await assert.rejects(fetchRequestRecord('/api/conversations','html',{fetcher:async()=>new Response(body,{headers})}),{code:'INVALID_RESPONSE'});
 }
 const error=new DOMException('Aborted','AbortError');await assert.rejects(fetchRequestRecord('/api/conversations','html',{fetcher:async()=>{throw error;}}),{name:'AbortError'});
});
