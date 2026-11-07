import {privateFileInputError} from './private-file-policy.js';
export function fileEndpoint(task,id){return '/api/private-files?task='+encodeURIComponent(task)+(id?'&file='+encodeURIComponent(id):'');}
export function prepareFileUpload(file,confirmed,uuid=()=>crypto.randomUUID()){
 if(!confirmed)throw Error('FILE_CONFIRMATION_REQUIRED');
 const error=privateFileInputError(file);if(error)throw Error(error);
 // Retain this attempt across uncertain responses; never silently issue another key.
 return {file,key:uuid()};
}
/**
 * @param {typeof fetch} fetcher
 * @param {string} task
 * @param {{method?:string,id?:string,history?:boolean,before?:string,action?:'cleanup',attempt?:{file:File,key:string},signal?:AbortSignal}} options
 */
export async function requestPrivateFile(fetcher,task,{method='GET',id,history=false,before='',action,attempt,signal}={}){
 const options={method,cache:'no-store',signal};
 if(method==='POST'&&!action){
  if(!attempt?.file||!attempt?.key)throw Error('INVALID_REQUEST_KEY');
  options.headers={'content-type':attempt.file.type,'idempotency-key':attempt.key,'x-file-name':encodeURIComponent(attempt.file.name),'x-dossivo-file-confirmation':'synthetic-test-only-v1'};
  options.body=attempt.file;
 }
 const response=await fetcher(fileEndpoint(task,id)+(action?'&action='+encodeURIComponent(action):'')+(history?'&history=1&before='+encodeURIComponent(before):''),options);
 if(!response.ok){let data;try{data=await response.json();}catch{}throw Error(data?.code??(response.status===401?'AUTH_REQUIRED':'FILE_UNAVAILABLE'));}
 if(method==='GET'&&id){if(response.headers.get('content-type')?.split(';')[0]!=='application/octet-stream')throw Error('FILE_UNAVAILABLE');return response.blob();}
 return response.json();
}
