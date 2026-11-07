import catalog from './subscription-catalog.json' with {type:'json'};
import {OrganizationStore} from './organization-store.js';
import {BridgeError,fingerprint} from './paci-bridge-core.js';
export function subscriptionQuote(data){
 if(!data||Object.keys(data).some(k=>!['organization_id','expected_version','catalog_version','plan_id','cycle','confirmed'].includes(k)))throw new BridgeError('INVALID_INPUT','Unsupported quote field');
 if(data.catalog_version!==catalog.version)throw new BridgeError('CATALOG_CHANGED','Refresh current catalog',409);
 if(!Number.isSafeInteger(data.expected_version)||data.expected_version<0||data.confirmed!==true)throw new BridgeError('INVALID_INPUT','Confirm preparation only');
 const plan=catalog.plans.find(p=>p.id===data.plan_id);
 if(!plan||!['annual','monthly'].includes(data.cycle)||plan[data.cycle]===null)throw new BridgeError('INVALID_PLAN','Plan or cycle unavailable');
 return {catalog_version:catalog.version,plan_id:plan.id,cycle:data.cycle,currency:catalog.currency,amount_minor:plan[data.cycle]*100,
  quote_required:plan.quote_required,status:'PREPARATION_ONLY',tax_status:'TO_BE_CONFIRMED',founder_status:'NOT_ASSESSED',founder_slot_reserved:false,payment_status:'NOT_CONNECTED',entitlements_activated:false,evidence_access_granted:false};
}
export class SubscriptionDrafts extends OrganizationStore {
 decode(row){return row?{version:row.version,created_at:row.created_at,quote:JSON.parse(row.quote_json)}:null;}
 async read(actor,id){await this.owner(actor,id);const row=await this.q('SELECT version,quote_json,created_at FROM dossivo_subscription_drafts WHERE organization_id=? ORDER BY version DESC LIMIT 1',id).first();return {draft:this.decode(row),catalog_version:catalog.version,checkout_enabled:false};}
 /** @param {string|null} before */
 async history(actor,id,before=null){
  await this.owner(actor,id);
  if(before!==null&&(!/^[1-9][0-9]{0,9}$/.test(before)||!Number.isSafeInteger(Number(before))))throw new BridgeError('INVALID_INPUT','Invalid history cursor');
  const rows=(await this.q('SELECT version,quote_json,created_at FROM dossivo_subscription_drafts WHERE organization_id=? AND (? IS NULL OR version<?) ORDER BY version DESC LIMIT 51',id,before,Number(before)).all()).results;
  return {drafts:rows.slice(0,50).map(r=>this.decode(r)),next_before:rows.length>50?String(rows[49].version):null};
 }
 async save(actor,data,key){
  await this.owner(actor,data?.organization_id);
  return this.append(actor,data,key,subscriptionQuote(data),await fingerprint(data));
 }
 async withdraw(actor,data,key){
  await this.owner(actor,data?.organization_id);
  if(Object.keys(data).some(k=>!['organization_id','expected_version','confirmed'].includes(k))||data.confirmed!==true||!Number.isSafeInteger(data.expected_version)||data.expected_version<1)throw new BridgeError('INVALID_INPUT','Confirm withdrawal of an existing preparation');
  const hash=await fingerprint({action:'withdraw_preparation',data});
  const prior=await this.draftReplay(actor,key,hash);if(prior)return {draft:this.decode(prior),replayed:true};
  const current=(await this.read(actor,data.organization_id)).draft;
  if(!current||current.version!==data.expected_version||current.quote.status!=='PREPARATION_ONLY')throw new BridgeError('VERSION_CONFLICT','Refresh before withdrawing',409);
  return this.append(actor,data,key,{...current.quote,status:'WITHDRAWN',withdrawn_from_version:current.version},hash);
 }
 async draftReplay(actor,key,hash){
  if(typeof key!=='string'||!key.trim()||key.length>128)throw new BridgeError('INVALID_INPUT','Request key required');
  const p=await this.q('SELECT * FROM dossivo_subscription_drafts WHERE actor_id=? AND request_key=?',actor,key).first();
  if(p&&p.command_hash!==hash)throw new BridgeError('IDEMPOTENCY_CONFLICT','Key already used',409);return p;
 }
 async append(actor,data,key,quote,hash){
  const prior=await this.draftReplay(actor,key,hash);if(prior)return {draft:this.decode(prior),replayed:true};
  const now=this.clock(),version=data.expected_version+1;
  try{await this.db.batch([
   this.q('INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN COALESCE(MAX(version),0)=? THEN 1 ELSE 0 END FROM dossivo_subscription_drafts WHERE organization_id=?',this.uuid(),data.expected_version,data.organization_id),
   this.q('INSERT INTO dossivo_subscription_drafts(organization_id,version,actor_id,request_key,command_hash,quote_json,created_at) VALUES(?,?,?,?,?,?,?)',data.organization_id,version,actor,key,hash,JSON.stringify(quote),now),
   ...(quote.status==='WITHDRAWN'?[this.q('UPDATE dossivo_test_checkout_orders SET cancel_requested_at=COALESCE(cancel_requested_at,?) WHERE organization_id=? AND draft_version=?',now,data.organization_id,data.expected_version)]:[])
  ]);}catch(e){const p=await this.draftReplay(actor,key,hash);if(p)return {draft:this.decode(p),replayed:true};if(/UNIQUE|CHECK|constraint/i.test(String(e)))throw new BridgeError('VERSION_CONFLICT','Refresh draft before changing',409);throw e;}
  return {draft:{version,created_at:now,quote},replayed:false};
 }
}
