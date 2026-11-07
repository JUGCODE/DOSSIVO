const copy={
 zh:{label:'按任务名称搜索',search:'搜索',clear:'清除搜索',hint:'搜索全部已保存任务的名称，不搜索材料正文。结果仍按最近更新排序。'},
 en:{label:'Search task names',search:'Search',clear:'Clear search',hint:'Searches names across all saved tasks, not material contents. Results remain sorted by latest update.'},
 it:{label:'Cerca per nome attività',search:'Cerca',clear:'Cancella ricerca',hint:'Cerca i nomi di tutte le attività salvate, non il contenuto dei materiali. Risultati ordinati per ultimo aggiornamento.'}
};
export function TaskListSearch({language,value,onChange,onSearch,onClear,disabled}:{language:'zh'|'en'|'it';value:string;onChange:(value:string)=>void;onSearch:()=>void;onClear:()=>void;disabled:boolean}){
 const c=copy[language];
 return <form role="search" onSubmit={e=>{e.preventDefault();onSearch();}}>
  <label>{c.label}<input type="search" value={value} maxLength={100} disabled={disabled} onChange={e=>onChange(e.target.value)}/></label>
  <button type="submit" disabled={disabled}>{c.search}</button><button type="button" disabled={disabled} onClick={onClear}>{c.clear}</button>
  <p><small>{c.hint}</small></p>
 </form>;
}
