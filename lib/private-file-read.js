import {BridgeError} from './paci-bridge-core.js';
import {PRIVATE_FILE_LIMIT} from './private-file-policy.js';
export async function readStoredFile(body,expectedSize){
 const invalid=()=>new BridgeError('FILE_INTEGRITY_FAILED','Stored file size mismatch',409);
 if(!Number.isSafeInteger(expectedSize)||expectedSize<=0||expectedSize>PRIVATE_FILE_LIMIT||!body?.getReader)throw invalid();
 const reader=body.getReader(),chunks=[];let size=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>expectedSize||size>PRIVATE_FILE_LIMIT){await reader.cancel();throw invalid();}chunks.push(value);}
 }finally{reader.releaseLock();}
 if(size!==expectedSize)throw invalid();
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
