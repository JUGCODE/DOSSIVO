import {SubscriptionDrafts,subscriptionQuote} from './subscription-drafts.js';
import {BridgeError,fingerprint} from './paci-bridge-core.js';
const fail=(code,status=409)=>new BridgeError(code,code,status);
import {checkoutReady} from './test-payment-config.js';
import {TestCheckoutCancellation} from './test-checkout-cancellation.js';
export {checkoutReady} from './test-payment-config.js';
export class TestCheckout extends SubscriptionDrafts {
 async create(actor,data,key,config,send=fetch){
  await this.owner(actor,data?.organization_id);
  if(!checkoutReady(config))throw fail('TEST_CHECKOUT_DISABLED',503);
  if(!data||Object.keys(data).some(k=>!['organization_id','expected_version','confirmed'].includes(k))||data.confirmed!==true||!Number.isSafeInteger(data.expected_version)||data.expected_version<1||typeof key!=='string'||!key.trim()||key.length>128)throw fail('INVALID_INPUT',400);
  const current=async()=>{const d=(await this.read(actor,data.organization_id)).draft;if(!d||d.version!==data.expected_version||d.quote.status!=='PREPARATION_ONLY')throw fail('VERSION_CONFLICT');return d;};
  const draft=await current(),q=draft.quote;
  const quote=subscriptionQuote({organization_id:data.organization_id,expected_version:draft.version,catalog_version:q.catalog_version,plan_id:q.plan_id,cycle:q.cycle,confirmed:true});
  if(!['starter','business'].includes(q.plan_id)||q.amount_minor!==quote.amount_minor||q.currency!==quote.currency)throw fail('PLAN_NOT_READY');
  const hash=await fingerprint(data),prior=await this.q('SELECT * FROM dossivo_test_checkout_orders WHERE actor_id=? AND request_key=?',actor,key).first();
  if(prior&&prior.command_hash!==hash)throw fail('IDEMPOTENCY_CONFLICT');
  let order=await this.q('SELECT * FROM dossivo_test_checkout_orders WHERE organization_id=? AND draft_version=?',data.organization_id,draft.version).first();
  if(!order){
   const id=this.uuid(),now=this.clock(),expiry=Math.floor(Date.parse(now)/1000)+3600;
   const body=new URLSearchParams({mode:'subscription',client_reference_id:id,expires_at:String(expiry),success_url:'https://dossivo-outcome-workbench.xugv.chatgpt.site/account?checkout=test-return',cancel_url:'https://dossivo-outcome-workbench.xugv.chatgpt.site/account?checkout=test-cancel','line_items[0][quantity]':'1','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':String(quote.amount_minor),'line_items[0][price_data][recurring][interval]':quote.cycle==='annual'?'year':'month','line_items[0][price_data][product_data][name]':'DOSSIVO '+quote.plan_id+' TEST'}).toString();
   try{await this.db.batch([this.q('INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN MAX(version)=? THEN 1 ELSE 0 END FROM dossivo_subscription_drafts WHERE organization_id=?',this.uuid(),draft.version,data.organization_id),this.q('INSERT INTO dossivo_test_checkout_orders(id,organization_id,actor_id,draft_version,request_key,command_hash,quote_json,request_body,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)',id,data.organization_id,actor,draft.version,key,hash,JSON.stringify(quote),body,now,expiry)]);}catch(e){if(!/constraint|UNIQUE|CHECK/i.test(String(e)))throw e;}
   order=await this.q('SELECT * FROM dossivo_test_checkout_orders WHERE organization_id=? AND draft_version=?',data.organization_id,draft.version).first();if(!order)throw fail('VERSION_CONFLICT');
  }
  if(order.cancel_requested_at)throw fail('TEST_CANCELLATION_REQUESTED');
  if(order.expires_at<=Math.floor(Date.parse(this.clock())/1000))throw fail('TEST_SESSION_EXPIRED');
  await current();
  if(!order.session_id){
   let s;try{const r=await send('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{authorization:'Bearer '+config.STRIPE_TEST_SECRET_KEY,'content-type':'application/x-www-form-urlencoded','idempotency-key':'dossivo-test-'+order.id,'Stripe-Version':'2026-10-28.endive'},body:order.request_body,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();s=await r.json();}catch{throw fail('TEST_PROVIDER_UNAVAILABLE',503);}
   let url;try{url=new URL(s.url);}catch{throw fail('INVALID_TEST_SESSION',502);}
   if(s.object!=='checkout.session'||typeof s.id!=='string'||!/^cs_test_[A-Za-z0-9_]+$/.test(s.id)||s.livemode!==false||s.mode!=='subscription'||s.client_reference_id!==order.id||s.amount_total!==quote.amount_minor||s.currency!=='eur'||s.expires_at!==order.expires_at||url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.port||url.username||url.password||s.url.length>4096)throw fail('INVALID_TEST_SESSION',502);
   await this.db.batch([this.q('UPDATE dossivo_test_checkout_orders SET session_id=?,checkout_url=? WHERE id=? AND session_id IS NULL',s.id,s.url,order.id)]);
   order=await this.q('SELECT * FROM dossivo_test_checkout_orders WHERE id=?',order.id).first();
  }
  order=await this.q('SELECT * FROM dossivo_test_checkout_orders WHERE id=?',order.id).first();
  if(order.cancel_requested_at){try{await new TestCheckoutCancellation(this.db).cancel(actor,{organization_id:data.organization_id,draft_version:order.draft_version,confirmed:true},config,send);}catch{}throw fail('TEST_CANCELLATION_REQUESTED');}
  await current();
  return {order_id:order.id,checkout_url:order.checkout_url,expires_at:order.expires_at,test_only:true,entitlements_activated:false,evidence_access_granted:false};
 }
}
