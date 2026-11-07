import {SubscriptionDrafts} from './subscription-drafts.js';
// Read-only reconciliation of signed TEST snapshots. Never a live entitlement decision.
export class TestPaymentStatus extends SubscriptionDrafts {
 async status(actor,organizationId){
  await this.owner(actor,organizationId);
  const order=await this.q('SELECT id,draft_version,session_id,quote_json,expires_at,cancel_requested_at,cancel_resolved_at,cancel_outcome,retry_attempts,retry_next_at,retry_lease_until,retry_last_code,retry_review FROM dossivo_test_checkout_orders WHERE organization_id=? ORDER BY draft_version DESC LIMIT 1',organizationId).first();
  const pending=(await this.q('SELECT draft_version,cancel_requested_at,retry_attempts,retry_next_at,retry_review FROM dossivo_test_checkout_orders WHERE organization_id=? AND cancel_requested_at IS NOT NULL AND cancel_outcome IS NULL ORDER BY draft_version LIMIT 21',organizationId).all()).results;
  const base={pending_cancellations:pending.slice(0,20),more_pending_cancellations:pending.length>20,test_only:true,entitlements_activated:false,evidence_access_granted:false,checked_at:this.clock()};
  if(!order)return {...base,status:'NO_TEST_ORDER',receipt_count:0};
  const current=(await this.read(actor,organizationId)).draft;
  const draft_current=current?.version===order.draft_version&&current.quote.status==='PREPARATION_ONLY';
  const result={...base,retry:{attempts:order.retry_attempts,limit:5,next_at:order.retry_next_at,lease_until:order.retry_lease_until,review_required:order.cancel_outcome==='COMPLETED_REVIEW'||(!order.cancel_outcome&&(order.retry_review===1||order.retry_attempts>=5)),last_code:order.retry_last_code},cancellation:order.cancel_outcome??(order.cancel_requested_at?'REQUESTED':'NOT_REQUESTED'),cancel_requested_at:order.cancel_requested_at,cancel_resolved_at:order.cancel_resolved_at,draft_version:order.draft_version,draft_current,receipt_count:0,expired:order.expires_at<=Math.floor(Date.parse(this.clock())/1000)};
  if(!order.session_id)return {...result,status:'SESSION_NOT_BOUND'};
  const rows=(await this.q("SELECT event_type,checkout_snapshot_json FROM dossivo_payment_test_receipts WHERE object_id=? AND event_type IN ('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed') ORDER BY event_created,event_id LIMIT 201",order.session_id).all()).results;
  result.receipt_count=rows.length;
  if(rows.length>200)return {...result,status:'REVIEW_REQUIRED',receipt_count_capped:true};
  if(!rows.length)return {...result,status:'WAITING_RECEIPT'};
  const quote=JSON.parse(order.quote_json);let paid=false,failed=false,review=false,mismatch=false;
  for(const r of rows){
   let s;try{s=JSON.parse(r.checkout_snapshot_json);}catch{review=true;continue;}
   if(!s){review=true;continue;}
   if(s.reference!==order.id||s.amount!==quote.amount_minor||s.currency!==quote.currency.toLowerCase()||s.mode!=='subscription'){mismatch=true;continue;}
   if(r.event_type==='checkout.session.async_payment_failed'){failed=true;if(s.payment_status==='paid')review=true;}
   else if(s.payment_status==='paid')paid=true;
   else if(s.payment_status!=='unpaid'||r.event_type==='checkout.session.async_payment_succeeded')review=true;
  }
  const status=mismatch?'DETAILS_MISMATCH':paid&&failed?'CONFLICTING_RECEIPTS':review?'REVIEW_REQUIRED':paid?'TEST_PAYMENT_MATCHED':failed?'TEST_PAYMENT_FAILED':'PAYMENT_PENDING';
  return {...result,status};
 }
}
