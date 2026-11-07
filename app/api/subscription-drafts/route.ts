import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {readDemoCommand} from '@/lib/demo-session';
import {BridgeError} from '@/lib/paci-bridge-core';
import {TestCheckoutCancellation} from '@/lib/test-checkout-cancellation';
import {SubscriptionDrafts} from '@/lib/subscription-drafts';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
async function actor(){const u=await getCurrentUser();if(!u)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);return u.userId;}
function fail(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(request:Request){try{const id=await actor(),q=new URL(request.url).searchParams,store=new SubscriptionDrafts(env.DB),org=q.get('organization');return Response.json(q.get('history')==='1'?await store.history(id,org,q.get('before')):await store.read(id,org),{headers});}catch(e){return fail(e);}}
export async function POST(request:Request){try{const id=await actor(),c=await readDemoCommand(request),store=new SubscriptionDrafts(env.DB);if(!['save_draft','withdraw_draft'].includes(c.action))throw new BridgeError('INVALID_ACTION','Unsupported action');const result=c.action==='withdraw_draft'?await store.withdraw(id,c.data,c.idempotencyKey):await store.save(id,c.data,c.idempotencyKey);if(c.action==='withdraw_draft'){try{await new TestCheckoutCancellation(env.DB).cancel(id,{organization_id:c.data.organization_id,draft_version:c.data.expected_version,confirmed:true},env);}catch{/* Withdrawal is committed; remote stop remains pending and can be retried. */}}return Response.json(result,{headers});}catch(e){return fail(e);}}
