'use client';
import {UIError} from '@/app/ui-language';
import {UIText} from '@/app/ui-language';
import {useState,useRef,useEffect} from 'react';
export function MatchingTaskPicker({period,value,onChange}:{period:string;value:string;onChange:(id:string)=>void}){
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();},[]);
 const [rows,setRows]=useState<any[]>([]),[next,setNext]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 async function load(more=false){active.current?.abort();const ctrl=new AbortController();active.current=ctrl;setBusy(true);setError('');if(!more){onChange('');setRows([]);setNext(null);setLoaded(false);}try{const r=await fetch('/api/private-tasks?period='+encodeURIComponent(period)+(more&&next?'&before='+encodeURIComponent(next):''),{cache:'no-store',signal:ctrl.signal});const d=await r.json() as {error?:string;tasks:any[];next_before:string|null};if(ctrl.signal.aborted)return;if(!r.ok)throw Error(d.error);setRows(old=>more?[...old,...d.tasks]:d.tasks);setNext(d.next_before);setLoaded(true);}catch(e){if(!ctrl.signal.aborted)setError((e as Error).message);}finally{if(!ctrl.signal.aborted)setBusy(false);}}
 return <div><button disabled={busy} onClick={()=>void load()}><UIText>{"查找 / 刷新"}</UIText><UIText>{period}</UIText><UIText>{"的任务"}</UIText></button>{loaded&&<label><UIText>{"选择同月份任务"}</UIText><select disabled={busy} value={value} onChange={e=>onChange(e.target.value)}><option value=""><UIText>{"请选择任务"}</UIText></option>{rows.map(t=><option key={t.id} value={t.id}><UIText>{t.title}</UIText> · <UIText>{t.period}</UIText></option>)}</select></label>}{loaded&&!rows.length&&<p><UIText>{"该月份暂无任务，请在下方新建后刷新。"}</UIText></p>}{next&&<button disabled={busy} onClick={()=>void load(true)}><UIText>{"加载更多同月份任务"}</UIText></button>}{busy&&<p role="status"><UIText>{"查找中…"}</UIText></p>}{error&&<p role="alert"><UIError>{error}</UIError></p>}</div>;
}
