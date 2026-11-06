import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {WorkbenchRequests} from '@/lib/workbench-requests';
import {BridgeError} from '@/lib/paci-bridge-core';
import {readDemoCommand} from '@/lib/demo-session';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
function fail(e:unknown){return Response.json({error:e instanceof BridgeError?e.message:'Request unavailable'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(req:Request){try{const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);return Response.json(await new WorkbenchRequests(env.DB).queue(user.userId,new URL(req.url).searchParams.get('before'),new URL(req.url).searchParams.get('status')??'ALL',new URL(req.url).searchParams.get('topic')??'ALL',new URL(req.url).searchParams.get('period')??'ALL'),{headers});}catch(e){return fail(e);}}
export async function POST(req:Request){try{const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);const cmd=await readDemoCommand(req);if(cmd.action!=='bind')throw new BridgeError('INVALID_ACTION','Unsupported action');return Response.json(await new WorkbenchRequests(env.DB).bind(user.userId,cmd.data),{headers});}catch(e){return fail(e);}}
