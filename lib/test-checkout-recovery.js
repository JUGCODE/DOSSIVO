import {BridgeError} from './paci-bridge-core.js';
const fail=code=>new BridgeError(code,code,503);
// Recovery only reads existing provider sessions. It MUST NOT replay creation after stop intent.
export async function recoverTestSession(order,config,send=fetch){
 const created=Math.floor(Date.parse(order.created_at)/1000),quote=JSON.parse(order.quote_json);
 if(!Number.isSafeInteger(created)||!Number.isSafeInteger(order.expires_at)||order.expires_at<=created)throw fail('RECOVERY_REVIEW_REQUIRED');
 let cursor=null,candidate=null;const seen=new Set();
 for(let page=0;page<2;page++){
  const params=new URLSearchParams({limit:'100','created[gte]':String(Math.max(0,created-300)),'created[lte]':String(order.expires_at)});if(cursor)params.set('starting_after',cursor);
  let list;try{const r=await send('https://api.stripe.com/v1/checkout/sessions?'+params,{method:'GET',headers:{authorization:'Bearer '+config.STRIPE_TEST_SECRET_KEY,'Stripe-Version':'2026-10-28.endive'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();list=await r.json();}catch{throw fail('TEST_PROVIDER_UNAVAILABLE');}
  if(list?.object!=='list'||typeof list.has_more!=='boolean'||!Array.isArray(list.data)||list.data.length>100)throw fail('RECOVERY_REVIEW_REQUIRED');
  for(const s of list.data){
   if(!s||typeof s.id!=='string'||!/^cs_test_[A-Za-z0-9_]{1,190}$/.test(s.id)||seen.has(s.id))throw fail('RECOVERY_REVIEW_REQUIRED');seen.add(s.id);
   if(s.client_reference_id!==order.id)continue;
   if(s.object!=='checkout.session'||s.livemode!==false||s.mode!=='subscription'||s.amount_total!==quote.amount_minor||s.currency!==quote.currency.toLowerCase()||s.expires_at!==order.expires_at||!Number.isSafeInteger(s.created)||s.created<created-300||s.created>order.expires_at||!['open','expired','complete'].includes(s.status)||candidate)throw fail('RECOVERY_REVIEW_REQUIRED');
   candidate=s.id;
  }
  if(!list.has_more)return candidate;
  if(!list.data.length)throw fail('RECOVERY_REVIEW_REQUIRED');cursor=list.data.at(-1).id;
 }
 // Never bind a candidate from a truncated scan: another matching session may exist.
 throw fail('RECOVERY_SCAN_LIMIT');
}
