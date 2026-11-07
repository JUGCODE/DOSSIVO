"use client";
import {useEffect,useRef,useState} from 'react';
import {applicationCopy} from '@/lib/partner-application-copy';
type Language='zh'|'en'|'it';
export type ApplicationEvent={revision:number;action:string;status:string;reason:string;createdAt:string;role:string;actorId?:string};
const copy={
 zh:{title:'审核进度与历史记录',note:'以下是已记录的处理过程，历史批准不代表当前合同访问权限。此处不显示申请正文或合同条款。',refresh:'刷新最新记录',earlier:'加载更早记录',empty:'暂无处理记录。',loading:'正在读取记录…',error:'暂时无法读取记录，请重试。',denied:'当前没有查看权限，请重新登录或联系管理员。',revision:'修订',applicant:'申请人',reviewer:'审核员',actor:'操作账号',recorded:'已记录',actions:{submit:'提交申请',review:'资格审核',withdraw:'撤回申请'}},
 en:{title:'Review progress and history',note:'This is the recorded processing history. A past approval does not establish current contract access. Application text and contract terms are not shown here.',refresh:'Refresh latest records',earlier:'Load earlier records',empty:'No processing records yet.',loading:'Loading records…',error:'Unable to load records. Please retry.',denied:'Access is not available. Sign in again or contact an administrator.',revision:'Revision',applicant:'Applicant',reviewer:'Reviewer',actor:'Acting account',recorded:'Recorded',actions:{submit:'Application submitted',review:'Eligibility review',withdraw:'Application withdrawn'}},
 it:{title:'Avanzamento e cronologia',note:'Cronologia delle operazioni registrate. Un’approvazione passata non dimostra l’accesso attuale ai contratti. Testo della candidatura e condizioni contrattuali non sono mostrati.',refresh:'Aggiorna gli ultimi eventi',earlier:'Carica eventi precedenti',empty:'Nessuna operazione registrata.',loading:'Caricamento…',error:'Impossibile caricare gli eventi. Riprova.',denied:'Accesso non disponibile. Accedi nuovamente o contatta un amministratore.',revision:'Revisione',applicant:'Candidato',reviewer:'Revisore',actor:'Account operatore',recorded:'Registrato',actions:{submit:'Candidatura inviata',review:'Verifica di idoneità',withdraw:'Candidatura ritirata'}}
};
export function HistoryEntries({events,language}:{events:ApplicationEvent[];language:Language}){
 const c=copy[language],a=applicationCopy[language];
 return <ol className="partner-history-list">{events.map(event=>{const validTime=Number.isFinite(Date.parse(event.createdAt));return <li key={event.revision}><strong>{c.revision} {event.revision} · {c.actions[event.action as keyof typeof c.actions]??c.recorded}</strong><p>{a.states[event.status as keyof typeof a.states]??c.recorded} · {event.role==='reviewer'?c.reviewer:c.applicant}</p><time dateTime={validTime?event.createdAt:undefined}>{validTime?new Date(event.createdAt).toLocaleString(language==='zh'?'zh-CN':language==='it'?'it-IT':'en-GB'):'—'}</time>{event.reason&&a.reasons[event.reason as keyof typeof a.reasons]&&<p>{a.reasons[event.reason as keyof typeof a.reasons]}</p>}{event.actorId&&<p>{c.actor}: <code>{event.actorId}</code></p>}</li>;})}</ol>;
}
export default function ApplicationHistory({type,language,recipientId}:{type:string;language:Language;recipientId?:string}){
 const c=copy[language],sequence=useRef(0),controller=useRef<AbortController|null>(null);
 const [open,setOpen]=useState(false),[events,setEvents]=useState<ApplicationEvent[]>([]),[next,setNext]=useState<number|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function load(before:number|null=null){
 controller.current?.abort();const control=new AbortController();controller.current=control;const id=++sequence.current;setBusy(true);setMessage('');
 const q=new URLSearchParams({history:type});if(recipientId)q.set('recipientId',recipientId);if(before!==null)q.set('before',String(before));
 try{const response=await fetch('/api/partner-applications'+(recipientId?'/admin':'')+'?'+q,{cache:'no-store',signal:control.signal});if(id!==sequence.current)return;
 if(response.status===401||response.status===403){setEvents([]);setNext(null);setLoaded(false);setMessage(c.denied);return;}
 if(!response.ok)throw Error();const data=await response.json() as {events:ApplicationEvent[];hasMore:boolean;nextBefore:number|null};if(id!==sequence.current)return;
 setEvents(previous=>before===null?data.events:[...previous,...data.events.filter(e=>!previous.some(p=>p.revision===e.revision))]);setNext(data.hasMore?data.nextBefore:null);setLoaded(true);
 }catch{if(!control.signal.aborted&&id===sequence.current)setMessage(c.error);}finally{if(id===sequence.current)setBusy(false);}
 }
 useEffect(()=>{setEvents([]);setLoaded(false);setNext(null);setMessage('');if(open)void load();return()=>{sequence.current++;controller.current?.abort();};},[open,type,recipientId,language]);
 return <details className="partner-history" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{c.title}</summary>{open&&<><p>{c.note}</p><button disabled={busy} onClick={()=>load()}>{c.refresh}</button><p role="status">{message|| (busy?c.loading:'')}</p>{loaded&&events.length===0&&!message&&<p>{c.empty}</p>}<HistoryEntries events={events} language={language}/>{next!==null&&<button disabled={busy} onClick={()=>load(next)}>{c.earlier}</button>}</>}</details>;
}
