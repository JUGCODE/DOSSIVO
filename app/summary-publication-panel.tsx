'use client';
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
 return <details><summary>发布此授权的摘要更新 / Publish summary update（已更新 {grant.publication_seq} 次）</summary>
 <p>只发布给此授权绑定的接收账号。沿用原用途与材料类别，不含精确数值。不同主体、场所或期间须另建授权。</p>
 <label>选择更新卡片<select disabled={busy} value={candidate??''} onChange={e=>{setCard(e.target.value);setPreview(null);key.current=null;}}>{cards.map(c=><option value={c.id} key={c.id}>v{c.body.task_version} · {c.id.slice(0,8)}</option>)}</select></label>
 <button disabled={busy||!candidate} onClick={()=>void review()}>预览实际披露内容 / Preview</button>
 {preview&&<article><h4>发布预览 · v{preview.snapshot.task_version}</h4><p>{preview.snapshot.scope.organization} / {preview.snapshot.scope.facility} / {preview.snapshot.scope.period}</p><p>材料覆盖 {preview.snapshot.coverage.percent}% · 未解决事项 {preview.snapshot.issues.unresolved_count}（红色 {preview.snapshot.issues.red_count}）</p><details><summary>全部将交付的摘要字段 / Full disclosure</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(preview.snapshot,null,2)}</pre></details><p>点击后成为已发布历史记录；撤销授权可停止后续访问，但不能收回已有副本。</p><button disabled={busy} onClick={()=>void publish()}>确认发布给该授权买方 / Publish</button></article>}
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error} 如预览已过时，请重新预览。</p>}</details>;
}
