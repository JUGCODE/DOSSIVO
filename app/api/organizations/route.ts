import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {readDemoCommand} from '@/lib/demo-session';
import {BridgeError} from '@/lib/paci-bridge-core';
import {OrganizationStore} from '@/lib/organization-store';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
async function actor(){const u=await getCurrentUser();if(!u)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);return u.userId;}
function fail(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(request:Request){try{const id=await actor(),org=new URL(request.url).searchParams.get('organization'),store=new OrganizationStore(env.DB);return Response.json(org?(new URL(request.url).searchParams.get('audit')==='1'?await store.audit(id,org,new URL(request.url).searchParams.get('before')):await store.members(id,org)):await store.list(id),{headers});}catch(e){return fail(e);}}
export async function POST(request:Request){try{const id=await actor(),c=await readDemoCommand(request);return Response.json(await new OrganizationStore(env.DB).command(id,c.action,c.data,c.idempotencyKey),{headers});}catch(e){return fail(e);}}
