import {pageMetadata} from '@/lib/page-metadata';
export const generateMetadata=pageMetadata('conversations');
import {LocaleLink,UIText} from '@/app/ui-language';
import {getCurrentUser} from '@/app/auth';
import {COMMUNICATION_REGION_ENFORCEMENT} from '@/lib/communication-config';
import {ConversationInbox} from './inbox';
import {CommunicationAccess,CommunicationAvailabilityNote} from '@/app/communication-access';
export const dynamic='force-dynamic';
export default async function ConversationsPage(){const user=await getCurrentUser();return <main className="buyer-portal conversation-center"><header><LocaleLink href="/"><UIText>{"← DOSSIVO"}</UIText></LocaleLink><LocaleLink href="/protocol"><UIText>{"Protocol"}</UIText></LocaleLink></header><h1><UIText>{"直接通信"}</UIText></h1><p><UIText>{"与买方或供应方直接沟通，查看往来消息和未读提醒。"}</UIText></p>{user?<CommunicationAccess><ConversationInbox/></CommunicationAccess>:<section><CommunicationAvailabilityNote/><h2><UIText>{"先注册或登录"}</UIText></h2><p><UIText>{COMMUNICATION_REGION_ENFORCEMENT?'登录后选择通信服务地区，开始国际测试版通信。':'登录后即可使用开发测试版通信，无需先选择地区。'}</UIText></p><LocaleLink className="buyer-action" href="/signin-with-chatgpt?return_to=%2Fconversations" target="_top"><UIText>{"注册／登录"}</UIText></LocaleLink></section>}<details className="contact-help"><summary><UIText>{"如何添加对方？"}</UIText></summary><p><UIText>{"通过邮件、微信或 WhatsApp 交换联系链接或 DOSSIVO ID → 发送联系申请 → 对方接受后开始通信。"}</UIText></p><p><UIText>{"登录后可创建自己的联系ID、复制联系链接与二维码，也可输入对方ID申请联系。买卖双方共用此页；建立联系与材料授权分别处理。"}</UIText></p></details><footer><UIText>{"当前仅支持合成测试资料。材料访问仍需单独授权。"}</UIText></footer></main>;}
