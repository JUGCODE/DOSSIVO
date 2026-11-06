import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {readDemoCommand} from '@/lib/demo-session';
import {BridgeError} from '@/lib/paci-bridge-core';
import {AccountContacts} from '@/lib/account-contacts';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
function fail(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}
async function actor(){const u=await getChatGPTUser();if(!u)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);return u.userId;}
export async function GET(){try{return Response.json(await new AccountContacts(env.DB).read(await actor()),{headers});}catch(e){return fail(e);}}
export async function POST(req:Request){try{const id=await actor(),cmd=await readDemoCommand(req);if(cmd.action!=='save_contacts')throw new BridgeError('INVALID_ACTION','Unsupported action');return Response.json(await new AccountContacts(env.DB).save(id,cmd.data),{headers});}catch(e){return fail(e);}}
