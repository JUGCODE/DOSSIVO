import {env} from 'cloudflare:workers';
import {BridgeError} from '@/lib/paci-bridge-core';
import {receivePaymentWebhook} from '@/lib/payment-webhook';
export const dynamic='force-dynamic';
const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
export async function POST(request:Request){try{
 const runtime=env as unknown as {DB?:D1Database;STRIPE_WEBHOOK_MODE?:string;STRIPE_WEBHOOK_SECRET?:string};
 return Response.json(await receivePaymentWebhook(request,runtime.DB,runtime),{headers});
}catch(e){return Response.json({code:e instanceof BridgeError?e.code:'RECEIPT_UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}}
