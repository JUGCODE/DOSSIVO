import {BridgeError} from './paci-bridge-core.js';
const LIMIT=262144;
const accepted=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','invoice.paid','invoice.payment_failed','customer.subscription.updated','customer.subscription.deleted']);
const invalid=()=>new BridgeError('INVALID_SIGNATURE','Invalid signature',400);
const encoder=new TextEncoder();
/** Signature verification follows https://docs.stripe.com/webhooks, manual HMAC section.
 * Verifies untouched bytes with WebCrypto; no browser identity or body metadata is trusted. */
export async function verifyStripeSignature(bytes,header,secret,now=Date.now()){
 if(typeof secret!=='string'||!secret.startsWith('whsec_')||secret.length<24)throw new BridgeError('PAYMENTS_DISABLED','Webhook not configured',503);
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>LIMIT||typeof header!=='string'||header.length>4096||!Number.isFinite(now))throw invalid();
 const parts=header.split(',').map(p=>p.trim().split('='));
 const times=parts.filter(p=>p[0]==='t'),signatures=parts.filter(p=>p[0]==='v1');
 if(times.length!==1||times[0].length!==2||!/^\d{10}$/.test(times[0][1])||!signatures.length||signatures.length>8||signatures.some(p=>p.length!==2||!/^[a-fA-F0-9]{64}$/.test(p[1])))throw invalid();
 const timestamp=times[0][1];if(Math.abs(Math.floor(now/1000)-Number(timestamp))>300)throw invalid();
 const prefix=encoder.encode(timestamp+'.'),signed=new Uint8Array(prefix.length+bytes.length);signed.set(prefix);signed.set(bytes,prefix.length);
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const matches=await Promise.all(signatures.map(p=>crypto.subtle.verify('HMAC',key,Uint8Array.from(p[1].match(/../g),x=>parseInt(x,16)),signed)));
 if(!matches.some(Boolean))throw invalid();
}
async function readBytes(request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new BridgeError('INVALID_CONTENT_TYPE','JSON required',415);
 if(request.headers.has('content-encoding')&&request.headers.get('content-encoding')!=='identity')throw new BridgeError('INVALID_CONTENT_ENCODING','Encoded body not supported',415);
 const length=request.headers.get('content-length');if(length&&(!/^\d+$/.test(length)||Number(length)>LIMIT))throw new BridgeError('PAYLOAD_TOO_LARGE','Body too large',413);
 const reader=request.body?.getReader();if(!reader)throw invalid();const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();throw new BridgeError('PAYLOAD_TOO_LARGE','Body too large',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}return body;
}
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_]{3,200}$/.test(x);
// Only fields needed for test-order comparison; no customer/contact/metadata retained.
function checkoutSnapshot(event){
 const o=event.data.object;
 if(!event.type.startsWith('checkout.session.')||o.object!=='checkout.session'||o.livemode!==false||typeof o.client_reference_id!=='string'||o.client_reference_id.length>200||!Number.isSafeInteger(o.amount_total)||o.amount_total<0||typeof o.currency!=='string'||!/^[a-z]{3}$/.test(o.currency)||!['subscription','payment','setup'].includes(o.mode)||!['paid','unpaid','no_payment_required'].includes(o.payment_status))return null;
 return JSON.stringify({reference:o.client_reference_id,amount:o.amount_total,currency:o.currency,mode:o.mode,payment_status:o.payment_status});
}
/** Public service endpoint: signature authentication, not same-origin/browser auth. TEST ONLY. */
export async function receivePaymentWebhook(request,db,config,now=Date.now()){
 if(config?.STRIPE_WEBHOOK_MODE!=='TEST_RECEIPT_ONLY'||!db||typeof config.STRIPE_WEBHOOK_SECRET!=='string'||config.STRIPE_WEBHOOK_SECRET.length<24)throw new BridgeError('PAYMENTS_DISABLED','Test receipt intake disabled',503);
 const bytes=await readBytes(request);await verifyStripeSignature(bytes,request.headers.get('stripe-signature'),config.STRIPE_WEBHOOK_SECRET,now);
 let event;try{event=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new BridgeError('INVALID_EVENT','Invalid JSON event');}
 if(!event||event.object!=='event'||!validId(event.id)||!event.id.startsWith('evt_')||typeof event.type!=='string'||!Number.isSafeInteger(event.created)||event.created<0||!event.data?.object||!validId(event.data.object.id))throw new BridgeError('INVALID_EVENT','Unsupported event shape');
 if(event.livemode!==false)throw new BridgeError('LIVE_PAYMENTS_DISABLED','Only test events allowed',403);
 if(Object.hasOwn(event,'account')||Object.hasOwn(event,'context'))throw new BridgeError('UNSUPPORTED_ACCOUNT','Connect and thin contexts not enabled',403);
 if(!accepted.has(event.type))return {received:true,ignored:true};
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 // Store minimal signed checkout comparison fields atomically with the receipt.
 const inserted=await db.prepare('INSERT INTO dossivo_payment_test_receipts(event_id,event_type,object_id,payload_hash,event_created,received_at,checkout_snapshot_json) VALUES(?,?,?,?,?,?,?) ON CONFLICT(event_id) DO NOTHING RETURNING event_id').bind(event.id,event.type,event.data.object.id,hash,event.created,new Date(now).toISOString(),checkoutSnapshot(event)).first();
 if(!inserted){const prior=await db.prepare('SELECT payload_hash FROM dossivo_payment_test_receipts WHERE event_id=?').bind(event.id).first();if(!prior||prior.payload_hash!==hash)throw new BridgeError('EVENT_CONFLICT','Event changed; reconcile before retry',409);}
 return {received:true,duplicate:!inserted,status:'VERIFIED_TEST_RECEIPT',entitlements_activated:false};
}
