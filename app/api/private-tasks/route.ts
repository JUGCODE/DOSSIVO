import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { BridgeError } from '@/lib/paci-bridge-core';
import { PrivateTaskStore } from '@/lib/private-task-store';
import { TaskRegistrationStore } from '@/lib/task-registration-store';
import { pilotBinding } from '@/lib/paci-http-client';
import {basicProjection,cardHtml,BASIC_FIELD_CODES} from '@/lib/basic-evidence-card';
import {MATERIAL_CATALOG,coverageFor} from '@/lib/evidence-coverage';
import { readDemoCommand } from '@/lib/demo-session';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
function fail(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'TASK_UNAVAILABLE',error:e instanceof BridgeError?e.message:'Task unavailable'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(req:Request){try{
  const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in to open private tasks',401);
  const store=new PrivateTaskStore(env.DB),url=new URL(req.url),id=url.searchParams.get('task');
  if(!id)return Response.json({tasks:await store.list(user.userId)},{headers});
  const card=url.searchParams.get('card');if(card){const saved=await store.exportCard(user.userId,id,card);if(url.searchParams.get('format')==='html')return new Response(cardHtml(basicProjection(saved,{fields:BASIC_FIELD_CODES,categories:MATERIAL_CATALOG.map(c=>c.code)})),{headers:{...headers,'content-type':'text/html; charset=utf-8','content-disposition':'attachment; filename="DOSSIVO_Evidence_Card.html"','content-security-policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'"}});return Response.json(saved,{headers});}
  const state=await store.read(user.userId,id);return Response.json({state,coverage:coverageFor(state),outbox:await store.outbox(user.userId,id)},{headers});
}catch(e){return fail(e);}}
export async function POST(req:Request){try{
  const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in to save private tasks',401);
  // Bounded, same-origin JSON reading. Route-specific fields are validated below.
  const input=await readDemoCommand(req);
  const data=input.data??{};
  if(input.action==='sync_registration'){
    if(typeof data.task_id!=='string'||typeof data.payload?.operation_id!=='string')throw new BridgeError('INVALID_INPUT','Task and operation are required');
    const binding=pilotBinding(env as unknown as Record<string,string>,user.userId);
    await new TaskRegistrationStore(env.DB).sync(user.userId,data.task_id,data.payload.operation_id,binding);
    const store=new PrivateTaskStore(env.DB);return Response.json({state:await store.read(user.userId,data.task_id),outbox:await store.outbox(user.userId,data.task_id)},{headers});
  }
  const cmd={action:input.action,idempotency_key:input.idempotencyKey,task_id:data.task_id,expected_version:data.expected_version,data:data.payload??{}};
  return Response.json(await new PrivateTaskStore(env.DB).command(user.userId,cmd),{headers});
}catch(e){return fail(e);}}
