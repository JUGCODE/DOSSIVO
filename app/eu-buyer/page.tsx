import {getChatGPTUser} from '@/app/chatgpt-auth';
import {BuyerPortal} from './portal';
export const dynamic='force-dynamic';
export const metadata={title:'DOSSIVO · EU Buyer Evidence Access',robots:{index:false,follow:false}};
export default async function BuyerPage(){const user=await getChatGPTUser();return <main className="buyer-portal"><header><a href="/en/">← DOSSIVO</a><a href="/conversations">直接通信 · 未读消息</a><a href="/protocol">Protocol</a></header><p>EU BUYER · 欧盟用户入口 · ACCESS CODE</p><h1>查看出口企业授权的基本证据</h1><p>View basic evidence authorised by the exporter. 需要注册／登录；授权码兑换后仅绑定当前账号，按企业选择持续查看至撤销，或在临时授权期限内重复查看。</p>{user?<BuyerPortal/>:<section><h2>先注册或登录 / Register or sign in</h2><p>输入企业提供的授权码后，才能查看获准的基本参数。这里不是公开企业材料目录。</p><a className="buyer-action" href="/signin-with-chatgpt?return_to=%2Feu-buyer" target="_top">注册／登录 · Continue with ChatGPT</a></section>}<footer>材料覆盖度与企业确认不是欧盟认证或独立核验。当前仅支持合成资料流程；不开放原件或真实劳工敏感资料。用户入口不验证国籍、欧盟所在地或公司代表资格。</footer></main>;}
