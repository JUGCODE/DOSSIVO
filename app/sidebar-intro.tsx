'use client';
import {UIButton,UIText,UISpan} from '@/app/ui-language';
import {useEffect,useRef,useState,type ReactNode} from 'react';
const KEY='dossivo-sidebar-intro-layout-v1';
const copy={zh:{compact:'精简入口',expand:'展开入口',prompt:'已经开始证据工作，要把这些入口收成小方块，让工作功能更靠上吗？',yes:'切换为工作布局',later:'暂时保持',remember:'记住此浏览器的选择；随时可切换。',label:'常用入口布局'},en:{compact:'Compact shortcuts',expand:'Expand shortcuts',prompt:'Evidence work has started. Use compact shortcuts to bring your work tools higher?',yes:'Use work layout',later:'Keep expanded',remember:'Remembered in this browser. Change it anytime.',label:'Shortcut layout'},it:{compact:'Accessi compatti',expand:'Espandi accessi',prompt:'Hai iniziato il lavoro sulle evidenze. Vuoi compattare gli accessi per dare spazio agli strumenti?',yes:'Usa layout di lavoro',later:'Mantieni esteso',remember:'Scelta ricordata in questo browser. Modificabile in ogni momento.',label:'Layout degli accessi'}};
type Layout='expanded'|'compact';
export function SidebarIntro({language,narrow,onExpand,children}:{language:'zh'|'en'|'it';narrow:boolean;onExpand:()=>void;children:ReactNode}){
 const [layout,setLayout]=useState<Layout>('expanded'),[prompt,setPrompt]=useState(false);
 const chosen=useRef(false),c=copy[language];
 useEffect(()=>{
  const restore=()=>{try{const value=localStorage.getItem(KEY);chosen.current=value==='compact'||value==='expanded';setLayout(value==='compact'?'compact':'expanded');if(chosen.current)setPrompt(false);}catch{/* Session interaction still works when browser storage is disabled. */}};
  restore();
  const started=()=>{if(!chosen.current)setPrompt(true);};
  const sync=(event:StorageEvent)=>{if(event.key===KEY||event.key===null)restore();};
  window.addEventListener('dossivo:evidence-work-started',started);window.addEventListener('storage',sync);
  return()=>{window.removeEventListener('dossivo:evidence-work-started',started);window.removeEventListener('storage',sync);};
 },[]);
 function choose(next:Layout){chosen.current=true;setLayout(next);setPrompt(false);try{localStorage.setItem(KEY,next);}catch{}if(next==='compact'&&narrow)onExpand();}
 return <div className="sidebar-intro" data-narrow={narrow?'true':'false'}><UIButton type="button" className="sidebar-layout-toggle" aria-label={c.label+' · '+(layout==='compact'?c.expand:c.compact)} aria-pressed={layout==='compact'} title={c.remember} onClick={()=>choose(layout==='compact'?'expanded':'compact')}><UIText>{layout==='compact'?c.expand:c.compact}</UIText></UIButton>{prompt&&<div className="sidebar-layout-prompt" role="status"><p><UIText>{c.prompt}</UIText></p><button type="button" onClick={()=>choose('compact')}><UIText>{c.yes}</UIText></button><button type="button" onClick={()=>choose('expanded')}><UIText>{c.later}</UIText></button><small><UIText>{c.remember}</UIText></small></div>}<div className={'sidebar-entry-group'+(layout==='compact'?' is-compact':'')}><UIText>{children}</UIText></div></div>;
}

export function SidebarUnread({language}:{language:'zh'|'en'|'it'}){
 const [count,setCount]=useState<number|null>(null);
 useEffect(()=>{
  let controller:AbortController|null=null;
  async function refresh(){
   controller?.abort();const current=new AbortController();controller=current;
   try{const r=await fetch('/api/conversations',{cache:'no-store',signal:current.signal});if(!r.ok)throw Error('Unavailable');const d=await r.json() as {unread_total?:number};if(controller===current&&!current.signal.aborted)setCount(typeof d.unread_total==='number'&&Number.isSafeInteger(d.unread_total)&&d.unread_total>=0?d.unread_total:null);}
   catch{if(controller===current&&!current.signal.aborted)setCount(null);}
  }
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  void refresh();window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{controller?.abort();controller=null;window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[]);
 if(count===null||count===0)return null;
 const label=language==='zh'?`${count} 条未读消息`:language==='it'?`${count} messaggi non letti`:`${count} unread messages`;
 return <UISpan className="sidebar-unread" aria-label={label}>{count>99?'99+':count}</UISpan>;
}
