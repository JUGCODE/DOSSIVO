import {recoverTestSession} from './test-checkout-recovery.js';
import {OrganizationStore} from './organization-store.js';
import {BridgeError} from './paci-bridge-core.js';
import {checkoutReady} from './test-payment-config.js';
const failure=(code,status=409)=>new BridgeError(code,code,status);
// Explicit, durable stop intent. Remote expiry confirmation is separate from draft withdrawal.
export class TestCheckoutCancellation extends OrganizationStore {
 async cancel(actor,data,config,send=fetch){
  await this.owner(actor,data?.organization_id);
  if(!data||Object.keys(data).some(k=>!['organization_id','draft_version','confirmed'].includes(k))||!Number.isSafeInteger(data.draft_version)||data.draft_version<1||data.confirmed!==true)throw failure('INVALID_INPUT',400);
  const get=()=>this.q('SELECT * FROM dossivo_test_checkout_orders WHERE organization_id=? AND draft_version=?',data.organization_id,data.draft_version).first();
  let order=await get();if(!order)throw failure('TEST_ORDER_NOT_FOUND',404);
  await this.db.batch([this.q('UPDATE dossivo_test_checkout_orders SET cancel_requested_at=COALESCE(cancel_requested_at,?) WHERE id=?',this.clock(),order.id)]);
  order=await get();
  const result=()=>({test_only:true,cancellation:order.cancel_outcome??'REQUESTED',draft_version:order.draft_version,requested_at:order.cancel_requested_at,resolved_at:order.cancel_resolved_at,entitlements_activated:false,evidence_access_granted:false});
  if(order.cancel_outcome||!checkoutReady(config))return result();
  if(!order.session_id){
   const recovered=await recoverTestSession(order,config,send);
   if(!recovered)return {...result(),recovery:'NOT_FOUND_YET'};
   await this.db.batch([this.q('UPDATE dossivo_test_checkout_orders SET session_id=? WHERE id=? AND session_id IS NULL',recovered,order.id)]);
   order=await get();if(order.session_id!==recovered)throw failure('RECOVERY_REVIEW_REQUIRED',503);
  }
  if(!/^cs_test_[A-Za-z0-9_]{1,190}$/.test(order.session_id))throw failure('INVALID_TEST_SESSION',502);
  const quote=JSON.parse(order.quote_json),url='https://api.stripe.com/v1/checkout/sessions/'+order.session_id;
  const headers={authorization:'Bearer '+config.STRIPE_TEST_SECRET_KEY,'Stripe-Version':'2026-10-28.endive'};
  async function call(expire=false){
   let s;try{const r=await send(url+(expire?'/expire':''),{method:expire?'POST':'GET',headers:expire?{...headers,'idempotency-key':'dossivo-expire-'+order.id}:headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();s=await r.json();}catch{throw failure('TEST_PROVIDER_UNAVAILABLE',503);}
   if(s.object!=='checkout.session'||s.id!==order.session_id||s.livemode!==false||s.mode!=='subscription'||s.client_reference_id!==order.id||s.amount_total!==quote.amount_minor||s.currency!==quote.currency.toLowerCase()||!['open','expired','complete'].includes(s.status))throw failure('INVALID_TEST_SESSION',502);
   return s;
  }
  let session=await call();
  if(session.status==='open'){
   try{session=await call(true);}catch(e){if(e.code!=='TEST_PROVIDER_UNAVAILABLE')throw e;session=await call();}
  }
  if(session.status==='open')throw failure('TEST_PROVIDER_UNAVAILABLE',503);
  const outcome=session.status==='expired'?'EXPIRED_CONFIRMED':'COMPLETED_REVIEW';
  await this.db.batch([this.q('UPDATE dossivo_test_checkout_orders SET cancel_outcome=?,cancel_resolved_at=? WHERE id=? AND cancel_outcome IS NULL',outcome,this.clock(),order.id)]);
  order=await get();return result();
 }
}
