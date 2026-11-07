export class RecordDownloadError extends Error {
 constructor(code){super(code);this.code=code;}
}
// A successful auth redirect must never be saved as a purported evidence record.
/** @param {string} url @param {string} format @param {{signal?: AbortSignal, fetcher?: typeof fetch}} options */
export async function fetchRequestRecord(url,format,{signal,fetcher=fetch}={}){
 if(!['html','json'].includes(format))throw new RecordDownloadError('INVALID_FORMAT');
 const response=await fetcher(url,{cache:'no-store',signal,redirect:'error'});
 if(!response.ok){
  throw new RecordDownloadError(({401:'AUTH_REQUIRED',403:'ACCESS_UNAVAILABLE',404:'ACCESS_UNAVAILABLE',413:'EXPORT_TOO_LARGE'})[response.status]??'DOWNLOAD_FAILED');
 }
 const expected=format==='html'?'text/html':'application/json';
 const disposition=response.headers.get('content-disposition')??'';
 if((response.headers.get('content-type')??'').split(';')[0].trim()!==expected||!disposition.includes(`attachment; filename="DOSSIVO_Request_Record.${format}"`))throw new RecordDownloadError('INVALID_RESPONSE');
 const blob=await response.blob();
 if(!blob.size)throw new RecordDownloadError('INVALID_RESPONSE');
 return blob;
}
