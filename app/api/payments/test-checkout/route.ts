import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {readDemoCommand} from '@/lib/demo-session';
import {BridgeError} from '@/lib/paci-bridge-core';
import {TestCheckoutCancellation} from '@/lib/test-checkout-cancellation';
import {TestPaymentStatus} from '@/lib/test-payment-status';
import {TestCheckout,checkoutReady} from '@/lib/test-checkout';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
export async function GET(request:Request){try{const u=await getCurrentUser(),q=new URL(request.url).searchParams;if(q.has('organization')){if(!u)throw new BridgeError('AUTH_REQUIRED','Sign in',401);return Response.json(await new TestPaymentStatus(env.DB).status(u.userId,q.get('organization')),{headers});}return Response.json({test_checkout_available:!!u&&checkoutReady(env),live_checkout_available:false},{headers});}catch(e){return Response.json({code:e instanceof BridgeError?e.code:'UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}}
export async function POST(request:Request){try{const u=await getCurrentUser();if(!u)throw new BridgeError('AUTH_REQUIRED','Sign in',401);const c=await readDemoCommand(request);if(c.action==='cancel_test_checkout')return Response.json(await new TestCheckoutCancellation(env.DB).cancel(u.userId,c.data,env),{headers});if(c.action!=='create_test_checkout')throw new BridgeError('INVALID_ACTION','Unsupported action');return Response.json(await new TestCheckout(env.DB).create(u.userId,c.data,c.idempotencyKey,env),{headers});}catch(e){return Response.json({code:e instanceof BridgeError?e.code:'UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}}
