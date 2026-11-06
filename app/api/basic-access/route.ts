import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {BridgeError} from '@/lib/paci-bridge-core';
import {BuyerAccessStore} from '@/lib/buyer-access-store';
import {readDemoCommand} from '@/lib/demo-session';
import {cardHtml} from '@/lib/basic-evidence-card';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store, max-age=0','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
function fail(e:unknown){return Response.json({code:e instanceof BridgeError?e.code:'ACCESS_UNAVAILABLE',error:e instanceof BridgeError?e.message:'Access unavailable'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(request:Request){try{
 const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Register or sign in before accessing basic evidence',401);
 const store=new BuyerAccessStore(env.DB),url=new URL(request.url),task=url.searchParams.get('task'),id=url.searchParams.get('grant');
 if(url.searchParams.get('overview')==='1')return Response.json(await store.buyerOverview(user.userId,url.searchParams.get('status')??'ACTIVE',url.searchParams.get('before')),{headers});
 if(task)return Response.json(url.searchParams.get('usage')==='1'?{usage:await store.ownerUsage(user.userId,task)}:{grants:await store.ownerList(user.userId,task)},{headers});
 if(!id)return Response.json({received:await store.buyerList(user.userId)},{headers});
 const html=url.searchParams.get('format')==='html',view=await store.buyerRead(user.userId,id,html?'DOWNLOADED':'VIEWED',url.searchParams.has('sequence')?Number(url.searchParams.get('sequence')):null);
 if(html)return new Response(cardHtml(view),{headers:{...headers,'content-type':'text/html; charset=utf-8','content-disposition':'attachment; filename="DOSSIVO_Basic_Evidence_Card.html"','content-security-policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'"}});
 return Response.json(view,{headers});
}catch(e){return fail(e);}}
export async function POST(request:Request){try{
 const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Register or sign in before using access codes',401);
 const command=await readDemoCommand(request),d=command.data??{},store=new BuyerAccessStore(env.DB);let result;
 if(command.action==='create')result=await store.createGrant(user.userId,d,command.idempotencyKey);
 else if(command.action==='preview_publication')result=await store.previewPublication(user.userId,d);
 else if(command.action==='publish_summary')result=await store.publishSummary(user.userId,d,command.idempotencyKey);
 else if(command.action==='redeem')result=await store.redeem(user.userId,d.code,command.idempotencyKey);
 else if(command.action==='revoke')result=await store.revoke(user.userId,d.grant_id,command.idempotencyKey);
 else throw new BridgeError('INVALID_ACTION','Unsupported access operation');
 return Response.json(result,{headers});
}catch(e){return fail(e);}}
