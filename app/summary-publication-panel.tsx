'use client';
import {UIError} from '@/app/ui-language';
import {UIText} from '@/app/ui-language';
import {useState,useRef} from 'react';
type Obj=Record<string,any>;
export function SummaryPublicationPanel({grant,cards,onPublished}:{grant:Obj;cards:Obj[];onPublished:()=>Promise<void>}){
 const [card,setCard]=useState(''),[preview,setPreview]=useState<Obj|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const key=useRef<string|null>(null);
 const candidate=card||cards.at(-1)?.id;
 async function send(action:string,data:Obj){const r=await fetch('/api/basic-access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,data,idempotencyKey:key.current??crypto.randomUUID()})});const d=await r.json() as Obj;if(!r.ok)throw Error(d.error??d.code);return d;}
 async function review(){setBusy(true);setError('');setNotice('');setPreview(null);key.current=null;try{setPreview(await send('preview_publication',{grant_id:grant.id,card_id:candidate}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function publish(){if(!preview)return;setBusy(true);setError('');key.current??=crypto.randomUUID();try{await send('publish_summary',{grant_id:grant.id,card_id:preview.card_id,expected_sequence:preview.expected_sequence,projection_hash:preview.projection_hash});setPreview(null);key.current=null;setNotice('摘要已发布，买方可在原授权范围内查看；旧卡仍保留。');await onPublished();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(grant.version_policy!=='FOLLOW_PUBLISHED'||!grant.redeemed||grant.revoked_at)return null;
 return <details><summary><UIText>{"发布此授权的摘要更新 / Publish summary update（已更新"}</UIText><UIText>{grant.publication_seq}</UIText><UIText>{"次）"}</UIText></summary>
 <p><UIText>{"只发布给此授权绑定的接收账号。沿用原用途与材料类别，不含精确数值。不同主体、场所或期间须另建授权。"}</UIText></p>
 <label><UIText>{"选择更新卡片"}</UIText><select disabled={busy} value={candidate??''} onChange={e=>{setCard(e.target.value);setPreview(null);key.current=null;}}>{cards.map(c=><option value={c.id} key={c.id}><UIText>{"v"}</UIText>{c.body.task_version} · {c.id.slice(0,8)}</option>)}</select></label>
 <button disabled={busy||!candidate} onClick={()=>void review()}><UIText>{"预览实际披露内容 / Preview"}</UIText></button>
 {preview&&<article><h4><UIText>{"发布预览 · v"}</UIText><UIText>{preview.snapshot.task_version}</UIText></h4><p>{preview.snapshot.scope.organization} / {preview.snapshot.scope.facility} / <UIText>{preview.snapshot.scope.period}</UIText></p><p><UIText>{"材料覆盖"}</UIText><UIText>{preview.snapshot.coverage.percent}</UIText><UIText>{"% · 未解决事项"}</UIText><UIText>{preview.snapshot.issues.unresolved_count}</UIText><UIText>{"（红色"}</UIText><UIText>{preview.snapshot.issues.red_count}</UIText>）</p><details><summary><UIText>{"全部将交付的摘要字段 / Full disclosure"}</UIText></summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}><UIText>{JSON.stringify(preview.snapshot,null,2)}</UIText></pre></details><p><UIText>{"点击后成为已发布历史记录；撤销授权可停止后续访问，但不能收回已有副本。"}</UIText></p><button disabled={busy} onClick={()=>void publish()}><UIText>{"确认发布给该授权买方 / Publish"}</UIText></button></article>}
 {notice&&<p role="status"><UIText>{notice}</UIText></p>}{error&&<p role="alert"><UIError>{error}</UIError><UIText>{"如预览已过时，请重新预览。"}</UIText></p>}</details>;
}
