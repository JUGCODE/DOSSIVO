'use client';
import {UIText,LocaleLink,useUILanguage} from '@/app/ui-language';
import {useEffect,useRef,useState} from 'react';
import {fetchRequestRecord} from '@/lib/request-record-download';
const errors:Record<string,string>={AUTH_REQUIRED:'登录已失效，请重新登录后下载。',ACCESS_UNAVAILABLE:'此请求当前不可访问，请刷新会话核对。',EXPORT_TOO_LARGE:'回应历史超过单次导出上限，未生成不完整文件。',INVALID_RESPONSE:'未收到有效记录文件，请重试。',DOWNLOAD_FAILED:'下载失败，请稍后重试。'};
export function RequestRecordDownload({grantId,requestId}:{grantId:string;requestId:string}){
 const uiLanguage=useUILanguage();
 const [language,setLanguage]=useState<string>(uiLanguage),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null;},[grantId,requestId]);
 async function download(format:'html'|'json'){
  if(active.current)return;
  const controller=new AbortController();active.current=controller;setBusy(true);setError('');setDone(false);
  try{
   const query=new URLSearchParams({grant:grantId,view:'request_export',request:requestId,format,lang:language});
   const blob=await fetchRequestRecord('/api/conversations?'+query,format,{signal:controller.signal});
   if(controller.signal.aborted||active.current!==controller)return;
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`DOSSIVO_Request_${requestId.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)}.${format}`;
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setDone(true);
  }catch(e){if(!controller.signal.aborted&&active.current===controller)setError((e as {code?:string}).code??'DOWNLOAD_FAILED');}
  finally{if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <div className="request-record-download"><label><UIText>{"导出语言 / Language"}</UIText><select value={language} disabled={busy} onChange={e=>setLanguage(e.target.value)}><option value="zh"><UIText>{"中文"}</UIText></option><option value="en"><UIText>{"English"}</UIText></option><option value="it"><UIText>{"Italiano"}</UIText></option></select></label><button disabled={busy} onClick={()=>void download('html')}><UIText>{"下载请求记录（可打印）"}</UIText></button><button disabled={busy} onClick={()=>void download('json')}><UIText>{"下载 JSON"}</UIText></button>{busy&&<p role="status"><UIText>{"正在生成记录…"}</UIText></p>}{done&&<p role="status"><UIText>{"已交给浏览器下载，请检查下载列表。记录仅反映导出时状态。"}</UIText></p>}{error&&<p role="alert"><UIText>{errors[error]??errors.DOWNLOAD_FAILED}</UIText>{error==='AUTH_REQUIRED'&&<> <LocaleLink href="/account?lang=zh"><UIText>{"前往登录"}</UIText></LocaleLink></>}</p>}</div>;
}
