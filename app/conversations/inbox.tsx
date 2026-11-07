'use client';
import {UIError} from '@/app/ui-language';
import {UIText,LocaleLink,UISpan,UISection} from '@/app/ui-language';
import {useState,useEffect,useRef} from 'react';
import {RelatedGrants} from '../related-grants';
import {ContactPanel} from '../contact-panel';
import {ConversationPanel} from '../conversation-panel';
type Obj=Record<string,any>;
export function ConversationInbox(){
 const request=useRef<AbortController|null>(null);
 const [authRequired,setAuthRequired]=useState(false);
 const [returnContact,setReturnContact]=useState<Obj|null>(null);
 const [items,setItems]=useState<Obj[]>([]),[total,setTotal]=useState(0),[selected,setSelected]=useState<Obj|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 async function load(){
  request.current?.abort();const controller=new AbortController();request.current=controller;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/conversations',{cache:'no-store',signal:controller.signal});
   if(controller.signal.aborted||request.current!==controller)return;
   if(r.status===401){setItems([]);setTotal(0);setSelected(null);setReturnContact(null);setAuthRequired(true);return;}
   const d=await r.json() as Obj;if(!r.ok)throw Error('暂时无法刷新会话，请重试。');
   if(controller.signal.aborted||request.current!==controller)return;
   setAuthRequired(false);setItems(d.conversations);setTotal(d.unread_total);
   // A deliberately opened, accepted contact may not have a first message yet.
   setSelected(current=>current?(d.conversations.find((c:Obj)=>c.grant_id===current.grant_id)??current):(d.conversations[0]??null));
  }catch(e){if(!controller.signal.aborted&&request.current===controller)setError('刷新失败；当前显示的是此前加载的记录，未读数可能已变化。请重试。');}
  finally{if(request.current===controller){request.current=null;setBusy(false);}}
 }
 useEffect(()=>{void load();return()=>{request.current?.abort();request.current=null;};},[]);
 if(authRequired)return <section role="alert"><h2><UIText>{"请重新登录"}</UIText></h2><p><UIText>{"登录已失效，已清除本页加载的会话。登录后可重新查看历史记录。"}</UIText></p><LocaleLink className="buyer-action" href="/signin-with-chatgpt?return_to=%2Fconversations" target="_top"><UIText>{"注册／登录"}</UIText></LocaleLink><button onClick={()=>void load()} disabled={busy}><UIText>{"重新检查登录状态"}</UIText></button>{error&&<p><UIText>{"暂时无法检查登录状态，请稍后重试。"}</UIText></p>}</section>;
 return <><section><h2><UIText>{"我的会话"}</UIText><UISpan className="conversation-badge" aria-label={'未读消息 '+total+' 条'}><UIText>{total}</UIText><UIText>{"未读"}</UIText></UISpan></h2><button disabled={busy} onClick={()=>void load()}><UIText>{"刷新会话与未读数"}</UIText></button><p><UIText>{"登录后自动打开最近会话。站内未读数随刷新更新。打开会话不会自动标为已读，可在阅读后明确标记。"}</UIText></p>{items.map(c=><button className="buyer-record" key={c.grant_id} onClick={()=>{setSelected(c);setReturnContact(null);}} aria-pressed={selected?.grant_id===c.grant_id}><strong>{c.organization}</strong> · <UIText>{c.contact_only?'联系人':c.buyer?'作为买方':'作为供应方'}</UIText><UIText>{"· 会话"}</UIText><UIText>{c.grant_id.slice(0,8)}</UIText><br/><UIText>{c.contact_only?c.public_id:c.facility+' / '+c.period}</UIText> · <UIText>{c.unread_count}</UIText><UIText>{"未读 ·"}</UIText><UIText>{c.contact_only?'材料需单独授权':c.evidence_active?'材料授权有效':'材料授权已停止，消息仍保留'}</UIText></button>)}{busy&&!items.length&&<p role="status"><UIText>{"正在加载会话…"}</UIText></p>}{!busy&&!error&&!items.length&&<p><UIText>{"还没有消息。添加联系人并等待对方接受后，即可开始通信；已有材料授权的会话也会显示在这里。"}</UIText></p>}{error&&<p role="alert"><UIError>{error}</UIError></p>}</section>{selected&&<section>{returnContact&&<button onClick={()=>{setSelected(returnContact);setReturnContact(null);}}><UIText>{"← 返回联系人对话"}</UIText></button>}<h2>{selected.organization}<UIText>{"· 会话"}</UIText><UIText>{selected.grant_id.slice(0,8)}</UIText></h2><RelatedGrants key={'related-'+selected.grant_id} contactId={selected.contact_only?selected.grant_id:null} onOpen={g=>{setReturnContact(selected);setSelected(g);}}/><ConversationPanel key={selected.grant_id} grantId={selected.grant_id} buyer={selected.buyer} expanded onChanged={()=>void load()}/></section>}{!selected&&<UISection aria-label="对话窗口"><h2><UIText>{"对话窗口"}</UIText></h2><p><UIText>{busy?'正在打开你的会话…':'尚未选择联系人。请在下方添加联系人，或打开已有联系人的通信窗口。'}</UIText></p></UISection>}<details className="contact-help" open={!selected||undefined}><summary><UIText>{"联系人与联系申请"}</UIText></summary><ContactPanel onOpen={c=>{setReturnContact(null);setSelected({grant_id:c.id,organization:c.display_name,buyer:false,contact_only:true});}}/></details></>;
}
