import {OrganizationStore} from './organization-store.js';
import {TestCheckoutCancellation} from './test-checkout-cancellation.js';
import {checkoutReady} from './test-payment-config.js';
import {BridgeError} from './paci-bridge-core.js';
const reviewCodes=new Set(['INVALID_TEST_SESSION','RECOVERY_REVIEW_REQUIRED','RECOVERY_SCAN_LIMIT','ORGANIZATION_UNAVAILABLE']);
export function stopWorkerReady(c){return c?.DOSSIVO_TEST_RETRY_MODE==='TEST_ONLY'&&checkoutReady(c)&&typeof c.DOSSIVO_TEST_RETRY_TOKEN==='string'&&/^[A-Za-z0-9_-]{32,256}$/.test(c.DOSSIVO_TEST_RETRY_TOKEN);}
export async function authorizeStopWorker(request,config){
 if(!stopWorkerReady(config))throw new BridgeError('TEST_RETRY_DISABLED','Disabled',503);
 const value=request.headers.get('authorization')??'',expected='Bearer '+config.DOSSIVO_TEST_RETRY_TOKEN;
 // Compare fixed-size digests without exposing the configured credential.
 const digest=s=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 if(value.length>512)throw new BridgeError('SERVICE_AUTH_REQUIRED','Unauthorized',401);
 const [a,b]=await Promise.all([digest(value),digest(expected)]);let diff=0;const av=new Uint8Array(a),bv=new Uint8Array(b);for(let i=0;i<32;i++)diff|=av[i]^bv[i];
 if(diff)throw new BridgeError('SERVICE_AUTH_REQUIRED','Unauthorized',401);
 if(request.method!=='POST'||new URL(request.url).search)throw new BridgeError('INVALID_INPUT','Empty POST required',400);
 if(request.body){const reader=request.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;if(value?.length){await reader.cancel();throw new BridgeError('INVALID_INPUT','Empty POST required',400);}}}finally{reader.releaseLock();}}
}
export class TestStopWorker extends OrganizationStore {
 async run(config,send=fetch){
  if(!stopWorkerReady(config))throw new BridgeError('TEST_RETRY_DISABLED','Disabled',503);
  const now=Date.parse(this.clock()),order=await this.q(`SELECT o.*,g.owner_id FROM dossivo_test_checkout_orders o JOIN dossivo_organizations g ON g.id=o.organization_id WHERE o.cancel_requested_at IS NOT NULL AND o.cancel_outcome IS NULL AND o.retry_review=0 AND o.retry_attempts<5 AND o.retry_next_at<=? AND o.retry_lease_until<=? ORDER BY o.retry_next_at,o.cancel_requested_at,o.id LIMIT 1`,now,now).first();
  if(!order)return {test_only:true,processed:0,status:'IDLE'};
  const token=this.uuid(),attempt=order.retry_attempts+1;
  try{await this.db.batch([
   this.q('INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN COUNT(*)=1 THEN 1 ELSE 0 END FROM dossivo_test_checkout_orders WHERE id=? AND retry_attempts=? AND retry_review=0 AND retry_lease_until<=? AND retry_next_at<=? AND cancel_outcome IS NULL AND cancel_requested_at IS NOT NULL',this.uuid(),order.id,order.retry_attempts,now,now),
   this.q('UPDATE dossivo_test_checkout_orders SET retry_attempts=?,retry_lease_token=?,retry_lease_until=? WHERE id=?',attempt,token,now+120000,order.id),
   this.q("UPDATE dossivo_test_stop_attempts SET outcome='LEASE_EXPIRED',finished_at=? WHERE order_id=? AND finished_at IS NULL",now,order.id),
   this.q("INSERT INTO dossivo_test_stop_attempts(id,order_id,attempt,started_at,outcome) VALUES(?,?,?,?,'STARTED')",token,order.id,attempt,now)
  ]);}catch(e){if(/constraint|CHECK|UNIQUE/i.test(String(e)))return {test_only:true,processed:0,status:'CLAIM_LOST'};throw e;}
  let code;
  try{const r=await new TestCheckoutCancellation(this.db,{clock:this.clock,uuid:this.uuid}).cancel(order.owner_id,{organization_id:order.organization_id,draft_version:order.draft_version,confirmed:true},config,send);code=r.cancellation==='REQUESTED'?'NOT_FOUND_YET':r.cancellation;}catch(e){code=reviewCodes.has(e.code)?e.code:'RETRYABLE_FAILURE';}
  const finished=Date.parse(this.clock()),terminal=['EXPIRED_CONFIRMED','COMPLETED_REVIEW'].includes(code),review=code==='COMPLETED_REVIEW'||reviewCodes.has(code)||(!terminal&&attempt>=5);
  const next=terminal||review?0:finished+Math.min(3600000,60000*2**(attempt-1));
  try{await this.db.batch([
   this.q('INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN COUNT(*)=1 THEN 1 ELSE 0 END FROM dossivo_test_checkout_orders WHERE id=? AND retry_lease_token=?',this.uuid(),order.id,token),
   this.q('UPDATE dossivo_test_checkout_orders SET retry_lease_until=0,retry_lease_token=NULL,retry_next_at=?,retry_last_code=?,retry_review=? WHERE id=?',next,code,review?1:0,order.id),
   this.q('UPDATE dossivo_test_stop_attempts SET finished_at=?,outcome=? WHERE id=?',finished,code,token)
  ]);}catch(e){if(/constraint|CHECK/i.test(String(e)))return {test_only:true,processed:1,status:'LEASE_LOST'};throw e;}
  return {test_only:true,processed:1,status:terminal?'RESOLVED':review?'REVIEW_REQUIRED':'RETRY_SCHEDULED'};
 }
}
