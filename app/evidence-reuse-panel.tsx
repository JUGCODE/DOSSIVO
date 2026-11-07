'use client';
import {UIError} from '@/app/ui-language';
import {UIText} from '@/app/ui-language';
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
  <summary><UIText>{"证据复用记录 / Evidence reuse"}</UIText></summary>
  <p><UIText>{"同一固定版本可分别授权多个接收人，每人使用独立授权码。以下仅统计本任务的合成流程，不作为真实客户或采购采用数据。"}</UIText></p>
  <p><UIText>{"当前企业与场所信息为自报；企业身份和签字权限核实、跨任务材料复用、买方明确接受、可比行业基准及正式链上核验仍待完成。"}</UIText></p>
  <button disabled={busy} onClick={()=>void load()}><UIText>{"刷新复用记录 / Refresh usage"}</UIText></button>
  {busy&&<p role="status"><UIText>{"正在读取记录 / Loading usage…"}</UIText></p>}
  {error&&<p role="alert"><UIError>{error}</UIError></p>}
  {totals&&<>
   <dl className="evidence-reuse-totals">
    <div><dt><UIText>{"独立读取账号 / Reader accounts"}</UIText></dt><dd><UIText>{totals.unique_reader_accounts}</UIText></dd></div>
    <div><dt><UIText>{"多人复用版本 / Reused versions"}</UIText></dt><dd><UIText>{totals.reused_card_versions}</UIText></dd></div>
    <div><dt><UIText>{"成功读取请求 / Read requests"}</UIText></dt><dd><UIText>{totals.read_requests}</UIText></dd></div>
    <div><dt><UIText>{"卡片下载请求 / Download requests"}</UIText></dt><dd><UIText>{totals.download_requests}</UIText></dd></div>
   </dl>
   <p><UIText>{"授权创建"}</UIText><UIText>{totals.grants_created}</UIText><UIText>{"· 已兑换"}</UIText><UIText>{totals.grants_redeemed}</UIText><UIText>{"· 当前有效"}</UIText><UIText>{totals.active_grants}</UIText><UIText>{"（含待兑换）· 已撤销"}</UIText><UIText>{totals.revoked_grants}</UIText></p>
   <p><UIText>{"“多人复用版本”指同一固定卡被至少两个不同接收账号成功读取或请求下载。重复刷新和重复发码不会增加独立账号数；累计使用保留已到期、已撤销授权的历史。账号不等于已核实的买方企业，读取和下载不等于采购接受。"}</UIText></p>
   <div className="task-table"><table><caption><UIText>{"按固定卡片版本 / By fixed card version"}</UIText></caption><thead><tr><th><UIText>{"版本"}</UIText></th><th><UIText>{"授权 / 已兑换"}</UIText></th><th><UIText>{"独立账号"}</UIText></th><th><UIText>{"读取 / 下载请求"}</UIText></th><th><UIText>{"最近请求"}</UIText></th></tr></thead><tbody>{usage.cards.map((row:Obj)=><tr key={row.card_id}><td><UIText>{"v"}</UIText><UIText>{row.task_version}</UIText> · <UIText>{row.card_id.slice(0,8)}</UIText></td><td><UIText>{row.grants_created}</UIText> / <UIText>{row.grants_redeemed}</UIText></td><td><UIText>{row.unique_reader_accounts}</UIText></td><td><UIText>{row.read_requests}</UIText> / <UIText>{row.download_requests}</UIText></td><td><UIText>{row.last_access_at??'尚无记录 / No requests'}</UIText></td></tr>)}</tbody></table></div>
   {!usage.cards.length&&<p><UIText>{"尚无固定卡片 / No fixed cards yet."}</UIText></p>}
   <p><UIText>{"统计时间 / Measured:"}</UIText><UIText>{usage.measured_at}</UIText><UIText>{"· 最近成功请求 / Latest:"}</UIText><UIText>{totals.last_access_at??'—'}</UIText></p>
   <p><UIText>{"已核实买方企业、明确采购接受、真实商业复用：尚未采集，不能以 0 或本页合成计数代替。"}</UIText></p>
  </>}
 </details>;
}
