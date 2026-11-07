'use client';
import {TaskFieldChanges} from './task-field-changes';
import {useEffect,useRef,useState} from 'react';
const copy={
 zh:{title:'历史版本概览',open:'查看历史版本',close:'收起历史版本',more:'加载更早版本',loading:'正在读取历史版本…',error:'暂时无法读取历史版本，请重试。',note:'只读概览：显示各版本保存时的数量，不代表材料已核验。本页不会回滚、修改或重新披露历史内容。',version:'版本',time:'保存时间',period:'期间',materials:'材料',fields:'字段',confirmed:'已确认字段',assessments:'检查记录',cards:'固定准备件',flags:'异常记录'},
 en:{title:'Version history overview',open:'View version history',close:'Hide history',more:'Load earlier versions',loading:'Loading version history…',error:'History is unavailable. Please retry.',note:'Read-only counts at each save; these do not establish verification. This view does not restore, modify or disclose historical content.',version:'Version',time:'Saved at',period:'Period',materials:'Materials',fields:'Fields',confirmed:'Confirmed fields',assessments:'Assessments',cards:'Frozen cards',flags:'Flag records'},
 it:{title:'Riepilogo delle versioni',open:'Visualizza cronologia',close:'Nascondi cronologia',more:'Carica versioni precedenti',loading:'Caricamento cronologia…',error:'Cronologia non disponibile. Riprova.',note:'Conteggi in sola lettura a ogni salvataggio; non attestano una verifica. Questa vista non ripristina, modifica o divulga contenuti storici.',version:'Versione',time:'Salvata il',period:'Periodo',materials:'Materiali',fields:'Campi',confirmed:'Campi confermati',assessments:'Valutazioni',cards:'Schede fissate',flags:'Segnalazioni'}
};
type Row={version:number;created_at:string;title:string;period:string;materials:number;fields:number;confirmed:number;assessments:number;cards:number;flags:number};
export function TaskHistoryRows({language,rows,taskId,read}:{language:'zh'|'en'|'it';rows:Row[];taskId?:string;read?:(url:string)=>Promise<any>}){
 const c=copy[language];return <ol>{rows.map(r=><li key={r.version}><strong>{c.version} {r.version} · {r.title}</strong><p>{c.time}: <time dateTime={r.created_at}>{r.created_at}</time> · {c.period}: {r.period}</p><p>{(['materials','fields','confirmed','assessments','cards','flags'] as const).map(k=>`${c[k]}: ${r[k]}`).join(' · ')}</p>{r.version>1&&taskId&&read&&<TaskFieldChanges taskId={taskId} version={r.version} language={language} read={read}/>}</li>)}</ol>;
}
export function TaskHistoryPanel({taskId,language,read}:{taskId:string;language:'zh'|'en'|'it';read:(url:string)=>Promise<any>}){
 const c=copy[language],[opened,setOpened]=useState(false),[rows,setRows]=useState<Row[]>([]),[next,setNext]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false),generation=useRef(0),lock=useRef(false);
 useEffect(()=>()=>{generation.current++;},[]);
 async function load(append=false){if(lock.current)return;lock.current=true;const ticket=++generation.current;setBusy(true);setError(false);
  try{const params=new URLSearchParams({task:taskId,history:'1'});if(append&&next)params.set('before',next);const data=await read('/api/private-tasks?'+params);if(ticket!==generation.current)return;setRows(previous=>append?[...previous,...data.versions.filter((r:Row)=>!previous.some(p=>p.version===r.version))]:data.versions);setNext(data.next_before);}
  catch{if(ticket===generation.current)setError(true);}finally{if(ticket===generation.current){lock.current=false;setBusy(false);}}
 }
 function close(){generation.current++;lock.current=false;setOpened(false);setBusy(false);setRows([]);setNext(null);setError(false);}
 return <section><h4>{c.title}</h4><button type="button" aria-expanded={opened} onClick={()=>{if(opened)close();else{setOpened(true);void load();}}}>{opened?c.close:c.open}</button>{opened&&<><p>{c.note}</p>{busy&&<p role="status">{c.loading}</p>}{error&&<p role="alert">{c.error}</p>}<TaskHistoryRows language={language} rows={rows} taskId={taskId} read={read}/>{(next||error)&&<button type="button" disabled={busy} onClick={()=>void load(rows.length>0&&!!next)}>{c.more}</button>}</>}</section>;
}
