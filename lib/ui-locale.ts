import catalog from './ui-copy.json' with {type:'json'};
export type UILanguage='zh'|'en'|'it';
const copy:Record<string,{zh:string;en:string;it?:string}>=catalog;
export function resolveLanguage(path:string,query:string):UILanguage {
 const pathLanguage=path.match(/^\/(zh|en|it)(?:\/|$)/)?.[1];
 const selected=pathLanguage||new URLSearchParams(query).get('lang');
 return selected==='en'||selected==='it'?selected:'zh';
}
export function uiText(value:string,language:UILanguage):string {
 const normalized=value.replace(/\s+/g,' ').trim();
 const entry=copy[normalized];
 if(!entry){
  if(language==='en'||language==='it'){
   const patterns:[RegExp,(...parts:string[])=>string][]=[
    [/^已将第 (\d+) 条及之前消息标为已读；之后到达的消息继续保留未读。$/,(_s,n)=>`Marked message ${n} and earlier as read. Later messages remain unread.`],
    [/^第 (\d+) 次更新$/,(_s,n)=>`Update ${n}`],
    [/^最新授权范围内状态：(\d+) 项未解决$/,(_s,n)=>`Latest authorised status: ${n} unresolved issues`],
    [/^待兑换，截止 (.+)$/,(_s,date)=>`Redeem by ${date}`],
    [/^临时授权截止 (.+)$/,(_s,date)=>`Temporary access until ${date}`],
    [/^准备 (.+)$/,(_s,label)=>`Prepare ${uiText(label,language)}`],
   ];for(const [pattern,render] of patterns){const m=normalized.match(pattern);if(m)return render(...m);}
  }
  return value;
 }
 const text=language==='zh'?entry.zh:language==='it'?(entry.it??entry.en):entry.en;
 return (value.match(/^\s*/)?.[0]??'')+text+(value.match(/\s*$/)?.[0]??'');
}
export function localizedHref(href:string,language:UILanguage):string {
 if(!href.startsWith('/')||href.startsWith('//')||href.startsWith('/api/'))return href;
 const url=new URL(href,'https://dossivo.invalid');
 if(url.pathname==='/signin-with-chatgpt'){
  const destination=url.searchParams.get('return_to');
  if(destination)url.searchParams.set('return_to',localizedHref(destination,language));
 }else if(url.pathname==='/')url.pathname='/'+language+'/';
 else if(!/^\/(zh|en|it)(\/|$)/.test(url.pathname)&&!url.searchParams.has('lang'))url.searchParams.set('lang',language);
 return url.pathname+url.search+url.hash;
}
