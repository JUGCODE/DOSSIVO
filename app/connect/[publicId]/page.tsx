import {env} from 'cloudflare:workers';
import {getChatGPTUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
import {ContactStore,normalizeContactId} from '@/lib/contact-store';
import {ContactPanel} from '@/app/contact-panel';
import {CommunicationAccess,CommunicationAvailabilityNote} from '@/app/communication-access';
export const dynamic='force-dynamic';
export const metadata={title:'DOSSIVO · 联系邀请',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function ConnectPage({params,searchParams}:{params:Promise<{publicId:string}>;searchParams:Promise<{via?:string}>}){
 const user=await getChatGPTUser();let profile:any=null,referral:any=null,id='',token='';
 try{id=normalizeContactId((await params).publicId);const store=new ContactStore(env.DB);profile=await store.publicProfile(id);const via=(await searchParams).via;if(via){referral=await store.referralInfo(via);if(referral.target_public_id!==id)throw Error('invalid referral');token=via;}}catch{profile=null;}
 const path='/connect/'+id+(token?'?via='+token:'');
 return <main className="buyer-portal conversation-center"><header><a href="/conversations">← 直接通信</a><a href="/zh/">DOSSIVO</a></header>{profile?<><h1>联系 {profile.display_name}</h1><p className="contact-id">{profile.public_id}</p>{referral&&<p>由 {referral.recommender_display_name} 分享此联系人</p>}<p>对方接受申请后即可通信。材料访问需另行授权。</p>{user?<CommunicationAccess><ContactPanel targetId={id} targetName={profile.display_name} referralToken={token} recommender={referral?.recommender_display_name??''}/></CommunicationAccess>:<section><CommunicationAvailabilityNote/><h2>登录后发送联系申请</h2><p>登录或注册后会返回此联系人，无需重新输入ID。</p><a className="buyer-action" href={chatGPTSignInPath(path)} target="_top">注册／登录并继续</a></section>}</>:<section><CommunicationAvailabilityNote/><h1>联系链接暂不可用</h1><p>请向对方确认完整ID，或请对方开放联系链接。</p><a href="/conversations">返回直接通信</a></section>}<footer>显示名称由用户设置，不代表企业身份认证。当前为合成资料测试环境。</footer></main>;
}
