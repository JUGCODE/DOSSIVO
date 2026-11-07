import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {readDemoCommand} from '@/lib/demo-session';
import {BridgeError} from '@/lib/paci-bridge-core';
import {WorkspaceStore} from '@/lib/workspace-store';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
function failure(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(r:Request){try{const u=await getCurrentUser();if(!u)throw new BridgeError('AUTH_REQUIRED','Sign in',401);const s=new WorkspaceStore(env.DB),params=new URL(r.url).searchParams,id=params.get('task');if(params.get('source')==='1'){const result=params.get('result'),material=params.get('material');if(!id||!result||!material)throw new BridgeError('INVALID_INPUT','Source identifiers required');return Response.json(await s.resultSource(u.userId,id,result,material),{headers});}if(params.get('audit')==='1'){if(!id)throw new BridgeError('INVALID_INPUT','Task required');return Response.json(await s.audit(u.userId,id,params.get('cursor')),{headers});}return Response.json(id?await s.accessDetail(u.userId,id):await s.listWorkspace(u.userId),{headers});}catch(e){return failure(e);}}
export async function POST(r:Request){try{const u=await getCurrentUser();if(!u)throw new BridgeError('AUTH_REQUIRED','Sign in',401);const c=await readDemoCommand(r);return Response.json(await new WorkspaceStore(env.DB).execute(u.userId,c.action,c.data,c.idempotencyKey),{headers});}catch(e){return failure(e);}}
