'use client';
import {useEffect,useRef,useState} from 'react';
import {UIText} from './ui-language';
const copy={
 zh:{open:'与上一版本比较字段',close:'收起字段变化',loading:'正在比较…',error:'暂时无法比较，请收起后重试。',note:'仅比较相邻保存版本的字段、数值与确认次数；不涵盖全部材料或审核结论变化，也不代表独立核验。',empty:'字段值和确认次数没有变化。',added:'新增',removed:'移除',changed:'变化',before:'此前',after:'此后',missing:'不存在',unconfirmed:'未确认',extracted:'提取值',confirmed:'确认值',count:'确认次数',source:'材料编号',unit:'单位',total:'变化字段数',cap:'仅显示前100项变化。'},
 en:{open:'Compare fields with previous version',close:'Hide field changes',loading:'Comparing…',error:'Comparison unavailable. Close and retry.',note:'Compares fields, values and confirmation counts in adjacent saved versions, not all material or assessment changes. This is not independent verification.',empty:'No changes to field values or confirmation counts.',added:'Added',removed:'Removed',changed:'Changed',before:'Before',after:'After',missing:'Absent',unconfirmed:'Unconfirmed',extracted:'Extracted',confirmed:'Confirmed',count:'Confirmations',source:'Material ID',unit:'Unit',total:'Changed fields',cap:'Only the first 100 changes are shown.'},
 it:{open:'Confronta campi con la versione precedente',close:'Nascondi modifiche',loading:'Confronto in corso…',error:'Confronto non disponibile. Chiudi e riprova.',note:'Confronta campi, valori e numero di conferme tra versioni consecutive, non tutte le modifiche a materiali o valutazioni. Non è una verifica indipendente.',empty:'Nessuna modifica ai valori o al numero di conferme.',added:'Aggiunto',removed:'Rimosso',changed:'Modificato',before:'Prima',after:'Dopo',missing:'Assente',unconfirmed:'Non confermato',extracted:'Estratto',confirmed:'Confermato',count:'Conferme',source:'ID materiale',unit:'Unità',total:'Campi modificati',cap:'Sono mostrate solo le prime 100 modifiche.'}
};
export function TaskFieldChangeRows({report,language}:{report:any;language:'zh'|'en'|'it'}){
 const c=copy[language];
 function value(v:any){return v?<span>{c.source}: {v.material_id} · {c.unit}: <UIText>{v.unit}</UIText> · {c.extracted}: {v.extracted_value??'—'} · {c.confirmed}: {v.confirmed_value??c.unconfirmed} · {c.count}: {v.confirmation_count}</span>:c.missing;}
 return <div><p>{report.from_version} → {report.to_version} · {c.total}: {report.total}</p>{!report.total&&<p>{c.empty}</p>}<ul>{report.changes.map((r:any)=><li key={r.field_id}><strong><UIText>{(r.after??r.before).code}</UIText> · {c[r.kind as 'added'|'removed'|'changed']}</strong><p>{c.before}: {value(r.before)}</p><p>{c.after}: {value(r.after)}</p></li>)}</ul>{report.truncated&&<p>{c.cap}</p>}</div>;
}
export function TaskFieldChanges({taskId,version,language,read}:{taskId:string;version:number;language:'zh'|'en'|'it';read:(url:string)=>Promise<any>}){
 const c=copy[language],[open,setOpen]=useState(false),[report,setReport]=useState<any>(null),[error,setError]=useState(false),generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[]);
 async function toggle(){const ticket=++generation.current;if(open){setOpen(false);setReport(null);setError(false);return;}setOpen(true);setReport(null);setError(false);
  try{const params=new URLSearchParams({task:taskId,field_changes:String(version)}),data=await read('/api/private-tasks?'+params);if(ticket===generation.current)setReport(data);}catch{if(ticket===generation.current)setError(true);}
 }
 return <div><button type="button" aria-expanded={open} onClick={()=>void toggle()}>{open?c.close:c.open}</button>{open&&<><p>{c.note}</p>{error?<p role="alert">{c.error}</p>:report?<TaskFieldChangeRows report={report} language={language}/>:<p role="status">{c.loading}</p>}</>}</div>;
}
