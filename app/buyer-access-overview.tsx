'use client';
import {UIError} from '@/app/ui-language';
import {UISection,UIText} from '@/app/ui-language';
import {useEffect,useRef,useState} from 'react';
type Grant={id:string;status:string;organization:string|null;access_mode:string;version_policy:string;expires_at:string|null;revoked_at:string|null;created_at:string};
type Overview={counts:Record<string,number>;grants:Grant[];next_before:string|null;measured_at:string};
const labels={ALL:'全部 / All',ACTIVE:'有效 / Active',EXPIRED:'已到期 / Expired',REVOKED:'已撤销 / Revoked'};
export function BuyerAccessOverview({onOpen,onReset,disabled,revision}:{onOpen:(id:string)=>void;onReset:()=>void;disabled:boolean;revision:number}){
 const [status,setStatus]=useState('ACTIVE'),[cursor,setCursor]=useState<string|null>(null),[data,setData]=useState<Overview|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>{
  const controller=new AbortController();active.current=controller;setData(null);setError('');setLoading(true);
  const query=new URLSearchParams({overview:'1',status});if(cursor)query.set('before',cursor);
  void fetch('/api/basic-access?'+query,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('授权列表暂不可用，请刷新重试。 / Access list unavailable; refresh to retry.');return r.json() as Promise<Overview>;}).then((d:Overview)=>{if(!controller.signal.aborted)setData(d);}).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[status,cursor,refresh,revision]);
 function reset(){active.current?.abort();setData(null);onReset();}
 return <UISection aria-label="授权总览 / Access overview"><h2><UIText>{"我的授权总览 / My access overview"}</UIText></h2>
  <p><UIText>{"按授权记录统计，不代表独立供应商数量或合规评分。状态随刷新更新；打开卡片时再次核验权限。"}</UIText></p>
  <label><UIText>{"授权状态 / Access status"}</UIText><select disabled={disabled} value={status} onChange={e=>{reset();setStatus(e.target.value);setCursor(null);}}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}><UIText>{label}</UIText><UIText>{data?' ('+data.counts[key]+')':''}</UIText></option>)}</select></label>
  <button disabled={disabled} onClick={()=>{reset();setCursor(null);setRefresh(v=>v+1);}}><UIText>{"刷新总览 / Refresh"}</UIText></button>
  {data&&<><p>{Object.entries(labels).map(([key,label])=><span key={key}><UIText>{label}</UIText>: {data.counts[key]} · </span>)}</p><p><UIText>{"查询时间 / Checked:"}</UIText><UIText>{new Date(data.measured_at).toLocaleString()}</UIText></p>
   {data.grants.map(g=><article className="buyer-record" key={g.id}>
    <strong>{g.organization??'历史授权 / Historical access'}</strong><p><UIText>{labels[g.status as keyof typeof labels]}</UIText> · <UIText>{g.access_mode==='CONTINUOUS_SUMMARY'?'持续摘要 / Continuous summary':'临时授权 / Temporary access'}</UIText></p>
    <p><UIText>{"授权编号 / Grant ID:"}</UIText>{g.id}</p>
    <p><UIText>{g.version_policy==='FOLLOW_PUBLISHED'?'跟随已发布版本 / Follow published versions':'固定版本 / Fixed version'}</UIText> · <UIText>{g.expires_at?'截止 / Until: '+g.expires_at:'无固定到期日，可撤销 / Until revoked'}</UIText></p>
    {g.revoked_at&&<p><UIText>{"撤销时间 / Revoked:"}</UIText><UIText>{g.revoked_at}</UIText></p>}
    {g.status==='ACTIVE'?<button disabled={disabled||loading} onClick={()=>onOpen(g.id)}><UIText>{"查看授权证据 / View evidence"}</UIText></button>:<p><UIText>{"在线材料不可读取；已下载副本不在此处重新提供。历史通信仍可从“直接通信”查看。 / Online evidence unavailable; existing downloads are not reissued here."}</UIText></p>}
   </article>)}
   {!data.grants.length&&<p><UIText>{"此筛选下没有授权 / No access records for this filter."}</UIText></p>}
   {cursor&&<button disabled={disabled||loading} onClick={()=>{reset();setCursor(null);}}><UIText>{"返回第一页 / First page"}</UIText></button>}
   {data.next_before&&<button disabled={disabled||loading} onClick={()=>{const next=data.next_before;reset();setCursor(next);}}><UIText>{"下一页 / Next page"}</UIText></button>}
  </>}
  {loading&&<p role="status"><UIText>{"读取中 / Loading…"}</UIText></p>}{error&&<p role="alert"><UIError>{error}</UIError></p>}
 </UISection>;
}
