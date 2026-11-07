import {privateFileAccess} from './private-file-access.js';
import {BridgeError,requireSameOrigin} from './paci-bridge-core.js';
import {PrivateFileStore,readPrivateFile} from './private-file-store.js';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
export async function privateFileRequest(request,actor,db,bucket,allowedIds){
 try{
  if(!actor)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);
  const canUpload=privateFileAccess(actor,!!bucket,allowedIds).can_test;
  const url=new URL(request.url),task=url.searchParams.get('task'),id=url.searchParams.get('file'),store=new PrivateFileStore(db,bucket);
  if(request.method==='GET'){
   if(url.searchParams.get('history')==='1')return Response.json(await store.history(actor,task,url.searchParams.get('before')??''),{headers});
   if(!id)return Response.json({files:await store.list(actor,task),usage:await store.usage(actor,task),stage:'PRIVATE_UNREVIEWED',can_upload:canUpload,real_customer_intake:false},{headers});
   const file=await store.download(actor,task,id);
   return new Response(file.bytes,{headers:{...headers,'content-type':'application/octet-stream','content-disposition':"attachment; filename=\"DOSSIVO-private-file\"; filename*=UTF-8''"+encodeURIComponent(file.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()),'content-security-policy':"sandbox; default-src 'none'"}});
  }
  requireSameOrigin(request);
  if(request.method==='DELETE')return Response.json(await store.remove(actor,task,id),{headers});
  if(request.method!=='POST')return Response.json({code:'METHOD_NOT_ALLOWED'},{status:405,headers:{...headers,allow:'GET, POST, DELETE'}});
  const action=url.searchParams.get('action');
  if(action==='cleanup')return Response.json(await store.cleanup(actor,task),{headers});
  if(action)throw new BridgeError('INVALID_ACTION','Unsupported file action');
  if(!canUpload)throw new BridgeError('FILE_PILOT_CLOSED','New file uploads are not enabled',503);
  await store.owner(actor,task); // Authorize before reading any file bytes.
  if(request.headers.get('x-dossivo-file-confirmation')!=='synthetic-test-only-v1')throw new BridgeError('FILE_CONFIRMATION_REQUIRED','Only synthetic test fixtures are accepted in this pilot');
  let filename;try{filename=decodeURIComponent(request.headers.get('x-file-name')??'');}catch{throw new BridgeError('INVALID_FILENAME','Invalid filename');}
  const file=await readPrivateFile(request);
  return Response.json(await store.upload(actor,task,request.headers.get('idempotency-key'),filename,file),{status:201,headers});
 }catch(e){return Response.json({code:e instanceof BridgeError?e.code:'FILE_UNAVAILABLE'},{status:e instanceof BridgeError?e.status:503,headers});}
}
