import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pilotBinding, registrationEnvelope, PaciRegistrationClient, validateRegistrationReply, PACI_PROTOCOL } from "../lib/paci-http-client.js";
import { buildRegistrationDraft } from "../lib/paci-bridge-core.js";
import { createInitialState } from "../lib/workflow-core.js";
const binding={origin:"https://paci.internal.example",tenant_id:"paci-alice",service_actor_id:"dossivo-service",token:"test-service-token-only"};
const draft=()=>buildRegistrationDraft({snapshotId:"snapshot-1",caseId:"buyer-pack:alice",caseVersion:3,state:createInitialState(),now:"2026-10-27T08:00:00.000Z"});
async function fixture(){const envelope=await registrationEnvelope("request-1",draft(),"alice",binding);const body={protocol:PACI_PROTOCOL,receipt:{operation_id:"op-1",idempotency_key:envelope.idempotency_key,request_digest:envelope.request_digest,digest_alg:"sha256/paci-canonical-json-1",first_received_at:"2026-10-27T08:00:01.000Z",replayed:false,result_ref:{type:"record",id:"record-1",version:1}},result:{record_id:"record-1",version:1,kind:"MATERIAL",visibility:"PRIVATE",disclosed:"CONTENT",erased:false,status:{source:"SELF_REPORTED",coverage:"PARTIAL"},content:structuredClone(envelope.input.content),summary:structuredClone(envelope.input.summary)}};return{envelope,body};}
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"paci-protocol":PACI_PROTOCOL}});
test("pilot is off by default and tenant credentials are selected only from server config",()=>{
 assert.equal(pilotBinding({},"alice"),null);
 const env={PACI_REGISTRATION_PILOT:"enabled",PACI_SERVICE_ORIGIN:binding.origin,PACI_TENANT_BINDINGS:JSON.stringify({alice:{...binding}})};
 assert.equal(pilotBinding(env,"bob"),null);assert.deepEqual(pilotBinding(env,"alice"),{...binding,api_version:PACI_PROTOCOL});
 for(const origin of ["http://paci.example","https://user:password@paci.example","https://paci.example/path","https://paci.example/?token=x"]){assert.throws(()=>pilotBinding({...env,PACI_SERVICE_ORIGIN:origin},"alice"),{code:"PACI_CONFIG_INVALID"});}
});
test("registration uses fixed content, has a stable key, and adds no claim or verification",async()=>{
 const{envelope,body}=await fixture();assert.equal(envelope.input.kind,"MATERIAL");assert.equal(envelope.input.visibility,"PRIVATE");assert.equal(envelope.case_version,3);assert.equal(envelope.input.content.originals_included,false);
 assert.equal((await validateRegistrationReply(body,envelope)).record_id,"record-1");
 assert.deepEqual(await registrationEnvelope("request-1",draft(),"alice",binding),envelope);
 assert.ok(!JSON.stringify(envelope).includes(binding.token));
});
test("recovery is read first and never reposts an already received operation",async()=>{
 const {envelope,body}=await fixture();const calls=[];
 const client=new PaciRegistrationClient(binding,{fetch:async(url,options)=>{calls.push({url,options});return reply({protocol:PACI_PROTOCOL,result:{receipt:body.receipt,result:body.result}});}});
 assert.equal((await client.registerOrRecover(envelope)).operation_id,"op-1");assert.equal(calls.length,1);assert.equal(calls[0].options.method,"GET");assert.equal(calls[0].options.redirect,"error");
});
test("missing receipt recovery posts with the same key and correct service-only headers",async()=>{
 const {envelope,body}=await fixture();const calls=[];
 const client=new PaciRegistrationClient(binding,{fetch:async(url,o)=>{calls.push({url,o});return calls.length===1?reply({},404):reply(body,201);}});
 await client.registerOrRecover(envelope);assert.equal(calls.length,2);assert.equal(calls[1].o.headers["Idempotency-Key"],envelope.idempotency_key);assert.equal(calls[1].o.headers["X-Paci-On-Behalf-Of"],"user:alice");assert.equal(calls[1].o.headers.Authorization,`Bearer ${binding.token}`);
});
test("network loss, timeout and upstream errors do not invent receipt or transparently repost",async()=>{
 const{envelope}=await fixture();
 for(const status of [401,403,409,422,500]){let calls=0;const c=new PaciRegistrationClient(binding,{fetch:async()=>{calls++;return reply({},status);}});await assert.rejects(c.registerOrRecover(envelope),{code:`PACI_HTTP_${status}`});assert.equal(calls,1);}
 const c=new PaciRegistrationClient(binding,{timeoutMs:5,fetch:async(_u,o)=>new Promise((_resolve,reject)=>o.signal.addEventListener("abort",()=>reject(Error("aborted"))))});
 await assert.rejects(c.registerOrRecover(envelope),{code:"PACI_NETWORK_UNCONFIRMED",retryable:true});
});
test("wrong operation, content, version, protocol, disclosure and erasure fail receipt validation",async()=>{
 const{envelope,body}=await fixture();
 const mutations=[b=>b.receipt.idempotency_key="other",b=>b.receipt.request_digest="wrong",b=>b.receipt.result_ref.version=2,b=>b.result.record_id="different",b=>b.protocol="unknown",b=>b.result.content.dossivo.case_version=99,b=>b.result.disclosed="SUMMARY",b=>b.result.erased=true];
 for(const mutate of mutations){const b=structuredClone(body);mutate(b);await assert.rejects(validateRegistrationReply(b,envelope),{code:"PACI_RECEIPT_MISMATCH"});}
 const c=new PaciRegistrationClient({...binding,tenant_id:"other"},{fetch:async()=>{throw Error("must not fetch");}});await assert.rejects(c.registerOrRecover(envelope),{code:"PACI_BINDING_CHANGED"});
});
