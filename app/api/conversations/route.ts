import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {ConversationStore} from '@/lib/conversation-store';
import {requestRecordHtml} from '@/lib/request-record-export';
import {cardHtml} from '@/lib/basic-evidence-card';
import {BridgeError} from '@/lib/paci-bridge-core';
import {readDemoCommand} from '@/lib/demo-session';
export const dynamic='force-dynamic';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
function fail(e:unknown){return Response.json({error:e instanceof BridgeError?e.message:'Conversation unavailable'},{status:e instanceof BridgeError?e.status:503,headers});}
export async function GET(request:Request){try{
 const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);
 const store=new ConversationStore(env.DB),url=new URL(request.url),grant=url.searchParams.get('grant');
 if(!grant&&url.searchParams.get('view')==='request_export')throw new BridgeError('INVALID_INPUT','Conversation required');
 if(!grant)return Response.json(await store.inbox(user.userId),{headers});
 if(url.searchParams.get('view')==='request_export'){
  const record=await store.requestRecord(user.userId,grant,url.searchParams.get('request'));
  const format=url.searchParams.get('format')??'html';
  if(!['html','json'].includes(format))throw new BridgeError('INVALID_INPUT','Unsupported export format');
  const downloadHeaders={...headers,'content-disposition':`attachment; filename="DOSSIVO_Request_Record.${format}"`};
  if(format==='json')return Response.json(record,{headers:downloadHeaders});
  return new Response(requestRecordHtml(record,url.searchParams.get('lang')??'zh'),{headers:{...downloadHeaders,'content-type':'text/html; charset=utf-8','content-security-policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'"}});
 }
 if(url.searchParams.get('view')==='related_grants')return Response.json(await store.relatedGrants(user.userId,grant,url.searchParams.get('before')),{headers});
 if(url.searchParams.get('view')==='requests')return Response.json(await store.requests(user.userId,grant,url.searchParams.has('before')?Number(url.searchParams.get('before')):null),{headers});
 const message=url.searchParams.get('reference');
 if(message){const html=url.searchParams.get('format')==='html',view=await store.reference(user.userId,grant,message,html?'DOWNLOADED':'VIEWED');
  if(html)return new Response(cardHtml(view,url.searchParams.get("lang")??"en"),{headers:{...headers,'content-type':'text/html; charset=utf-8','content-disposition':'attachment; filename="DOSSIVO_Referenced_Card.html"','content-security-policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'"}});
  return Response.json(view,{headers});
 }
 return Response.json(await store.thread(user.userId,grant,url.searchParams.has('before')?Number(url.searchParams.get('before')):null),{headers});
}catch(e){return fail(e);}}
export async function POST(request:Request){try{
 const user=await getChatGPTUser();if(!user)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);
 const cmd=await readDemoCommand(request),store=new ConversationStore(env.DB);
 if(cmd.action==='mark_read')return Response.json(await store.markRead(user.userId,cmd.data),{headers});
 if(cmd.action!=='send')throw new BridgeError('INVALID_ACTION','Unsupported action');
 return Response.json(await store.send(user.userId,cmd.data,cmd.idempotencyKey),{headers});
}catch(e){return fail(e);}}
