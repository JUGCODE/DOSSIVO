'use client';
import {UIError} from '@/app/ui-language';
import {UIText,LocaleLink} from '@/app/ui-language';
import {useEffect,useState} from 'react';
type Obj=Record<string,any>;
export function RelatedGrants({contactId,onOpen}:{contactId:string|null;onOpen:(grant:Obj)=>void}){
 const [data,setData]=useState<Obj|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[cursor,setCursor]=useState<string|null>(null),[history,setHistory]=useState<(string|null)[]>([]);
 useEffect(()=>{if(!contactId)return;const controller=new AbortController();setBusy(true);setError('');setData(null);
  fetch('/api/conversations?view=related_grants&grant='+encodeURIComponent(contactId)+(cursor?'&before='+encodeURIComponent(cursor):''),{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json() as Obj;if(!r.ok)throw Error(d.error);if(!controller.signal.aborted)setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();
 },[contactId,cursor,refresh]);
 if(!contactId)return null;
 return <details className="contact-help"><summary><UIText>{"双方已有的材料授权"}</UIText></summary><p><UIText>{"这里只列出已由对方账号兑换的授权。添加联系人不会自动共享材料。切换会话不会发送消息或标记已读。"}</UIText></p><button disabled={busy} onClick={()=>setRefresh(n=>n+1)}><UIText>{"刷新授权列表"}</UIText></button>{busy&&<p role="status"><UIText>{"正在核对授权…"}</UIText></p>}{error&&<p role="alert"><UIError>{error}</UIError></p>}{data&&!data.grants.length&&<p><UIText>{"尚无双方已兑换的材料授权。供应方可在材料工作台选择披露范围并生成授权码，再由接收方登录兑换。"}</UIText></p>}{data?.grants.map((g:Obj)=><article className="conversation-message" key={g.grant_id}><h4>{g.organization}</h4><p>{g.facility} · <UIText>{g.period}</UIText></p><p><UIText>{g.buyer?'我接收的授权':'我提供的授权'}</UIText> · <UIText>{g.evidence_active?(g.access_mode==='CONTINUOUS_SUMMARY'?'持续授权，直至撤销':'临时授权有效'):'材料授权已停止，历史通信仍保留'}</UIText></p><button onClick={()=>onOpen(g)}><UIText>{"进入此授权会话"}</UIText></button></article>)}{history.length>0&&<button disabled={busy} onClick={()=>{setCursor(history.at(-1)??null);setHistory(h=>h.slice(0,-1));}}><UIText>{"上一页"}</UIText></button>}{data?.next_before&&<button disabled={busy} onClick={()=>{setHistory(h=>[...h,cursor]);setCursor(data.next_before);}}><UIText>{"下一页"}</UIText></button>}<p><LocaleLink href="/#workspace"><UIText>{"前往材料工作台"}</UIText></LocaleLink> · <LocaleLink href="/eu-buyer"><UIText>{"兑换企业提供的授权码"}</UIText></LocaleLink></p><small><UIText>{"停止授权后不能读取卡片；已下载副本无法通过撤权收回。这里不自动生成新授权。"}</UIText></small></details>;
}
