import {env} from 'cloudflare:workers';
import {BridgeError} from '@/lib/paci-bridge-core';
import {readDemoCommand} from '@/lib/demo-session';
import {ProofVerificationStore,verificationConfig} from '@/lib/proof-verification';
export const dynamic='force-dynamic';
const headers={'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
export async function POST(r:Request){try{const config=verificationConfig(env);if(!config||new URL(r.url).hostname!==config.domain)throw new BridgeError('VERIFY_UNAVAILABLE','Verification not configured on this domain',503);const input=await readDemoCommand(r);if(input.action!=='verify'||Object.keys(input.data).some(k=>k!=='code')||typeof input.data.code!=='string'||input.data.code.length>32)throw new BridgeError('INVALID_INPUT','Invalid verification input');return Response.json(await new ProofVerificationStore(env.DB).lookup(input.data.code,r.headers.get('cf-connecting-ip'),config,true),{headers});}catch(e){return Response.json({status:e instanceof BridgeError?e.code:'VERIFY_UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}}
