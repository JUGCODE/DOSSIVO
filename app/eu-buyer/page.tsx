import {pageMetadata} from '@/lib/page-metadata';
export const generateMetadata=pageMetadata('buyer');
import {LocaleLink,UIText} from '@/app/ui-language';
import {getCurrentUser} from '@/app/auth';
import {BuyerPortal} from './portal';
export const dynamic='force-dynamic';
export default async function BuyerPage(){const user=await getCurrentUser();return <main className="buyer-portal"><header><LocaleLink href="/"><UIText>{"← DOSSIVO"}</UIText></LocaleLink><LocaleLink href="/conversations"><UIText>{"直接通信 · 未读消息"}</UIText></LocaleLink><LocaleLink href="/protocol"><UIText>{"Protocol"}</UIText></LocaleLink></header><p><UIText>{"EU BUYER · 欧盟用户入口 · ACCESS CODE"}</UIText></p><h1><UIText>{"查看出口企业授权的基本证据"}</UIText></h1><p><UIText>{"View basic evidence authorised by the exporter. 需要注册／登录；授权码兑换后仅绑定当前账号，按企业选择持续查看至撤销，或在临时授权期限内重复查看。"}</UIText></p>{user?<BuyerPortal/>:<section><h2><UIText>{"先注册或登录 / Register or sign in"}</UIText></h2><p><UIText>{"输入企业提供的授权码后，才能查看获准的基本参数。这里不是公开企业材料目录。"}</UIText></p><LocaleLink className="buyer-action" href="/signin-with-chatgpt?return_to=%2Feu-buyer" target="_top"><UIText>{"注册／登录 · Continue with ChatGPT"}</UIText></LocaleLink></section>}<footer><UIText>{"材料覆盖度与企业确认不是欧盟认证或独立核验。当前仅支持合成资料流程；不开放原件或真实劳工敏感资料。用户入口不验证国籍、欧盟所在地或公司代表资格。"}</UIText></footer></main>;}
