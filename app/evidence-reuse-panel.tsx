'use client';

import {useEffect,useRef,useState} from 'react';
type Obj=Record<string,any>;

export function EvidenceReusePanel({taskId}:{taskId:string}) {
 const [usage,setUsage]=useState<Obj|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef(0);
 useEffect(()=>{current.current++;setUsage(null);setError('');return()=>{current.current++;};},[taskId]);
 async function load(){const request=++current.current;setBusy(true);setError('');setUsage(null);try{
  const response=await fetch('/api/basic-access?task='+encodeURIComponent(taskId)+'&usage=1',{cache:'no-store'});
  const data=await response.json() as Obj;
  if(!response.ok)throw Error(data.error??data.code??'Unable to read usage');
  if(current.current===request)setUsage(data.usage);
 }catch(e){if(current.current===request)setError((e as Error).message);}finally{if(current.current===request)setBusy(false);}}
 const totals=usage?.totals;
 return <details className="evidence-reuse-panel" onToggle={event=>{if(event.currentTarget.open&&!usage&&!busy)void load();}}>
  <summary>证据复用记录 / Evidence reuse</summary>
  <p>同一固定版本可分别授权多个接收人，每人使用独立授权码。以下仅统计本任务的合成流程，不作为真实客户或采购采用数据。</p>
  <p>当前企业与场所信息为自报；企业身份和签字权限核实、跨任务材料复用、买方明确接受、可比行业基准及正式链上核验仍待完成。</p>
  <button disabled={busy} onClick={()=>void load()}>刷新复用记录 / Refresh usage</button>
  {busy&&<p role="status">正在读取记录 / Loading usage…</p>}
  {error&&<p role="alert">{error}</p>}
  {totals&&<>
   <dl className="evidence-reuse-totals">
    <div><dt>独立读取账号 / Reader accounts</dt><dd>{totals.unique_reader_accounts}</dd></div>
    <div><dt>多人复用版本 / Reused versions</dt><dd>{totals.reused_card_versions}</dd></div>
    <div><dt>成功读取请求 / Read requests</dt><dd>{totals.read_requests}</dd></div>
    <div><dt>卡片下载请求 / Download requests</dt><dd>{totals.download_requests}</dd></div>
   </dl>
   <p>授权创建 {totals.grants_created} · 已兑换 {totals.grants_redeemed} · 当前有效 {totals.active_grants}（含待兑换）· 已撤销 {totals.revoked_grants}</p>
   <p>“多人复用版本”指同一固定卡被至少两个不同接收账号成功读取或请求下载。重复刷新和重复发码不会增加独立账号数；累计使用保留已到期、已撤销授权的历史。账号不等于已核实的买方企业，读取和下载不等于采购接受。</p>
   <div className="task-table"><table><caption>按固定卡片版本 / By fixed card version</caption><thead><tr><th>版本</th><th>授权 / 已兑换</th><th>独立账号</th><th>读取 / 下载请求</th><th>最近请求</th></tr></thead><tbody>{usage.cards.map((row:Obj)=><tr key={row.card_id}><td>v{row.task_version} · {row.card_id.slice(0,8)}</td><td>{row.grants_created} / {row.grants_redeemed}</td><td>{row.unique_reader_accounts}</td><td>{row.read_requests} / {row.download_requests}</td><td>{row.last_access_at??'尚无记录 / No requests'}</td></tr>)}</tbody></table></div>
   {!usage.cards.length&&<p>尚无固定卡片 / No fixed cards yet.</p>}
   <p>统计时间 / Measured: {usage.measured_at} · 最近成功请求 / Latest: {totals.last_access_at??'—'}</p>
   <p>已核实买方企业、明确采购接受、真实商业复用：尚未采集，不能以 0 或本页合成计数代替。</p>
  </>}
 </details>;
}
