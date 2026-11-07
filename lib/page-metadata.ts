import type {Metadata} from 'next';
const titles={
 partners:['成为合作伙伴','Become a partner','Diventa partner'],
 conversations:['直接通信','Direct messaging','Messaggi diretti'],
 buyer:['欧盟用户入口','EU buyer portal','Accesso buyer UE'],
 account:['账号入口','Account','Account'],
 protocol:['证据呈现协议','Evidence presentation protocol','Protocollo delle evidenze'],
 privacy:['隐私说明','Privacy notice','Informativa privacy'],
 briefings:['企业行动简报','Enterprise action briefings','Brief operativi'],
 contact:['联系邀请','Contact invitation','Invito di contatto'],
 proof:['授权证据卡','Authorised evidence card','Scheda autorizzata'],
};
export function pageMetadata(key:keyof typeof titles){
 return async({searchParams}:{searchParams:Promise<{lang?:string}>}):Promise<Metadata>=>{
  const q=await searchParams,language=q?.lang==='en'?1:q?.lang==='it'?2:0;
  return {title:'DOSSIVO · '+titles[key][language],robots:{index:false,follow:false},referrer:'no-referrer'};
 };
}
