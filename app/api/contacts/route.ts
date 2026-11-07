import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {ContactStore} from '@/lib/contact-store';
import {BridgeError} from '@/lib/paci-bridge-core';
import {readDemoCommand} from '@/lib/demo-session';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
function fail(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'CONTACT_UNAVAILABLE',error:e instanceof BridgeError?e.message:'Contact unavailable'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(request:Request){try{const user=await getCurrentUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);const store=new ContactStore(env.DB),url=new URL(request.url),id=url.searchParams.get('id');if(id)return Response.json(await store.lookup(user.userId,id),{headers});return Response.json({profile:await store.profile(user.userId),...await store.requests(user.userId)},{headers});}catch(e){return fail(e);}}
export async function POST(request:Request){try{const user=await getCurrentUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);const c=await readDemoCommand(request),store=new ContactStore(env.DB);let r;
 if(c.action==='profile')r=await store.ensureProfile(user.userId,c.data);
 else if(c.action==='request')r=await store.request(user.userId,c.data,c.idempotencyKey);
 else if(c.action==='respond')r=await store.respond(user.userId,c.data,c.idempotencyKey);
 else if(c.action==='block')r=await store.block(user.userId,c.data,c.idempotencyKey);
 else if(c.action==='referral')r=await store.referral(user.userId,c.data,c.idempotencyKey);
 else throw new BridgeError('INVALID_ACTION','Unsupported action');
 return Response.json(r,{headers});}catch(e){return fail(e);}}
