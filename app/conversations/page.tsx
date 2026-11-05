import {getChatGPTUser} from '@/app/chatgpt-auth';
import {COMMUNICATION_REGION_ENFORCEMENT} from '@/lib/communication-config';
import {ConversationInbox} from './inbox';
import {CommunicationAccess,CommunicationAvailabilityNote} from '@/app/communication-access';
export const dynamic='force-dynamic';
export const metadata={title:'DOSSIVO · 直接通信',robots:{index:false,follow:false}};
export default async function ConversationsPage(){const user=await getChatGPTUser();return <main className="buyer-portal conversation-center"><header><a href="/zh/">← DOSSIVO</a><a href="/protocol">Protocol</a></header><h1>直接通信</h1><p>与买方或供应方直接沟通，查看往来消息和未读提醒。</p>{user?<CommunicationAccess><ConversationInbox/></CommunicationAccess>:<section><CommunicationAvailabilityNote/><h2>先注册或登录</h2><p>{COMMUNICATION_REGION_ENFORCEMENT?'登录后选择通信服务地区，开始国际测试版通信。':'登录后即可使用开发测试版通信，无需先选择地区。'}</p><a className="buyer-action" href="/signin-with-chatgpt?return_to=%2Fconversations" target="_top">注册／登录</a></section>}<details className="contact-help"><summary>如何添加对方？</summary><p>通过邮件、微信或 WhatsApp 交换联系链接或 DOSSIVO ID → 发送联系申请 → 对方接受后开始通信。</p><p>登录后可创建自己的联系ID、复制联系链接与二维码，也可输入对方ID申请联系。买卖双方共用此页；建立联系与材料授权分别处理。</p></details><footer>当前仅支持合成测试资料。材料访问仍需单独授权。</footer></main>;}
