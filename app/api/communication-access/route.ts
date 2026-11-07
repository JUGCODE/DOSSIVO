import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {CommunicationPolicyStore} from '@/lib/communication-policy';
import {BridgeError} from '@/lib/paci-bridge-core';
import {readDemoCommand} from '@/lib/demo-session';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
function fail(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'COMMUNICATION_UNAVAILABLE',error:e instanceof BridgeError?e.message:'Communication settings unavailable'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(){try{const user=await getCurrentUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);return Response.json(await new CommunicationPolicyStore(env.DB).status(user.userId),{headers});}catch(e){return fail(e);}}
export async function POST(request:Request){try{const user=await getCurrentUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);const c=await readDemoCommand(request);if(c.action!=='select_region')throw new BridgeError('INVALID_ACTION','Unsupported action');return Response.json(await new CommunicationPolicyStore(env.DB).select(user.userId,c.data),{headers});}catch(e){return fail(e);}}
