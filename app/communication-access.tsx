'use client';

import {useEffect,useState,type ReactNode} from 'react';
import {COMMUNICATION_REGION_ENFORCEMENT} from '@/lib/communication-config';

type Region='UNKNOWN'|'CN_MAINLAND'|'INTERNATIONAL';
type Access={service_region:Region;available:boolean;declaration_version?:string;confirmed_at?:string|null};

export function CommunicationAvailabilityNote(){
 if(!COMMUNICATION_REGION_ENFORCEMENT)return <div className="communication-availability" role="note"><span className="conversation-badge">开发测试版</span><p>开发期间暂不按地区限制，中文可正常使用。</p></div>;
 return <div className="communication-availability" role="note"><span className="conversation-badge">国际测试版已开放</span><p>中国大陆用户暂未开通，待完成相关手续。</p></div>;
}

export function CommunicationAccess({children}:{children:ReactNode}){
 if(!COMMUNICATION_REGION_ENFORCEMENT)return <><section className="communication-access"><CommunicationAvailabilityNote/></section>{children}</>;
 return <EnforcedCommunicationAccess>{children}</EnforcedCommunicationAccess>;
}

function EnforcedCommunicationAccess({children}:{children:ReactNode}){
 const [access,setAccess]=useState<Access|null>(null),[region,setRegion]=useState<Region>('UNKNOWN'),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function read(response:Response){const data=await response.json() as Partial<Access>&{error?:string};if(!response.ok)throw Error(response.status===401?'请先登录后继续。':data.error??'暂时无法读取通信服务状态。');if(!['UNKNOWN','CN_MAINLAND','INTERNATIONAL'].includes(data.service_region??'')||typeof data.available!=='boolean')throw Error('暂时无法读取通信服务状态。');return data as Access;}
 useEffect(()=>{let active=true;void fetch('/api/communication-access',{cache:'no-store'}).then(read).then(data=>{if(active){setAccess(data);setRegion(data.service_region);}}).catch(e=>{if(active)setError((e as Error).message);});return()=>{active=false;};},[]);
 async function save(){if(region==='UNKNOWN'||!confirmed)return;setBusy(true);setError('');try{const data=await read(await fetch('/api/communication-access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'select_region',idempotencyKey:crypto.randomUUID(),data:{service_region:region,confirmed:true}})}));setAccess(data);setRegion(data.service_region);setConfirmed(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const form=<form className="communication-region-form" onSubmit={e=>{e.preventDefault();void save();}}><h3>通信服务地区</h3><p>请按你实际使用通信服务的所在地选择。</p><fieldset disabled={busy}><legend>选择使用地区</legend><label className="conversation-check"><input type="radio" name="communication-region" value="INTERNATIONAL" checked={region==='INTERNATIONAL'} onChange={()=>{setRegion('INTERNATIONAL');setConfirmed(false);}}/>中国大陆以外</label><label className="conversation-check"><input type="radio" name="communication-region" value="CN_MAINLAND" checked={region==='CN_MAINLAND'} onChange={()=>{setRegion('CN_MAINLAND');setConfirmed(false);}}/>中国大陆</label><label className="conversation-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我确认这是实际使用所在地；当前只使用合成测试内容。</label><button disabled={busy||region==='UNKNOWN'||!confirmed} type="submit">{busy?'保存中…':'保存并继续'}</button></fieldset><small>所在地由你本人声明，尚未经核验；不代表企业身份认证。材料授权仍单独管理。</small></form>;
 return <><section className="communication-access"><CommunicationAvailabilityNote/>{!access&&!error&&<p role="status">正在读取通信服务状态…</p>}{access?.available?<><p className="communication-current-region">当前：国际测试版 · 地区为本人声明</p><details><summary>更改通信服务地区</summary>{form}</details></>:access?<><h2>{access.service_region==='CN_MAINLAND'?'中国大陆通信服务暂未开通':'先选择通信服务地区'}</h2>{access.service_region==='CN_MAINLAND'&&<p>待完成相关手续后再开放。已有材料与授权可继续在工作台管理。</p>}{form}</>:null}{error&&<p role="alert">{error}</p>}</section>{access?.available?children:null}</>;
}
