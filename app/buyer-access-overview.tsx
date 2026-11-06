'use client';
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
 return <section aria-label="授权总览 / Access overview"><h2>我的授权总览 / My access overview</h2>
  <p>按授权记录统计，不代表独立供应商数量或合规评分。状态随刷新更新；打开卡片时再次核验权限。</p>
  <label>授权状态 / Access status <select disabled={disabled} value={status} onChange={e=>{reset();setStatus(e.target.value);setCursor(null);}}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}{data?' ('+data.counts[key]+')':''}</option>)}</select></label>
  <button disabled={disabled} onClick={()=>{reset();setCursor(null);setRefresh(v=>v+1);}}>刷新总览 / Refresh</button>
  {data&&<><p>{Object.entries(labels).map(([key,label])=>`${label}: ${data.counts[key]}`).join(' · ')}</p><p>查询时间 / Checked: {new Date(data.measured_at).toLocaleString()}</p>
   {data.grants.map(g=><article className="buyer-record" key={g.id}>
    <strong>{g.organization??'历史授权 / Historical access'}</strong><p>{labels[g.status as keyof typeof labels]} · {g.access_mode==='CONTINUOUS_SUMMARY'?'持续摘要 / Continuous summary':'临时授权 / Temporary access'}</p>
    <p>授权编号 / Grant ID: {g.id}</p>
    <p>{g.version_policy==='FOLLOW_PUBLISHED'?'跟随已发布版本 / Follow published versions':'固定版本 / Fixed version'} · {g.expires_at?'截止 / Until: '+g.expires_at:'无固定到期日，可撤销 / Until revoked'}</p>
    {g.revoked_at&&<p>撤销时间 / Revoked: {g.revoked_at}</p>}
    {g.status==='ACTIVE'?<button disabled={disabled||loading} onClick={()=>onOpen(g.id)}>查看授权证据 / View evidence</button>:<p>在线材料不可读取；已下载副本不在此处重新提供。历史通信仍可从“直接通信”查看。 / Online evidence unavailable; existing downloads are not reissued here.</p>}
   </article>)}
   {!data.grants.length&&<p>此筛选下没有授权 / No access records for this filter.</p>}
   {cursor&&<button disabled={disabled||loading} onClick={()=>{reset();setCursor(null);}}>返回第一页 / First page</button>}
   {data.next_before&&<button disabled={disabled||loading} onClick={()=>{const next=data.next_before;reset();setCursor(next);}}>下一页 / Next page</button>}
  </>}
  {loading&&<p role="status">读取中 / Loading…</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
