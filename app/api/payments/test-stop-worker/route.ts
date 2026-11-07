import {env} from 'cloudflare:workers';
import {authorizeStopWorker,TestStopWorker} from '@/lib/test-stop-worker';
import {BridgeError} from '@/lib/paci-bridge-core';
export const dynamic='force-dynamic';
const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
export async function POST(request:Request){try{await authorizeStopWorker(request,env);return Response.json(await new TestStopWorker(env.DB).run(env),{headers});}catch(e){return Response.json({code:e instanceof BridgeError?e.code:'UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}}
