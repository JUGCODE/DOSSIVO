"use client";
import { useEffect, useState } from "react";
import type { ProductLang } from "./compliance-home";

type Saved = { id: string; case_version: number };
type SnapshotView = {
  id: string; case_version: number; created_at: string; local_content_sha256: string;
  digest_check: "MATCHED_LOCAL_CONTENT"; verification: "UNVERIFIED"; proof_package: null; synthetic_demo: true;
  scope: Record<string, string>;
  facts: {local_ref: string; label: string; value: string; source_label: string; confirmed_by_company: boolean}[];
  gaps: {local_ref: string; title: string; status: string}[];
};
type Change = {group: "scope" | "facts" | "gaps"; ref: string; field: string; before: unknown; after: unknown; kind: "ADDED" | "REMOVED" | "CHANGED"};
type Comparison = { format: "dossivo-snapshot-comparison/0.1"; before: SnapshotView; after: SnapshotView; changes: Change[]; verification: "UNVERIFIED"; proof_package: null };
const COPY = {
 zh: {title:"查看保存内容与版本差异", note:"按保存时的固定内容查看，不使用当前工作台内容替换历史。摘要匹配只说明本地保存内容一致，不代表 PACI 登记、独立核验或合规结论。",baseline:"对比基准版本",none:"仅查看所选版本",loading:"正在读取固定版本…",error:"无法读取或核对这些版本，请刷新后重试。",auth:"登录已失效，请重新登录后查看。",scope:"范围",facts:"事实与企业确认",gaps:"保存时的缺口",empty:"此版本没有保存的条目。",noChanges:"两个版本的范围、事实与缺口没有差异；保存时间和版本号不计入内容差异。",before:"基准版本",after:"所选版本",field:"字段／条目",change:"变化",version:"版本",digest:"本地内容摘要匹配",fact:"事实",value:"内容",source:"来源说明",confirmation:"企业确认",yes:"已确认",no:"未确认",absent:"无",added:"新增",removed:"移除",changed:"修改",details:"查看固定版本内容", fields:{organization:"企业",product:"产品",facility:"工厂",market:"市场",period:"期间",ruleSet:"规则标签",label:"名称",value:"内容",source_label:"来源说明",confirmed_by_company:"企业确认",title:"缺口",status:"业务状态",record:"完整条目"}},
 en: {title:"Saved contents and version changes",note:"Review the content frozen at save time. Current workspace data never replaces this history. A matching local digest does not establish PACI registration, independent verification or compliance.",baseline:"Baseline version",none:"View selected version only",loading:"Loading fixed versions…",error:"These versions could not be retrieved or checked. Refresh and retry.",auth:"Your sign-in expired. Sign in again to review.",scope:"Scope",facts:"Facts and company confirmations",gaps:"Gaps at save time",empty:"No entries were saved in this version.",noChanges:"No scope, fact or gap differences. Save times and version numbers are excluded from content changes.",before:"Baseline version",after:"Selected version",field:"Field / entry",change:"Change",version:"Version",digest:"Local content digest matched",fact:"Fact",value:"Content",source:"Source description",confirmation:"Company confirmation",yes:"Confirmed",no:"Not confirmed",absent:"None",added:"Added",removed:"Removed",changed:"Changed",details:"View fixed-version contents",fields:{organization:"Company",product:"Product",facility:"Factory",market:"Market",period:"Period",ruleSet:"Rule label",label:"Label",value:"Content",source_label:"Source description",confirmed_by_company:"Company confirmation",title:"Gap",status:"Business status",record:"Complete entry"}},
 it: {title:"Contenuti salvati e differenze tra versioni",note:"Consulta i contenuti fissati al salvataggio. I dati attuali non sostituiscono la cronologia. La corrispondenza dell’impronta locale non dimostra registrazione PACI, verifica indipendente o conformità.",baseline:"Versione di riferimento",none:"Mostra solo la versione selezionata",loading:"Caricamento delle versioni fissate…",error:"Impossibile leggere o controllare le versioni. Aggiorna e riprova.",auth:"Sessione scaduta. Accedi nuovamente.",scope:"Ambito",facts:"Fatti e conferme dell’impresa",gaps:"Lacune al salvataggio",empty:"Nessuna voce salvata in questa versione.",noChanges:"Nessuna differenza in ambito, fatti o lacune. Date di salvataggio e numeri di versione sono esclusi.",before:"Versione di riferimento",after:"Versione selezionata",field:"Campo / voce",change:"Modifica",version:"Versione",digest:"Impronta locale corrispondente",fact:"Fatto",value:"Contenuto",source:"Descrizione della fonte",confirmation:"Conferma dell’impresa",yes:"Confermato",no:"Non confermato",absent:"Nessuno",added:"Aggiunto",removed:"Rimosso",changed:"Modificato",details:"Consulta i contenuti fissati",fields:{organization:"Impresa",product:"Prodotto",facility:"Stabilimento",market:"Mercato",period:"Periodo",ruleSet:"Etichetta della regola",label:"Nome",value:"Contenuto",source_label:"Descrizione della fonte",confirmed_by_company:"Conferma dell’impresa",title:"Lacuna",status:"Stato operativo",record:"Voce completa"}}
};
function isSnapshot(value: unknown, id: string): value is SnapshotView {
 if (!value || typeof value !== "object") return false;
 const v=value as SnapshotView;
 return v.id===id && v.synthetic_demo===true && v.verification==="UNVERIFIED" && v.proof_package===null
  && v.digest_check==="MATCHED_LOCAL_CONTENT" && /^[a-f0-9]{64}$/.test(v.local_content_sha256)
  && !!v.scope && typeof v.scope==="object" && Array.isArray(v.facts) && Array.isArray(v.gaps);
}
function isComparison(value: unknown, before: string, after: string): value is Comparison {
 if (!value || typeof value !== "object") return false;
 const v=value as Comparison;
 return v.format==="dossivo-snapshot-comparison/0.1" && v.verification==="UNVERIFIED" && v.proof_package===null
  && isSnapshot(v.before,before) && isSnapshot(v.after,after) && Array.isArray(v.changes)
  && v.changes.every(c=>c && ["scope","facts","gaps"].includes(c.group) && ["ADDED","REMOVED","CHANGED"].includes(c.kind)
    && typeof c.ref==="string" && typeof c.field==="string");
}
export function SnapshotInspector({language, snapshots, selectedId, disabled}:{language:ProductLang; snapshots:Saved[]; selectedId:string; disabled:boolean}) {
 const t=COPY[language]; const [baseline,setBaseline]=useState(""); const [loading,setLoading]=useState(false);
 const [result,setResult]=useState<{key:string; selected:SnapshotView; comparison:Comparison|null}|null>(null);
 const [error,setError]=useState<"auth"|"error"|null>(null);
 const [retry,setRetry]=useState(0);
 const compareId=baseline!==selectedId && snapshots.some(s=>s.id===baseline)?baseline:"";
 const key=`${selectedId}:${compareId}`;
 useEffect(()=>{
  const controller=new AbortController();
  setResult(null);setError(null);
  if(disabled || !selectedId) {setLoading(false); return ()=>controller.abort();}
  setLoading(true);
  const params=compareId ? new URLSearchParams({view:"compare",before:compareId,after:selectedId}):new URLSearchParams({view:"snapshot",snapshot_id:selectedId});
  void (async()=>{
   try {
    const response=await fetch(`/api/paci-bridge?${params}`,{cache:"no-store",credentials:"same-origin",signal:controller.signal});
    if(response.status===401){if(!controller.signal.aborted)setError("auth");return;}
    if(!response.ok) throw new Error("Snapshot request failed");
    const data=await response.json();
    if(compareId){
     if(!isComparison(data,compareId,selectedId)) throw new Error("Invalid comparison");
     if(!controller.signal.aborted)setResult({key,selected:data.after,comparison:data});
    }else{
     if(!isSnapshot(data,selectedId))throw new Error("Invalid snapshot");
     if(!controller.signal.aborted)setResult({key,selected:data,comparison:null});
    }
   }catch{if(!controller.signal.aborted)setError("error");}
   finally{if(!controller.signal.aborted)setLoading(false);}
  })();return ()=>controller.abort();
 },[selectedId,compareId,key,disabled,retry]);
 const current=!disabled && result?.key===key?result:null;
 const fieldName=(field:string)=>t.fields[field as keyof typeof t.fields]??field;
 const show=(value:unknown):string=>value===null||value===undefined?t.absent:typeof value==="boolean"?value?t.yes:t.no:typeof value==="object"?Object.entries(value).map(([k,v])=>`${fieldName(k)}: ${show(v)}`).join(" · "):String(value);
 return <div className="mt-5 rounded-2xl border border-emerald-200/15 bg-[#07110f]/60 p-4 sm:p-5">
  <h3 className="font-semibold text-white">{t.title}</h3><p className="mt-2 text-xs leading-6 text-[#a8bdb5]">{t.note}</p>
  <label className="mt-4 block text-sm text-[#dce9e3]">{t.baseline}<select value={compareId} disabled={disabled} onChange={e=>setBaseline(e.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-white/15 bg-[#0c1815] px-3 text-white"><option value="">{t.none}</option>{snapshots.filter(s=>s.id!==selectedId).map(s=><option key={s.id} value={s.id}>{t.version} {s.case_version}</option>)}</select></label>
  <div aria-live="polite" role="status">{loading&&<p className="mt-4 text-sm text-[#a8bdb5]">{t.loading}</p>}</div>
  {error&&<div role="alert" className="mt-4 text-sm text-red-100"><p>{t[error]}</p><button type="button" onClick={()=>setRetry(v=>v+1)} disabled={disabled} aria-label={t.title} className="mt-2 min-h-11 rounded-lg border border-white/15 px-4">↻</button></div>}
  {current&&<>
   <div className="mt-4 text-xs leading-6 text-emerald-200">{t.digest} · v{current.selected.case_version}<code className="mt-1 block break-all text-[#99aea5]">SHA-256 {current.selected.local_content_sha256}</code></div>
   {current.comparison&&<div className="mt-4"><p className="text-sm text-white">{t.before} v{current.comparison.before.case_version} → {t.after} v{current.comparison.after.case_version}</p>{current.comparison.changes.length===0?<p className="mt-3 text-sm leading-6 text-[#a8bdb5]">{t.noChanges}</p>:<div className="mt-3 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><caption className="sr-only">{t.title}</caption><thead className="text-[#99aea5]"><tr>{[t.field,t.change,t.before,t.after].map(h=><th key={h} scope="col" className="border-b border-white/10 p-3">{h}</th>)}</tr></thead><tbody>{current.comparison.changes.map((c,i)=><tr key={i} className="align-top text-[#dce9e3]"><th scope="row" className="max-w-48 break-words border-b border-white/5 p-3 font-normal">{t[c.group]} · {c.ref} · {fieldName(c.field)}</th><td className="border-b border-white/5 p-3">{c.kind==="ADDED"?t.added:c.kind==="REMOVED"?t.removed:t.changed}</td><td className="max-w-72 whitespace-pre-wrap break-words border-b border-white/5 p-3">{show(c.before)}</td><td className="max-w-72 whitespace-pre-wrap break-words border-b border-white/5 p-3">{show(c.after)}</td></tr>)}</tbody></table></div>}</div>}
   <details className="mt-4" open={!current.comparison}><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-white">{t.details} · v{current.selected.case_version}</summary><h4 className="mt-3 text-sm font-semibold text-white">{t.scope}</h4><dl className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(current.selected.scope).map(([field,value])=><div key={field} className="min-w-0 rounded-lg bg-white/[.025] p-3"><dt className="text-xs text-[#99aea5]">{fieldName(field)}</dt><dd className="mt-1 break-words text-sm text-[#dce9e3]">{value||t.absent}</dd></div>)}</dl><h4 className="mt-4 text-sm font-semibold text-white">{t.facts}</h4><ul className="mt-2 space-y-2">{current.selected.facts.map(f=><li key={f.local_ref} className="rounded-lg border border-white/8 p-3 text-sm leading-6 text-[#dce9e3]"><strong>{f.label}</strong><p className="whitespace-pre-wrap break-words">{f.value}</p><p className="text-xs text-[#99aea5]">{t.source}: {f.source_label} · {t.confirmation}: {f.confirmed_by_company?t.yes:t.no}</p></li>)}</ul>{!current.selected.facts.length&&<p className="text-sm text-[#99aea5]">{t.empty}</p>}<h4 className="mt-4 text-sm font-semibold text-white">{t.gaps}</h4><ul className="mt-2 space-y-2 text-sm text-[#dce9e3]">{current.selected.gaps.map(g=><li key={g.local_ref} className="break-words rounded-lg border border-white/8 p-3">{g.title}</li>)}</ul>{!current.selected.gaps.length&&<p className="text-sm text-[#99aea5]">{t.empty}</p>}</details>
  </>}
 </div>;
}
