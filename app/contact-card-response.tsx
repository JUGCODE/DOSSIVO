'use client';
import {useState,useRef,useEffect} from 'react';
type Obj=Record<string,any>;
export function ContactCardResponse({contactId,period,disabled,onSend}:{contactId:string;period:string;disabled:boolean;onSend:(grant:string,sequence:number)=>void}){
 const [grants,setGrants]=useState<Obj[]>([]),[next,setNext]=useState<string|null>(null),[grant,setGrant]=useState(''),[versions,setVersions]=useState<Obj[]>([]),[sequence,setSequence]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const current=useRef<AbortController|null>(null);
 useEffect(()=>()=>current.current?.abort(),[]);
 async function request(id?:string,more=false){current.current?.abort();const controller=new AbortController();current.current=controller;setBusy(true);setError('');setGrant(id??'');setSequence('');setVersions([]);if(!id&&!more)setGrants([]);
  try{const url=id?'/api/conversations?grant='+encodeURIComponent(id):'/api/conversations?grant='+encodeURIComponent(contactId)+'&view=related_grants'+(more&&next?'&before='+encodeURIComponent(next):'');
   const r=await fetch(url,{cache:'no-store',signal:controller.signal});const d=await r.json() as Obj;if(!r.ok)throw Error(d.error??'读取失败');if(controller.signal.aborted)return;
   if(id)setVersions(d.reference_versions??[]);else{const rows=d.grants.filter((g:Obj)=>!g.buyer&&g.evidence_active&&g.period===period);setGrants(old=>more?[...old,...rows]:rows);setNext(d.next_before);setLoaded(true);}
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(!controller.signal.aborted)setBusy(false);}
 }
 return <details className="contact-help" onToggle={e=>{if(e.currentTarget.open&&!loaded&&!busy)void request();}}><summary>用另行授权的卡片回应</summary><p>只可选你已向此联系人授权、对方已兑换且仍有效的同月份卡片。发送不新增授权，不表示请求已满足或核验通过。</p><button disabled={disabled||busy} onClick={()=>void request()}>刷新可用授权</button>
  <label>选择授权<select value={grant} disabled={disabled||busy} onChange={e=>{if(e.target.value)void request(e.target.value);else{current.current?.abort();setGrant('');setSequence('');setVersions([]);}}}><option value="">请明确选择</option>{grants.map(g=><option key={g.grant_id} value={g.grant_id}>{g.organization} · {g.period} · {g.grant_id.slice(0,8)}</option>)}</select></label>
  {next&&<button disabled={disabled||busy} onClick={()=>void request(undefined,true)}>查找更多授权</button>}
  {loaded&&!grants.length&&<p>当前页没有可用授权。可继续查找；尚未授权时，请先在材料工作台创建授权，并让对方兑换。</p>}
  {versions.length>0&&<label>固定版本<select value={sequence} disabled={disabled||busy} onChange={e=>setSequence(e.target.value)}><option value="">请选择版本</option>{versions.map(v=><option key={v.sequence} value={v.sequence}>v{v.task_version} · 发布 #{v.sequence} · {v.published_at}</option>)}</select></label>}
  <button disabled={disabled||busy||!grant||sequence===''||!versions.some(v=>v.sequence===Number(sequence))} onClick={()=>onSend(grant,Number(sequence))}>确认以此卡回应原请求</button>{busy&&<p role="status">正在核对授权…</p>}{error&&<p role="alert">{error}</p>}
 </details>;
}
