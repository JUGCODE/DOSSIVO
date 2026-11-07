import {pageMetadata} from '@/lib/page-metadata';
export const generateMetadata=pageMetadata('contact');
import {LocaleLink,UIText} from '@/app/ui-language';
import {env} from 'cloudflare:workers';
import {getCurrentUser,signInPath} from '@/app/auth';
import {ContactStore,normalizeContactId} from '@/lib/contact-store';
import {ContactPanel} from '@/app/contact-panel';
import {CommunicationAccess,CommunicationAvailabilityNote} from '@/app/communication-access';
export const dynamic='force-dynamic';
export default async function ConnectPage({params,searchParams}:{params:Promise<{publicId:string}>;searchParams:Promise<{via?:string}>}){
 const user=await getCurrentUser();let profile:any=null,referral:any=null,id='',token='';
 try{id=normalizeContactId((await params).publicId);const store=new ContactStore(env.DB);profile=await store.publicProfile(id);const via=(await searchParams).via;if(via){referral=await store.referralInfo(via);if(referral.target_public_id!==id)throw Error('invalid referral');token=via;}}catch{profile=null;}
 const path='/connect/'+id+(token?'?via='+token:'');
 return <main className="buyer-portal conversation-center"><header><LocaleLink href="/conversations"><UIText>{"← 直接通信"}</UIText></LocaleLink><LocaleLink href="/"><UIText>{"DOSSIVO"}</UIText></LocaleLink></header>{profile?<><h1><UIText>{"联系"}</UIText>{profile.display_name}</h1><p className="contact-id">{profile.public_id}</p>{referral&&<p><UIText>{"由"}</UIText>{referral.recommender_display_name}<UIText>{"分享此联系人"}</UIText></p>}<p><UIText>{"对方接受申请后即可通信。材料访问需另行授权。"}</UIText></p>{user?<CommunicationAccess><ContactPanel targetId={id} targetName={profile.display_name} referralToken={token} recommender={referral?.recommender_display_name??''}/></CommunicationAccess>:<section><CommunicationAvailabilityNote/><h2><UIText>{"登录后发送联系申请"}</UIText></h2><p><UIText>{"登录或注册后会返回此联系人，无需重新输入ID。"}</UIText></p><LocaleLink className="buyer-action" href={signInPath(path)} target="_top"><UIText>{"注册／登录并继续"}</UIText></LocaleLink></section>}</>:<section><CommunicationAvailabilityNote/><h1><UIText>{"联系链接暂不可用"}</UIText></h1><p><UIText>{"请向对方确认完整ID，或请对方开放联系链接。"}</UIText></p><LocaleLink href="/conversations"><UIText>{"返回直接通信"}</UIText></LocaleLink></section>}<footer><UIText>{"显示名称由用户设置，不代表企业身份认证。当前为合成资料测试环境。"}</UIText></footer></main>;
}
